import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { anonymous, as, registerPatient, runScreening, system } from "@/server/fixtures/journey";
import {
  CONTINUE_LINK_EMAIL_KEY,
  continueLinkOffer,
  continueLinkUsable,
  purgeExpiredContinueLinks,
  redeemContinueLink,
  sendContinueLink,
} from "@/server/services/continue-link";
import { SCREENING_COOKIE, currentScreening, screeningById } from "@/server/services/screening";
import { screeningContinueLinks, screenings } from "@/server/db/schema";
import { messageProvider, outbox } from "@/server/providers/messaging";
import { hmac } from "@/server/crypto";
import { lintTemplate } from "@/domain/notifications/templates";
import { rejects } from "./helpers";

const tag = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const DAY = 86_400_000;

/** Sends a link for a fresh screening and returns the token from the email. */
async function sendFor(screeningId: string, email = `continue-${tag()}@example.test`) {
  const before = outbox.length;
  const res = await as(anonymous, async (ctx) => sendContinueLink(ctx, await screeningById(ctx, screeningId), { email }));
  const msg = outbox.slice(before).at(-1)!;
  const token = /\/start\/continue\/([A-Za-z0-9_-]+)/.exec(msg.body)?.[1];
  if (!token) throw new Error("No link in email");
  return { res, msg, token, email };
}

const linksFor = (screeningId: string) => as(system, (ctx) => ctx.tx.select().from(screeningContinueLinks).where(eq(screeningContinueLinks.screeningId, screeningId)));

/** Links cannot be updated by the app role (no UPDATE grant), so re-insert them already expired. */
const expireLinks = (screeningId: string) =>
  as(system, async (ctx) => {
    const rows = await ctx.tx.delete(screeningContinueLinks).where(eq(screeningContinueLinks.screeningId, screeningId)).returning();
    for (const r of rows) await ctx.tx.insert(screeningContinueLinks).values({ ...r, expiresAt: new Date(Date.now() - 1000) });
  });

