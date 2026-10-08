import "server-only";
import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import {
  accessGrants,
  cases,
  caseStatusHistory,
  consentDocuments,
  consents,
  consentVersions,
  documentRequests,
  employerForms,
  identityVerifications,
  intakes,
  locationAttestations,
  measureResponses,
  patients,
  payments,
  questionnaires,
  services,
} from "../db/schema";
import { audit } from "../audit";
import { encryptOptional, randomToken } from "../crypto";
import { getSetting } from "../settings";
import { clinicianJurisdictions } from "./jurisdiction";
import { notifyUser } from "./notify";
import { assertTransition, PATIENT_STATUS } from "@/domain/cases/state-machine";
import { buildChecklist, gate, type ChecklistFacts, type StepKey } from "@/domain/cases/checklist";
import { requireCaseAccess, type CaseAccess } from "@/domain/policy";
import { forbidden, invalid, notFound } from "@/domain/errors";
import type { CaseStatus, ConsentStage, LeaveType } from "@/domain/constants";

export type CaseRow = typeof cases.$inferSelect;

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function newCaseReference(): string {
  const bytes = randomToken(8);
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[bytes.charCodeAt(i) % REF_ALPHABET.length];
  return `LB-${out}`;
}

export async function getCaseRow(ctx: Ctx, caseId: string): Promise<CaseRow> {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw notFound("Case");
  const [row] = await ctx.tx.select().from(cases).where(eq(cases.id, caseId)).limit(1);
  if (!row) throw notFound("Case");
  return row;
}

export async function accessContext(ctx: Ctx, c: CaseRow) {
  const actor = ctx.actor;
  if (actor.kind !== "staff") return {};
  const authorizedJurisdictions = actor.clinicianId ? await clinicianJurisdictions(ctx.tx, actor.clinicianId) : [];
  const [grant] = await ctx.tx
    .select({ id: accessGrants.id })
    .from(accessGrants)
    .where(
      and(
        eq(accessGrants.granteeUserId, actor.userId),
        isNull(accessGrants.revokedAt),
        gt(accessGrants.expiresAt, new Date()),
        sql`${accessGrants.approvedBy} is not null`,
        sql`(${accessGrants.caseId} = ${c.id} or ${accessGrants.caseId} is null)`,
      ),
    )
    .limit(1);
  return { authorizedJurisdictions, hasActiveGrant: Boolean(grant), grantId: grant?.id ?? null };
}

/**
 * Loads a case after an authorization check. Denials are audited. Clinical access through a
 * break-glass grant is audited as a grant use.
 */
export async function loadCase(ctx: Ctx, caseId: string, level: "owner" | "operational" | "clinical"): Promise<{ row: CaseRow; access: CaseAccess }> {
  const row = await getCaseRow(ctx, caseId);
  const actx = await accessContext(ctx, row);
  try {
    const access = requireCaseAccess(ctx.actor, row, level === "owner" && ctx.actor.kind !== "patient" ? "operational" : level, actx);
    if ("grantId" in actx && actx.grantId && access === "clinical" && ctx.actor.kind === "staff" && row.assignedClinicianId !== ctx.actor.clinicianId && !ctx.actor.roles.includes("clinical_director")) {
      await audit(ctx, { action: "access_grant.used", subjectType: "case", subjectId: row.id, caseId: row.id, accessGrantId: actx.grantId });
    }
    return { row, access };
  } catch (e) {
    await audit(ctx, { action: "access.denied", subjectType: "case", subjectId: row.id, caseId: row.id, outcome: "denied", metadata: { level } });
    throw e;
  }
}

export async function transition(ctx: Ctx, row: CaseRow, to: CaseStatus, reason: string | null = null): Promise<CaseRow> {
  if (row.status === to) return row;
  assertTransition(row.status, to);
  const now = new Date();
  const patch: Partial<CaseRow> = { status: to, lastActivityAt: now, updatedAt: now };
  if (to === "submitted" && !row.submittedAt) patch.submittedAt = now;
  if (to === "closed" || to === "cancelled") patch.closedAt = now;
  const [updated] = await ctx.tx.update(cases).set(patch).where(eq(cases.id, row.id)).returning();
  await ctx.tx.insert(caseStatusHistory).values({
    caseId: row.id,
    fromStatus: row.status,
    toStatus: to,
    actorUserId: ctx.actor.kind === "patient" || ctx.actor.kind === "staff" ? ctx.actor.userId : null,
    reason,
  });
  await audit(ctx, { action: "case.status_changed", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { from: row.status, to } });
  return updated!;
}

