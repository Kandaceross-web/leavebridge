import { describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { advancePatient, as, staffActor, system } from "@/server/fixtures/journey";
import { auditEvents, goodFaithEstimates, payments, prices } from "@/server/db/schema";
import { loadCase } from "@/server/services/cases";
import { caseEstimates, ensureEstimate, estimatePdf, latestEstimate } from "@/server/services/estimates";
import { startCheckout } from "@/server/services/payments";
import { LAUNCH_PRICE_CENTS } from "@/config/catalog";
import { newPatient, rejects, staff } from "./helpers";

const ensure = (actor: Parameters<typeof as>[0], caseId: string) =>
  as(actor, async (ctx) => {
    const { row } = await loadCase(ctx, caseId, "owner");
    return ensureEstimate(ctx, row);
  });

describe("written Good Faith Estimate (LEG-08)", () => {
  it("is issued once before payment, reused, linked to checkout and audited", async () => {
    const p = await newPatient("Estimate", "Issued");
    await advancePatient(p, "consents_payment");

    const first = await ensure(p.actor, p.caseId);
    expect(first.intact).toBe(true);
    expect(first.content.totalCents).toBe(LAUNCH_PRICE_CENTS);
    expect(first.content.items).toHaveLength(1);
    expect(first.content.patient.name).toBe(p.legalName);
    expect(first.content.disclaimers.join(" ")).toMatch(/\$400 or more/);
    // Stored encrypted: the name never sits in the row as plain text.
    expect(first.row.content).not.toContain(p.legalName);

    const again = await ensure(p.actor, p.caseId);
    expect(again.row.id).toBe(first.row.id);

    // Paying against an estimate the patient did not see is refused.
    await rejects(as(p.actor, (ctx) => startCheckout(ctx, p.caseId, "00000000-0000-4000-8000-000000000000")), "conflict");
    await as(p.actor, (ctx) => startCheckout(ctx, p.caseId, first.row.id));

    const audits = await as(system, (ctx) => ctx.tx.select().from(auditEvents).where(eq(auditEvents.caseId, p.caseId)));
    expect(audits.filter((a) => a.action === "estimate.issued")).toHaveLength(1);
    const started = audits.find((a) => a.action === "payment.checkout_started");
    expect(started?.metadata).toMatchObject({ estimateId: first.row.id });
    const [pay] = await as(system, (ctx) => ctx.tx.select().from(payments).where(eq(payments.caseId, p.caseId)));
    expect(pay!.amountCents).toBe(first.row.amountCents);

    const pdf = await as(p.actor, (ctx) => estimatePdf(ctx, first.row.id));
    expect(pdf.data.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.name).not.toContain(p.legalName.split(" ")[0]!);
  });

  it("is re-issued when the amount changes", async () => {
    const p = await newPatient("Estimate", "Reissued");
    await advancePatient(p, "consents_payment");
    const first = await ensure(p.actor, p.caseId);
    const serviceId = first.row.serviceId;
    const [price] = await as(system, (ctx) => ctx.tx.insert(prices).values({ serviceId, amountCents: LAUNCH_PRICE_CENTS + 1000, effectiveFrom: new Date() }).returning());
    try {
      const second = await ensure(p.actor, p.caseId);
      expect(second.row.id).not.toBe(first.row.id);
      expect(second.content.totalCents).toBe(LAUNCH_PRICE_CENTS + 1000);
      const latest = await as(p.actor, (ctx) => latestEstimate(ctx, p.caseId));
      expect(latest!.row.id).toBe(second.row.id);
      const all = await as(staffActor(await staff(), "billing"), (ctx) => caseEstimates(ctx, p.caseId));
      expect(all.map((e) => e.id)).toEqual([second.row.id, first.row.id]);
    } finally {
      // Other tests share this database; close the temporary price.
      await as(system, (ctx) => ctx.tx.update(prices).set({ effectiveTo: new Date() }).where(and(eq(prices.id, price!.id), isNull(prices.effectiveTo))));
    }
  });

  it("is visible only to the patient and staff, and cannot be changed", async () => {
    const a = await newPatient("Estimate", "Owner");
    const b = await newPatient("Estimate", "Other");
    await advancePatient(a, "consents_payment");
    const est = await ensure(a.actor, a.caseId);

    await rejects(as(b.actor, (ctx) => latestEstimate(ctx, a.caseId)), "not_found");
    await rejects(as(b.actor, (ctx) => estimatePdf(ctx, est.row.id)), "not_found");
    const raw = await as(b.actor, (ctx) => ctx.tx.select().from(goodFaithEstimates).where(eq(goodFaithEstimates.caseId, a.caseId)));
    expect(raw).toEqual([]);
    const forStaff = await as(staffActor(await staff(), "support"), (ctx) => latestEstimate(ctx, a.caseId));
    expect(forStaff!.row.id).toBe(est.row.id);

    await rejects(as(system, (ctx) => ctx.tx.update(goodFaithEstimates).set({ amountCents: 1 }).where(eq(goodFaithEstimates.id, est.row.id))));
    await rejects(as(system, (ctx) => ctx.tx.delete(goodFaithEstimates).where(eq(goodFaithEstimates.id, est.row.id))));
  });
});
