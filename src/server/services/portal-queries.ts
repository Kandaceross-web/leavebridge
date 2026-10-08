import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { documentRequests, documents, jurisdictions, locationAttestations, patients, services } from "../db/schema";
import { decryptOptional } from "../crypto";
import { loadCase } from "./cases";
import { currentPrice } from "./payments";
import { latestIdentity } from "./identity";
import { forbidden } from "@/domain/errors";

/**
 * Small read-only helpers for the patient portal. Each one checks access through the patient
 * actor (and loadCase for case-scoped reads); row-level security applies underneath.
 */

function requirePatient(ctx: Ctx) {
  if (ctx.actor.kind !== "patient") throw forbidden();
  return ctx.actor;
}

/** The signed-in patient's own profile (legal name is used for typed signatures). */
export async function myPatientProfile(ctx: Ctx) {
  const actor = requirePatient(ctx);
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, actor.patientId)).limit(1);
  if (!p) throw forbidden();
  return {
    legalName: `${p.legalFirstName} ${p.legalLastName}`,
    firstName: p.preferredName ?? p.legalFirstName,
    preferredName: p.preferredName ?? "",
    phone: p.phone ?? "",
    timeZone: p.timeZone,
    emailNotifications: p.emailNotifications,
    smsNotifications: p.smsNotifications,
    smsConsentAt: p.smsConsentAt,
  };
}

/** States where care can currently be delivered (active and telehealth-authorized). */
export async function activeStateOptions(ctx: Ctx) {
  const rows = await ctx.tx
    .select({ code: jurisdictions.code, name: jurisdictions.name })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.isActive, true), eq(jurisdictions.telehealthAuthorized, true)))
    .orderBy(asc(jurisdictions.name));
  return rows.map((r) => ({ value: r.code, label: r.name }));
}

/** Every jurisdiction (for "where are you right now" questions that must accept any answer). */
export async function allStateOptions(ctx: Ctx) {
  const rows = await ctx.tx.select({ code: jurisdictions.code, name: jurisdictions.name }).from(jurisdictions).orderBy(asc(jurisdictions.name));
  return rows.map((r) => ({ value: r.code, label: r.name }));
}

/** Enabled services with their current self-pay price. */
export async function enabledServicesWithPrice(ctx: Ctx) {
  const rows = await ctx.tx.select().from(services).where(eq(services.enabled, true)).orderBy(asc(services.displayOrder));
  const out = [];
  for (const s of rows) {
    const price = await currentPrice(ctx, s.id);
    out.push({ id: s.id, name: s.name, summary: s.summary, reviewTag: s.reviewTag, priceCents: price?.amountCents ?? null, currency: price?.currency ?? "usd" });
  }
  return out;
}

export async function serviceSummary(ctx: Ctx, serviceId: string | null) {
  if (!serviceId) return null;
  const [s] = await ctx.tx.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!s) return null;
  const price = await currentPrice(ctx, s.id);
  return { id: s.id, name: s.name, summary: s.summary, requiresEmployerForm: s.requiresEmployerForm, priceCents: price?.amountCents ?? null, currency: price?.currency ?? "usd" };
}

/** Identity and location status for the verify step. The reviewer note is shown only when the ID was not accepted. */
export async function verificationView(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const idv = await latestIdentity(ctx, row.patientId);
  const [loc] = await ctx.tx
    .select({ stateCode: locationAttestations.stateCode, matches: locationAttestations.matchesAuthorization, at: locationAttestations.createdAt })
    .from(locationAttestations)
    .where(and(eq(locationAttestations.caseId, row.id), eq(locationAttestations.context, "verification")))
    .orderBy(desc(locationAttestations.createdAt))
    .limit(1);
  return {
    identity: idv
      ? {
          status: idv.status,
          submittedAt: idv.createdAt,
          reviewerMessage: idv.status === "rejected" ? decryptOptional(idv.reviewNote) : null,
        }
      : null,
    location: loc ?? null,
    caseJurisdiction: row.jurisdictionCode,
  };
}

/** Open document/information requests across the patient's own cases (for the dashboard). */
export async function myOpenRequests(ctx: Ctx, caseIds: string[]) {
  requirePatient(ctx);
  if (!caseIds.length) return [];
  return ctx.tx
    .select({ id: documentRequests.id, caseId: documentRequests.caseId, kind: documentRequests.kind, createdAt: documentRequests.createdAt })
    .from(documentRequests)
    .where(and(inArray(documentRequests.caseId, caseIds), eq(documentRequests.status, "open")));
}

/** Delivered documents across the patient's cases. Only the signed rendering is downloadable. */
export async function myDeliveredDocuments(ctx: Ctx, caseIds: string[]) {
  requirePatient(ctx);
  if (!caseIds.length) return [];
  return ctx.tx
    .select({ id: documents.id, caseId: documents.caseId, title: documents.title, kind: documents.kind, signedFileId: documents.signedFileId, updatedAt: documents.updatedAt })
    .from(documents)
    .where(and(inArray(documents.caseId, caseIds), eq(documents.status, "delivered")))
    .orderBy(desc(documents.updatedAt));
}