export async function touch(ctx: Ctx, caseId: string) {
  await ctx.tx.update(cases).set({ lastActivityAt: new Date() }).where(eq(cases.id, caseId));
}

/** Notifies the patient on the case (generic content only). */
export async function notifyPatient(ctx: Ctx, row: CaseRow, event: Parameters<typeof notifyUser>[2]) {
  const [p] = await ctx.tx.select({ userId: patients.userId }).from(patients).where(eq(patients.id, row.patientId)).limit(1);
  if (p) await notifyUser(ctx, p.userId, event, `/portal/cases/${row.id}`);
}

export async function requiredConsentVersions(ctx: Ctx, stage: ConsentStage, jurisdictionCode: string | null) {
  const docs = await ctx.tx
    .select({ doc: consentDocuments, version: consentVersions })
    .from(consentDocuments)
    .innerJoin(consentVersions, eq(consentVersions.documentId, consentDocuments.id))
    .where(and(eq(consentDocuments.requiredBefore, stage), eq(consentDocuments.active, true), eq(consentVersions.status, "published")))
    .orderBy(consentDocuments.displayOrder, desc(consentVersions.version));
  // Latest published version per document; jurisdiction-specific docs only for that jurisdiction.
  const seen = new Set<string>();
  return docs.filter(({ doc }) => {
    if (seen.has(doc.id)) return false;
    if (doc.jurisdictionCode && doc.jurisdictionCode !== jurisdictionCode) return false;
    seen.add(doc.id);
    return true;
  });
}

export async function consentsSatisfied(ctx: Ctx, row: CaseRow, stage: ConsentStage): Promise<boolean> {
  const required = await requiredConsentVersions(ctx, stage, row.jurisdictionCode);
  if (!required.length) return true;
  const signed = await ctx.tx
    .select({ versionId: consents.versionId })
    .from(consents)
    .where(and(eq(consents.caseId, row.id), isNull(consents.revokedAt), inArray(consents.versionId, required.map((r) => r.version.id))));
  const signedSet = new Set(signed.map((s) => s.versionId));
  return required.every((r) => signedSet.has(r.version.id));
}

export async function caseFacts(ctx: Ctx, row: CaseRow): Promise<ChecklistFacts> {
  const [service] = row.serviceId ? await ctx.tx.select().from(services).where(eq(services.id, row.serviceId)).limit(1) : [];
  const features = await getSetting(ctx.tx, "features");
  const [idv] = await ctx.tx.select().from(identityVerifications).where(eq(identityVerifications.patientId, row.patientId)).orderBy(desc(identityVerifications.createdAt)).limit(1);
  const [loc] = await ctx.tx.select({ id: locationAttestations.id }).from(locationAttestations).where(and(eq(locationAttestations.caseId, row.id), eq(locationAttestations.context, "verification"), eq(locationAttestations.matchesAuthorization, true))).limit(1);
  const [paid] = await ctx.tx.select({ id: payments.id }).from(payments).where(and(eq(payments.caseId, row.id), inArray(payments.status, ["paid", "partially_refunded"]))).limit(1);
  const [intake] = await ctx.tx.select({ status: intakes.status }).from(intakes).where(eq(intakes.caseId, row.id)).limit(1);
  const enabledMeasures = await ctx.tx.select({ key: questionnaires.key }).from(questionnaires).where(and(eq(questionnaires.kind, "measure"), eq(questionnaires.status, "published"), eq(questionnaires.enabled, true)));
  const doneMeasures = await ctx.tx.select({ key: measureResponses.instrumentKey }).from(measureResponses).where(eq(measureResponses.caseId, row.id));
  const doneSet = new Set(doneMeasures.map((m) => m.key));
  const uniqueEnabled = [...new Set(enabledMeasures.map((m) => m.key))];
  const [forms] = await ctx.tx.select({ n: count() }).from(employerForms).where(eq(employerForms.caseId, row.id));
  const [openReq] = await ctx.tx.select({ n: count() }).from(documentRequests).where(and(eq(documentRequests.caseId, row.id), eq(documentRequests.status, "open")));
  return {
    screeningReviewPending: row.screeningReview === "pending",
    serviceSelected: Boolean(row.serviceId),
    identityRequired: Boolean(features.identityVerification && (service?.requiresIdentityVerification ?? true)),
    identityStatus: (idv?.status as ChecklistFacts["identityStatus"]) ?? "not_started",
    locationConfirmed: Boolean(loc),
    paymentConsentsSigned: await consentsSatisfied(ctx, row, "payment"),
    paid: Boolean(paid),
    intakeConsentsSigned: await consentsSatisfied(ctx, row, "intake"),
    intakeSubmitted: intake?.status === "submitted",
    measuresEnabled: features.measures && uniqueEnabled.length > 0,
    measuresRemaining: features.measures ? uniqueEnabled.filter((k) => !doneSet.has(k)).length : 0,
    employerFormRequired: Boolean(service?.requiresEmployerForm),
    employerFormUploaded: Number(forms?.n ?? 0) > 0,
    openRequests: Number(openReq?.n ?? 0),
    submitted: !["started", "intake_incomplete", "awaiting_documents"].includes(row.status),
  };
}

