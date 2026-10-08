import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { identityVerifications, locationAttestations, patients } from "../db/schema";
import { audit } from "../audit";
import { encryptOptional } from "../crypto";
import { loadCase, touch } from "./cases";
import { storeUpload } from "./files";
import { activeJurisdictionCodes } from "./jurisdiction";
import { requireRole } from "@/domain/policy";
import { invalid, notFound } from "@/domain/errors";

export async function latestIdentity(ctx: Ctx, patientId: string) {
  const [row] = await ctx.tx.select().from(identityVerifications).where(eq(identityVerifications.patientId, patientId)).orderBy(desc(identityVerifications.createdAt)).limit(1);
  return row ?? null;
}

/** Patient uploads a government photo ID for staff review (OWN-04: method may change to a vendor). */
export async function submitIdentityDocument(ctx: Ctx, caseId: string, file: { name: string; data: Buffer }) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const current = await latestIdentity(ctx, row.patientId);
  if (current && (current.status === "verified" || current.status === "pending")) throw invalid("Your ID is already on file.");
  const stored = await storeUpload(ctx, { caseId: row.id, patientId: row.patientId, category: "identity", name: file.name, data: file.data });
  const [idv] = await ctx.tx.insert(identityVerifications).values({ patientId: row.patientId, method: "document_review", status: "pending", fileId: stored.id }).returning();
  await audit(ctx, { action: "identity.submitted", subjectType: "identity_verification", subjectId: idv!.id, caseId: row.id });
  await touch(ctx, row.id);
}

export async function reviewIdentity(ctx: Ctx, verificationId: string, decision: "verified" | "rejected", note: string | null) {
  requireRole(ctx.actor, ["admin", "support", "clinician", "clinical_director"]);
  const [idv] = await ctx.tx.select().from(identityVerifications).where(eq(identityVerifications.id, verificationId)).limit(1);
  if (!idv) throw notFound("Verification");
  if (idv.status !== "pending") throw invalid("This verification was already reviewed.");
  await ctx.tx
    .update(identityVerifications)
    .set({ status: decision, reviewedBy: ctx.actor.userId, reviewedAt: new Date(), reviewNote: encryptOptional(note) })
    .where(eq(identityVerifications.id, verificationId));
  await audit(ctx, { action: "identity.reviewed", subjectType: "identity_verification", subjectId: idv.id, metadata: { decision } });
  const [p] = await ctx.tx.select({ userId: patients.userId }).from(patients).where(eq(patients.id, idv.patientId)).limit(1);
  return p?.userId ?? null;
}

/**
 * Patient attests their physical location. Licensure attaches to where the patient is during care,
 * so this is asked at verification and again when joining any appointment (STR-03).
 */
export async function attestLocation(ctx: Ctx, caseId: string, stateCode: string, context: "verification" | "appointment_join", appointmentId: string | null = null) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const active = await activeJurisdictionCodes(ctx.tx);
  const matches = active.has(stateCode) && (row.jurisdictionCode === null || row.jurisdictionCode === stateCode || context === "appointment_join");
  await ctx.tx.insert(locationAttestations).values({ caseId: row.id, appointmentId, stateCode, context, matchesAuthorization: matches });
  await audit(ctx, { action: "location.attested", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { context, matches } });
  return { matches, caseJurisdiction: row.jurisdictionCode };
}
