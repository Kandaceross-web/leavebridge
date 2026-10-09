import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { anonymous, as, runScreening, staffActor, system } from "@/server/fixtures/journey";
import { joinWaitlist } from "@/server/services/contact";
import { setJurisdictionActive } from "@/server/services/admin";
import { unservedDemand } from "@/server/services/acquisition";
import { WAITLIST_EMAIL_KEY, notifyWaitlist, waitlistDemand } from "@/server/services/waitlist";
import { auditEvents, waitlist, waitlistNotices } from "@/server/db/schema";
import { outbox } from "@/server/providers/messaging";
import { lintTemplate } from "@/domain/notifications/templates";
import { rejects, staff } from "./helpers";

const tag = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

describe("state waitlist", () => {
  it("joins from the screening result with only an email and a state, skipping duplicates", async () => {
    const { outcome } = await runScreening({ current_state: "AL", appointment_state: "AL" });
    expect(outcome).toBe("NOT_AVAILABLE");
    const email = `result-${tag()}@example.test`;
    // Whatever else is posted (here, screening-style fields) is dropped by the schema.
    const posted = { email: email.toUpperCase(), stateCode: "al", current_state: "AL", reason: "symptoms_affect_work" };
    await as(anonymous, (ctx) => joinWaitlist(ctx, posted));
    await as(anonymous, (ctx) => joinWaitlist(ctx, posted));
    const rows = await as(system, (ctx) => ctx.tx.select().from(waitlist).where(eq(waitlist.email, email)));
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual(["createdAt", "email", "id", "stateCode"]);
    expect(rows[0]!.stateCode).toBe("AL");
    // Row-level security: the public (anonymous) actor can add itself but cannot read the list.
    expect(await as(anonymous, (ctx) => ctx.tx.select().from(waitlist))).toEqual([]);
  });

  it("counts sign-ups and unserved screenings by state, without addresses", async () => {
    const s = await staff();
    for (let i = 0; i < 2; i++) await as(anonymous, (ctx) => joinWaitlist(ctx, { email: `count-${tag()}@example.test`, stateCode: "GA" }));
    await runScreening({ current_state: "GA", appointment_state: "GA" });
    for (const role of ["admin", "director"] as const) {
      const rows = await as(staffActor(s, role), (ctx) => waitlistDemand(ctx, 30));
      const ga = rows.find((r) => r.code === "GA")!;
      expect(ga.joined).toBeGreaterThanOrEqual(2);
      expect(ga.waiting).toBeGreaterThanOrEqual(2);
      expect(ga.screenings).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(rows)).not.toContain("@");
      const totals = rows.map((r) => r.joined + r.screenings);
      expect(totals).toEqual([...totals].sort((a, b) => b - a));
    }
  });

  it("emails each person once when their state opens, deletes them and audits only the count", async () => {
    const s = await staff();
    const admin = staffActor(s, "admin");
    const director = staffActor(s, "director");
    const emails = [1, 2, 3].map((i) => `open-${i}-${tag()}@example.test`);
    await as(admin, (ctx) => setJurisdictionActive(ctx, "TN", false));
    try {
      for (const email of emails) await as(anonymous, (ctx) => joinWaitlist(ctx, { email, stateCode: "TN" }));
      await rejects(as(director, (ctx) => notifyWaitlist(ctx, "TN")), "invalid"); // not served yet
    } finally {
      await as(admin, (ctx) => setJurisdictionActive(ctx, "TN", true));
    }
    const before = outbox.length;
    const res = await as(director, (ctx) => notifyWaitlist(ctx, "TN"));
    expect(res).toEqual({ sent: 3, failed: 0 });

    const sent = outbox.slice(before);
    expect(sent.map((m) => m.to).sort()).toEqual([...emails].sort());
    for (const m of sent) {
      expect(m.channel).toBe("email");
      expect(m.templateKey).toBe(WAITLIST_EMAIL_KEY);
      expect(m.subject).toBe("LeaveBridge Health is now available in Tennessee");
      expect(m.body).toContain("/start?entry=waitlist");
      expect(m.body).toContain("You asked us to tell you when we opened in Tennessee. This is the only email we'll send about it.");
      expect(lintTemplate(`${m.subject}\n${m.body}`)).toEqual([]);
    }

    const left = await as(system, (ctx) => ctx.tx.select().from(waitlist).where(eq(waitlist.stateCode, "TN")));
    expect(left).toEqual([]);
    const [notice] = await as(system, (ctx) => ctx.tx.select().from(waitlistNotices).where(eq(waitlistNotices.stateCode, "TN")));
    expect(notice?.recipientCount).toBe(3);
    const [event] = await as(system, (ctx) => ctx.tx.select().from(auditEvents).where(and(eq(auditEvents.action, "waitlist.notified"), eq(auditEvents.subjectId, "TN"))));
    expect(event?.metadata).toEqual({ state: "TN", count: 3 });
    expect(JSON.stringify(event)).not.toContain("@");

    const page = await as(admin, (ctx) => waitlistDemand(ctx, 30));
    expect(page.find((r) => r.code === "TN")).toMatchObject({ isActive: true, waiting: 0, lastNotice: { count: 3 } });
    // Nobody left to email: a second press sends nothing.
    await rejects(as(director, (ctx) => notifyWaitlist(ctx, "TN")), "invalid");
    expect(outbox.length).toBe(before + 3);
  });

  it("is limited to admins and clinical directors", async () => {
    const s = await staff();
    for (const role of ["support", "billing", "clinician", "compliance"] as const) {
      const actor = staffActor(s, role);
      await rejects(as(actor, (ctx) => waitlistDemand(ctx, 30)), "forbidden");
      await rejects(as(actor, (ctx) => notifyWaitlist(ctx, "MS")), "forbidden");
      await rejects(as(actor, (ctx) => unservedDemand(ctx, 30)), "forbidden");
    }
    await rejects(as(anonymous, (ctx) => notifyWaitlist(ctx, "MS")), "forbidden");
  });
});