export async function requireGate(ctx: Ctx, row: CaseRow, step: StepKey) {
  const facts = await caseFacts(ctx, row);
  const g = gate(facts, step);
  if (!g.ok) throw invalid(g.reason);
  return facts;
}

/**
 * Moves pre-submission cases forward automatically as the patient completes steps.
 * Never submits on the patient's behalf.
 */
export async function syncPreSubmissionStatus(ctx: Ctx, row: CaseRow): Promise<CaseRow> {
  if (!["started", "intake_incomplete", "awaiting_documents"].includes(row.status)) return row;
  const f = await caseFacts(ctx, row);
  if (row.status === "started" && f.paid) row = await transition(ctx, row, "intake_incomplete", "payment received");
  if (row.status === "intake_incomplete" && f.intakeSubmitted && (!f.measuresEnabled || f.measuresRemaining === 0) && f.employerFormRequired && !f.employerFormUploaded) {
    row = await transition(ctx, row, "awaiting_documents", "employer form required");
  }
  if (row.status === "awaiting_documents" && f.employerFormUploaded) row = await transition(ctx, row, "intake_incomplete", "documents received");
  return row;
}

export async function patientChecklist(ctx: Ctx, row: CaseRow) {
  return buildChecklist(await caseFacts(ctx, row));
}

export async function selectService(ctx: Ctx, caseId: string, input: { serviceId: string; leaveType: LeaveType; deadline: string | null; employerName: string | null }) {
  const { row } = await loadCase(ctx, caseId, "owner");
  if (row.status !== "started") throw invalid("The service can't be changed after payment. Contact support for help.");
  const [svc] = await ctx.tx.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.enabled, true))).limit(1);
  if (!svc) throw invalid("That service is not currently available.");
  await ctx.tx
    .update(cases)
    .set({
      serviceId: svc.id,
      requestedLeaveType: input.leaveType,
      documentationDeadline: input.deadline,
      employerName: encryptOptional(input.employerName),
      lastActivityAt: new Date(),
    })
    .where(eq(cases.id, row.id));
  await audit(ctx, { action: "case.service_selected", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { service: svc.slug } });
}

export async function submitCase(ctx: Ctx, caseId: string) {
  let { row } = await loadCase(ctx, caseId, "owner");
  row = await syncPreSubmissionStatus(ctx, row);
  await requireGate(ctx, row, "submit");
  if (row.status === "started") throw invalid("Payment is needed first.");
  row = await transition(ctx, row, "submitted", "patient submitted");
  await notifyPatient(ctx, row, "case_update");
  return row;
}

export async function cancelCaseByPatient(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  if (!["started", "intake_incomplete", "awaiting_documents"].includes(row.status)) {
    throw forbidden("This request is already with a clinician. Please message support to cancel.");
  }
  await transition(ctx, row, "cancelled", "cancelled by patient");
}

export async function patientCases(ctx: Ctx) {
  if (ctx.actor.kind !== "patient") throw forbidden();
  return ctx.tx
    .select({ c: cases, serviceName: services.name })
    .from(cases)
    .leftJoin(services, eq(services.id, cases.serviceId))
    .where(eq(cases.patientId, ctx.actor.patientId))
    .orderBy(desc(cases.createdAt));
}

export async function statusHistory(ctx: Ctx, caseId: string) {
  return ctx.tx.select().from(caseStatusHistory).where(eq(caseStatusHistory.caseId, caseId)).orderBy(caseStatusHistory.createdAt);
}

export { PATIENT_STATUS };