describe("email me a link to continue (OWN-25)", () => {
  it("sends one neutral email, keeps only the token hash, and restores the screening once", async () => {
    const { screening, outcome } = await runScreening();
    expect(outcome).toBe("AVAILABLE");
    const { res, msg, token, email } = await sendFor(screening.id);

    expect(res.expires).toBe("in 7 days");
    expect(msg.to).toBe(email);
    expect(msg.channel).toBe("email");
    expect(msg.templateKey).toBe(CONTINUE_LINK_EMAIL_KEY);
    expect(msg.subject).toBe("Your link to continue with LeaveBridge Health");
    expect(msg.body).toContain(`/start/continue/${token}`);
    expect(msg.body).toContain("The link works once and expires in 7 days.");
    expect(msg.body).toContain("this is the only email we will send about it");
    expect(lintTemplate(`${msg.subject}\n${msg.body}`)).toEqual([]);
    // Nothing about the person beyond the brand name: no answers, states, leave or health wording.
    const text = `${msg.subject}\n${msg.body}`.replaceAll("LeaveBridge Health", "BRAND");
    expect(text).not.toMatch(/leave|health|mississippi|\bMS\b|symptom|screening|eligib|clinic|result|available/i);

    // Stored: token hash, screening, expiry. Never the address or the token itself.
    const rows = await linksFor(screening.id);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual(["createdAt", "expiresAt", "id", "screeningId", "tokenHash"]);
    expect(rows[0]!.tokenHash).toBe(hmac(`continue:${token}`));
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(JSON.stringify(rows)).not.toContain("@");
    expect(Math.abs(rows[0]!.expiresAt.getTime() - (Date.now() + 7 * DAY))).toBeLessThan(60_000);

    // Opening the page does not use the link.
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, token))).toBe(true);
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, token))).toBe(true);

    // Using it gives the screening a new browser token: a new browser now has that screening.
    const jar = await cookies();
    jar.delete(SCREENING_COOKIE);
    const out = await as(anonymous, (ctx) => redeemContinueLink(ctx, token));
    expect(out).not.toBeNull();
    expect(out!.maxAgeSeconds).toBeGreaterThan(29 * 86400);
    jar.set(SCREENING_COOKIE, out!.cookieToken);
    const restored = await as(anonymous, (ctx) => currentScreening(ctx));
    expect(restored?.id).toBe(screening.id);
    expect(restored?.status).toBe("completed");
    expect(restored?.outcome).toBe("AVAILABLE");
    jar.delete(SCREENING_COOKIE);

    // Single use: the row is gone and the link no longer works.
    expect(await linksFor(screening.id)).toEqual([]);
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, token))).toBe(false);
    expect(await as(anonymous, (ctx) => redeemContinueLink(ctx, token))).toBeNull();
  });

  it("refuses expired links, deletes them, and never outlives the screening", async () => {
    const { screening } = await runScreening();
    const { token } = await sendFor(screening.id);
    await expireLinks(screening.id);
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, token))).toBe(false);
    expect(await as(anonymous, (ctx) => redeemContinueLink(ctx, token))).toBeNull();
    expect(await linksFor(screening.id)).toEqual([]);

    // The purge job removes expired links that were never opened.
    const { screening: other } = await runScreening();
    await sendFor(other.id);
    await expireLinks(other.id);
    expect(await as(system, (ctx) => purgeExpiredContinueLinks(ctx))).toBeGreaterThanOrEqual(1);
    expect(await linksFor(other.id)).toEqual([]);

    // A screening that expires in 2 days gets a link that ends with it, and the email says so.
    const { screening: short } = await runScreening();
    const ends = new Date(Date.now() + 2 * DAY);
    await as(system, (ctx) => ctx.tx.update(screenings).set({ expiresAt: ends }).where(eq(screenings.id, short.id)));
    const { res, msg } = await sendFor(short.id);
    expect(res.expires).toBe("in 1 day");
    expect(msg.body).toContain("expires in 1 day.");
    const [row] = await linksFor(short.id);
    expect(row!.expiresAt.getTime()).toBeLessThanOrEqual(ends.getTime());

    // A link to a screening whose answers expired does not work.
    const { token: lateToken } = await sendFor(short.id);
    await as(system, (ctx) => ctx.tx.update(screenings).set({ expiresAt: new Date(Date.now() - 1000), status: "expired" }).where(eq(screenings.id, short.id)));
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, lateToken))).toBe(false);
    expect(await as(anonymous, (ctx) => redeemContinueLink(ctx, lateToken))).toBeNull();
  });

  it("limits sends per screening and keeps only the newest link", async () => {
    const { screening } = await runScreening();
    const first = await sendFor(screening.id);
    const second = await sendFor(screening.id);
    await sendFor(screening.id);
    expect(await linksFor(screening.id)).toHaveLength(1);
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, first.token))).toBe(false);
    expect(await as(anonymous, (ctx) => continueLinkUsable(ctx, second.token))).toBe(false);

    const before = outbox.length;
    await rejects(sendFor(screening.id), "rate_limited");
    expect(outbox.length).toBe(before);
  });

  it("is offered and sent only for screenings that lead to sign-up", async () => {
    const { screening: stopped, outcome } = await runScreening({ current_state: "AL", appointment_state: "AL" });
    expect(outcome).toBe("NOT_AVAILABLE");
    expect(continueLinkOffer(stopped)).toBeNull();
    await rejects(as(anonymous, async (ctx) => sendContinueLink(ctx, await screeningById(ctx, stopped.id), { email: `x-${tag()}@example.test` })), "invalid");

    const { screening: emergency } = await runScreening({ safety_now: "yes" });
    expect(continueLinkOffer(emergency)).toBeNull();
    await rejects(as(anonymous, (ctx) => sendContinueLink(ctx, emergency, { email: `x-${tag()}@example.test` })), "invalid");
    await rejects(as(anonymous, (ctx) => sendContinueLink(ctx, null, { email: `x-${tag()}@example.test` })), "invalid");

    const { screening } = await runScreening();
    expect(continueLinkOffer(screening)).toBe("in 7 days");
    await rejects(as(anonymous, (ctx) => sendContinueLink(ctx, screening, { email: "not-an-address" })));

    // Creating the account removes an unused link, and a link to a promoted screening does nothing.
    const { token } = await sendFor(screening.id);
    await registerPatient(screening, { first: "Link", last: "Holder" });
    expect(await linksFor(screening.id)).toEqual([]);
    expect(await as(anonymous, (ctx) => redeemContinueLink(ctx, token))).toBeNull();
    expect(await as(anonymous, (ctx) => redeemContinueLink(ctx, "not a token"))).toBeNull();
  });

  it("keeps nothing when the email cannot be sent", async () => {
    const { screening } = await runScreening();
    const spy = vi.spyOn(messageProvider("email"), "send").mockRejectedValueOnce(Object.assign(new Error("provider down"), { name: "ProviderError" }));
    try {
      const err = await rejects(as(anonymous, async (ctx) => sendContinueLink(ctx, await screeningById(ctx, screening.id), { email: `fail-${tag()}@example.test` })), "invalid");
      expect(err.message).toMatch(/couldn't send the email/);
    } finally {
      spy.mockRestore();
    }
    expect(await linksFor(screening.id)).toEqual([]);
  });
});
