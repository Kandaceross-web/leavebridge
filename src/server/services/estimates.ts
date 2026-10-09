import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { appointments, goodFaithEstimates, jurisdictions, patients, services } from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, encryptJson, sha256Hex } from "../crypto";
import { env } from "../env";
import { PDF_NAVY, textPdf } from "../pdf";
import { getSetting } from "../settings";
import { loadCase, type CaseRow } from "./cases";
import { currentPrice } from "./payments";
import { actorUserId } from "@/domain/actor";
import { forbidden, invalid, notFound } from "@/domain/errors";
import { buildEstimate, canonicalEstimate, estimateSections, missingEstimateFields, needsNewEstimate, type EstimateContent } from "@/domain/payments/good-faith-estimate";

/**
 * Written Good Faith Estimates (45 CFR 149.610, LEG-08). Issued to the patient before payment and
 * kept as an append-only part of the case record. A new estimate is issued only when the service
 * or the amount changes; otherwise the existing one is shown again.
 */
export type EstimateRow = typeof goodFaithEstimates.$inferSelect;

export const estimateHash = (content: EstimateContent) => sha256Hex(canonicalEstimate(content));

function open(r: EstimateRow) {
  const content = decryptJson<EstimateContent | null>(r.content, null);
  if (!content) throw notFound("Estimate");
  return { row: r, content, intact: estimateHash(content) === r.contentHash };
}

async function latestRow(ctx: Ctx, caseId: string): Promise<EstimateRow | null> {
  const [r] = await ctx.tx.select().from(goodFaithEstimates).where(eq(goodFaithEstimates.caseId, caseId)).orderBy(desc(goodFaithEstimates.issuedAt)).limit(1);
  return r ?? null;
}

/**
 * Returns the case's current estimate, issuing one first when none exists or when the service or
 * price has changed since the last one. Callers have already loaded the case as its owner.
 */
export async function ensureEstimate(ctx: Ctx, row: CaseRow) {
  if (ctx.actor.kind !== "patient" && ctx.actor.kind !== "system") throw forbidden();
  if (!row.serviceId) throw invalid("Choose a service first.");
  const price = await currentPrice(ctx, row.serviceId);
  if (!price) throw invalid("Pricing for this service is not available yet.");
  const latest = await latestRow(ctx, row.id);
  if (latest && !needsNewEstimate(latest, { serviceId: row.serviceId, amountCents: price.amountCents, currency: price.currency })) return open(latest);

  const setting = await getSetting(ctx.tx, "goodFaithEstimate");
  // The release check blocks production while these are empty; this is the second line.
  if (env.APP_ENV === "production" && missingEstimateFields(setting).length) throw invalid("Your written estimate is not available yet. Please contact support before paying.");
  const [svc] = await ctx.tx.select().from(services).where(eq(services.id, row.serviceId)).limit(1);
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, row.patientId)).limit(1);
  const [state] = row.jurisdictionCode ? await ctx.tx.select({ name: jurisdictions.name }).from(jurisdictions).where(eq(jurisdictions.code, row.jurisdictionCode)).limit(1) : [];
  const [visit] = await ctx.tx
    .select({ startsAt: appointments.startsAt })
    .from(appointments)
    .where(and(eq(appointments.caseId, row.id), eq(appointments.status, "booked")))
    .orderBy(asc(appointments.startsAt))
    .limit(1);
  const brand = await getSetting(ctx.tx, "brand");
  const content = buildEstimate({
    issuedAt: new Date(),
    reference: row.reference,
    patient: { name: p ? `${p.legalFirstName} ${p.legalLastName}` : "", dateOfBirth: p?.dateOfBirth ? decrypt(p.dateOfBirth) : null },
    service: { id: svc!.id, name: svc!.name, summary: svc!.summary },
    price: { id: price.id, amountCents: price.amountCents, currency: price.currency },
    scheduledFor: visit?.startsAt ?? null,
    provider: { name: brand.name, location: state ? `By telehealth to you in ${state.name}` : "By telehealth" },
    setting,
  });
  const [created] = await ctx.tx
    .insert(goodFaithEstimates)
    .values({
      caseId: row.id,
      serviceId: svc!.id,
      priceId: price.id,
      amountCents: price.amountCents,
      currency: price.currency,
      content: encryptJson(content),
      contentHash: estimateHash(content),
      issuedBy: actorUserId(ctx.actor),
      issuedAt: new Date(content.issuedAt),
    })
    .returning();
  await audit(ctx, {
    action: "estimate.issued",
    subjectType: "good_faith_estimate",
    subjectId: created!.id,
    caseId: row.id,
    metadata: { amountCents: price.amountCents, replaces: latest?.id ?? null },
  });
  return open(created!);
}

/** The case's most recent estimate, for the patient (owner) or staff (operational access). */
export async function latestEstimate(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const r = await latestRow(ctx, row.id);
  return r ? open(r) : null;
}

/** Every estimate issued on a case, newest first, without the content (operations view). */
export async function caseEstimates(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "operational");
  return ctx.tx
    .select({ id: goodFaithEstimates.id, amountCents: goodFaithEstimates.amountCents, currency: goodFaithEstimates.currency, contentHash: goodFaithEstimates.contentHash, issuedAt: goodFaithEstimates.issuedAt })
    .from(goodFaithEstimates)
    .where(eq(goodFaithEstimates.caseId, row.id))
    .orderBy(desc(goodFaithEstimates.issuedAt));
}

/** A savable PDF copy rendered from the stored content, so every copy matches the record. */
export async function estimatePdf(ctx: Ctx, estimateId: string): Promise<{ data: Buffer; name: string }> {
  const [r] = await ctx.tx.select().from(goodFaithEstimates).where(eq(goodFaithEstimates.id, estimateId)).limit(1);
  if (!r) throw notFound("Estimate");
  const { row } = await loadCase(ctx, r.caseId, "owner");
  const { content } = open(r);
  const { write, space, save } = await textPdf();
  write(content.provider.name, { size: 11, bold: true, color: PDF_NAVY, gap: 2 });
  write("Good Faith Estimate", { size: 16, bold: true, color: PDF_NAVY, gap: 10 });
  const sec = estimateSections(content);
  const lines = (list: { label: string; value: string }[]) => {
    for (const line of list) {
      write(line.label, { size: 9.5, bold: true, gap: 1 });
      write(line.value, { gap: 8 });
    }
  };
  lines([...sec.patient, ...sec.service]);
  write("Expected items and services", { size: 11, bold: true, color: PDF_NAVY, gap: 4 });
  for (const i of sec.items) write(`${i.description}; service code ${i.serviceCode}; quantity ${i.quantity}; ${i.charge}`, { gap: 6 });
  write(`Total expected charges: ${sec.total}`, { bold: true, gap: 8 });
  lines([{ label: "Diagnosis codes", value: sec.diagnosisCodes }, ...sec.provider, ...sec.record]);
  space(6);
  write("Disclaimers", { size: 11, bold: true, color: PDF_NAVY, gap: 4 });
  for (const d of content.disclaimers) write(d, { size: 9.5, gap: 8 });
  write(`Record hash: ${r.contentHash}`, { size: 8 });
  await audit(ctx, { action: "estimate.downloaded", subjectType: "good_faith_estimate", subjectId: r.id, caseId: row.id });
  return { data: await save({ title: "Good Faith Estimate", producer: content.provider.name }), name: `good-faith-estimate-${row.reference}.pdf` };
}
