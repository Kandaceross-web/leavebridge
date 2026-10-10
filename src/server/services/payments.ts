import "server-only";
import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { automatedScreenings, paymentEvents, payments, prices, refunds, users } from "../db/schema";
import { audit } from "../audit";
import { env } from "../env";
import { payments as provider } from "../providers/payments";
import { getSetting } from "../settings";
import { ensureEstimate } from "./estimates";
import { requireSameDayCheckout } from "./same-day-gate";
import { getCaseRow, loadCase, notifyPatient, requireGate, syncPreSubmissionStatus, type CaseRow } from "./cases";
import { requireRole, requireStepUp } from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { defaultTriggerFor, policyRefundCents, type RefundTrigger } from "@/domain/payments/refunds";

export async function currentPrice(ctx: Ctx, serviceId: string) {
  const now = new Date();
  const [p] = await ctx.tx
    .select()
    .from(prices)
    .where(and(eq(prices.serviceId, serviceId), eq(prices.payerType, "self_pay"), lte(prices.effectiveFrom, now), or(isNull(prices.effectiveTo), gt(prices.effectiveTo, now))))
    .orderBy(desc(prices.effectiveFrom))
    .limit(1);
  return p ?? null;
}

export async function casePayments(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, "owner");
  return ctx.tx.select().from(payments).where(eq(payments.caseId, caseId)).orderBy(desc(payments.createdAt));
}

/**
 * Creates a pending payment and returns the processor checkout URL. `shownEstimateId` is the
 * estimate the checkout page displayed; if the service or price changed since, the patient is
 * sent back to read the new one before paying.
 */
export async function startCheckout(ctx: Ctx, caseId: string, shownEstimateId?: string): Promise<string> {
  if (ctx.actor.kind !== "patient") throw forbidden();
  const { row } = await loadCase(ctx, caseId, "owner");
  const automated = row.kind === "automated_screening";
  if (automated) await requireSameDayCheckout(ctx, row);
  else await requireGate(ctx, row, "payment");
  const existing = await casePayments(ctx, row.id);
  if (existing.some((p) => p.status === "paid" || p.status === "partially_refunded")) throw conflict("This case is already paid.");
  const price = await currentPrice(ctx, row.serviceId!);
  if (!price) throw invalid("Pricing for this service is not available yet.");
  // The written Good Faith Estimate is issued (or reused) before any charge (LEG-08).
  const estimate = await ensureEstimate(ctx, row);
  if (shownEstimateId !== undefined && shownEstimateId !== estimate.row.id) throw conflict("Your estimate has changed. Please review the updated estimate before paying.");
  const [u] = await ctx.tx.select({ email: users.email }).from(users).where(eq(users.id, ctx.actor.userId)).limit(1);
  const [pay] = await ctx.tx
    .insert(payments)
    .values({ caseId: row.id, priceId: price.id, amountCents: price.amountCents, currency: price.currency, provider: provider().name })
    .returning();
  const session = await provider().createCheckout({
    paymentId: pay!.id,
    amountCents: price.amountCents,
    currency: price.currency,
    customerEmail: u!.email,
    // The same neutral URLs for every service, so the processor never learns which service was bought
    // (the portal forwards a same-day case to its own page).
    successUrl: `${env.APP_ORIGIN}/portal/cases/${row.id}?paid=1`,
    cancelUrl: `${env.APP_ORIGIN}/portal/cases/${row.id}/checkout?cancelled=1`,
  });
  await ctx.tx.update(payments).set({ providerCheckoutRef: session.checkoutRef }).where(eq(payments.id, pay!.id));
  await audit(ctx, { action: "payment.checkout_started", subjectType: "payment", subjectId: pay!.id, caseId: row.id, metadata: { amountCents: price.amountCents, provider: provider().name, estimateId: estimate.row.id } });
  return session.redirectUrl;
}

async function markPaid(ctx: Ctx, paymentId: string, providerPaymentRef: string | null): Promise<CaseRow | null> {
  const [pay] = await ctx.tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!pay) return null;
  if (pay.status === "paid") return null;
  await ctx.tx.update(payments).set({ status: "paid", paidAt: new Date(), providerPaymentRef, updatedAt: new Date() }).where(eq(payments.id, pay.id));
  await audit(ctx, { action: "payment.succeeded", subjectType: "payment", subjectId: pay.id, caseId: pay.caseId, metadata: { amountCents: pay.amountCents } });
  let row = await getCaseRow(ctx, pay.caseId);
  // Same-Day Mental Health Assessment: payment opens the questionnaires.
  if (row.kind === "automated_screening") await ctx.tx.update(automatedScreenings).set({ status: "in_progress", updatedAt: new Date() }).where(eq(automatedScreenings.caseId, row.id));
  row = await syncPreSubmissionStatus(ctx, row);
  await notifyPatient(ctx, row, "payment_received");
  return row;
}

/** Development only: the simulated checkout page confirms payment for the patient's own pending payment. */
export async function confirmSimulatedPayment(ctx: Ctx, checkoutRef: string): Promise<string> {
  if (provider().name !== "fake" || env.APP_ENV === "production") throw forbidden();
  if (ctx.actor.kind !== "patient") throw forbidden();
  const [pay] = await ctx.tx.select().from(payments).where(eq(payments.providerCheckoutRef, checkoutRef)).limit(1);
  if (!pay) throw notFound("Payment");
  await loadCase(ctx, pay.caseId, "owner");
  await markPaid(ctx, pay.id, `fake_pi_${pay.id.slice(0, 8)}`);
  return pay.caseId;
}

export async function simulatedCheckoutInfo(ctx: Ctx, checkoutRef: string) {
  const [pay] = await ctx.tx.select().from(payments).where(eq(payments.providerCheckoutRef, checkoutRef)).limit(1);
  if (!pay) throw notFound("Payment");
  await loadCase(ctx, pay.caseId, "owner");
  return pay;
}

/** Processes a verified processor webhook idempotently (system actor). */
export async function handlePaymentWebhook(ctx: Ctx, rawBody: string, signature: string | null): Promise<"ok" | "invalid" | "duplicate"> {
  const evt = provider().verifyWebhook(rawBody, signature);
  if (!evt) return "invalid";
  const inserted = await ctx.tx.insert(paymentEvents).values({ provider: provider().name, eventId: evt.eventId, type: evt.type, paymentId: evt.paymentId }).onConflictDoNothing().returning({ id: paymentEvents.id });
  if (!inserted.length) return "duplicate";
  if (evt.type === "payment.succeeded" && evt.paymentId) await markPaid(ctx, evt.paymentId, evt.providerPaymentRef);
  if (evt.type === "payment.failed" && evt.paymentId) {
    await ctx.tx.update(payments).set({ status: "failed", updatedAt: new Date() }).where(and(eq(payments.id, evt.paymentId), eq(payments.status, "pending")));
  }
  return "ok";
}

/**
 * Refunds follow the configured policy. A refund above the policy amount is "out of policy" and
 * needs a second staff member to approve it (two-person rule).
 */
export async function requestRefund(ctx: Ctx, paymentId: string, input: { trigger: RefundTrigger; amountCents: number; stepUpMinutes: number }) {
  requireRole(ctx.actor, ["admin", "billing"]);
  requireStepUp(ctx.actor, input.stepUpMinutes);
  const [pay] = await ctx.tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!pay || !["paid", "partially_refunded"].includes(pay.status)) throw invalid("Only completed payments can be refunded.");
  const policy = await getSetting(ctx.tx, "refundPolicy");
  const allowed = policyRefundCents(policy.rules, input.trigger, pay.amountCents, pay.refundedCents);
  const remaining = pay.amountCents - pay.refundedCents;
  if (input.amountCents <= 0 || input.amountCents > remaining) throw invalid("Refund amount is not valid.");
  const withinPolicy = input.amountCents <= allowed;
  const [r] = await ctx.tx
    .insert(refunds)
    .values({ paymentId: pay.id, amountCents: input.amountCents, reasonCode: input.trigger, withinPolicy, requestedBy: ctx.actor.userId, status: withinPolicy ? "approved" : "requested", approvedBy: withinPolicy ? ctx.actor.userId : null })
    .returning();
  await audit(ctx, { action: "payment.refund_requested", subjectType: "refund", subjectId: r!.id, caseId: pay.caseId, metadata: { amountCents: input.amountCents, withinPolicy, trigger: input.trigger } });
  if (withinPolicy) await processRefund(ctx, r!.id);
  return { withinPolicy };
}

export async function approveRefund(ctx: Ctx, refundId: string, stepUpMinutes: number) {
  requireRole(ctx.actor, ["admin", "billing"]);
  requireStepUp(ctx.actor, stepUpMinutes);
  const [r] = await ctx.tx.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
  if (!r || r.status !== "requested") throw invalid("This refund is not awaiting approval.");
  if (r.requestedBy === ctx.actor.userId) throw forbidden("A different staff member must approve an out-of-policy refund.");
  await ctx.tx.update(refunds).set({ status: "approved", approvedBy: ctx.actor.userId }).where(eq(refunds.id, r.id));
  await processRefund(ctx, r.id);
}

async function processRefund(ctx: Ctx, refundId: string) {
  const [r] = await ctx.tx.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
  const [pay] = await ctx.tx.select().from(payments).where(eq(payments.id, r!.paymentId)).limit(1);
  const res = await provider().refund(pay!.providerPaymentRef ?? "", r!.amountCents);
  const refunded = pay!.refundedCents + r!.amountCents;
  await ctx.tx.update(refunds).set({ status: "processed", providerRef: res.refundRef }).where(eq(refunds.id, r!.id));
  await ctx.tx.update(payments).set({ refundedCents: refunded, status: refunded >= pay!.amountCents ? "refunded" : "partially_refunded", updatedAt: new Date() }).where(eq(payments.id, pay!.id));
  await audit(ctx, { action: "payment.refund_processed", subjectType: "refund", subjectId: r!.id, caseId: pay!.caseId, metadata: { amountCents: r!.amountCents } });
}

export async function refundPreview(ctx: Ctx, caseRow: CaseRow, paymentAmount: number, refunded: number) {
  const policy = await getSetting(ctx.tx, "refundPolicy");
  const trigger = defaultTriggerFor(caseRow.status);
  return { trigger, policyCents: policyRefundCents(policy.rules, trigger, paymentAmount, refunded), rules: policy.rules };
}

export async function paymentRefunds(ctx: Ctx, paymentId: string) {
  return ctx.tx.select().from(refunds).where(eq(refunds.paymentId, paymentId)).orderBy(desc(refunds.createdAt));
}
