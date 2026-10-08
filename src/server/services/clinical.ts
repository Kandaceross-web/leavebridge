import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import {
  appointments,
  assessmentNotes,
  caseNotes,
  cases,
  clinicalReviews,
  clinicians,
  determinations,
  documentRequests,
  documents,
  employerForms,
  measureResponses,
  safetyEvents,
  services,
} from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptOptional, encrypt, encryptJson, encryptOptional } from "../crypto";
import { getSetting } from "../settings";
import { checkCanServe, clinicianJurisdictions } from "./jurisdiction";
import { getCaseRow, loadCase, notifyPatient, touch, transition } from "./cases";
import { requireAssignedClinician, requireRole, requireStaffMfa, requireStepUp, hasRole } from "@/domain/policy";
import { DENY_REASON_LABEL } from "@/domain/jurisdiction/can-serve";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { DETERMINATION_DECISIONS, type ClinicalReviewOutcome, type DeterminationDecision, type RequestKind } from "@/domain/constants";

const CLINICAL = ["clinician", "clinical_director"] as const;

/** Assigns a clinician after confirming they can serve the case's jurisdiction and service today. */
export async function assignClinician(ctx: Ctx, caseId: string, clinicianId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin"]);
  const self = ctx.actor.clinicianId === clinicianId;
  if (!self && !hasRole(ctx.actor, ["clinical_director", "admin"])) throw forbidden("Only a clinical director or admin can assign another clinician.");
  const { row } = await loadCase(ctx, caseId, "operational");
  if (!row.serviceId || !row.jurisdictionCode) throw invalid("This case has no service or state yet.");
  const result = await checkCanServe(ctx.tx, clinicianId, row.serviceId, row.jurisdictionCode, new Date());
  if (!result.ok) throw invalid(`This clinician can't serve this case: ${result.reasons.map((r) => DENY_REASON_LABEL[r]).join("; ")}.`);
  await ctx.tx.update(cases).set({ assignedClinicianId: clinicianId, lastActivityAt: new Date() }).where(eq(cases.id, row.id));
  await audit(ctx, { action: "case.assigned", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { clinicianId } });
  const updated = await getCaseRow(ctx, row.id);
  if (updated.status === "submitted") await transition(ctx, updated, "clinical_review", "assigned for review");
}

/** NEEDS_REVIEW screening: an authorized clinician clears the patient to continue, or declines. */
export async function decideScreeningReview(ctx: Ctx, caseId: string, decision: "cleared" | "declined", note: string) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const { row } = await loadCase(ctx, caseId, "operational");
  if (row.screeningReview !== "pending") throw invalid("This screening is not awaiting review.");
  if (!hasRole(ctx.actor, ["clinical_director"]) && row.jurisdictionCode) {
    const mine = ctx.actor.clinicianId ? await clinicianJurisdictions(ctx.tx, ctx.actor.clinicianId) : [];
    if (!mine.includes(row.jurisdictionCode)) throw forbidden("Only clinicians authorized in this state can review this screening.");
  }
  if (!note.trim()) throw invalid("Add a short note explaining the decision.");
  await ctx.tx.update(cases).set({ screeningReview: decision, lastActivityAt: new Date() }).where(eq(cases.id, row.id));
  await ctx.tx.insert(caseNotes).values({ caseId: row.id, authorUserId: ctx.actor.userId, visibility: "clinical", body: encrypt(`Screening review ${decision}: ${note}`) });
  await audit(ctx, { action: "clinical_review.recorded", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { screeningReview: decision } });
  if (decision === "declined") await transition(ctx, row, "cancelled", "screening review declined");
  await notifyPatient(ctx, row, "case_update");
}

export async function recordClinicalReview(ctx: Ctx, caseId: string, input: { outcome: ClinicalReviewOutcome; notes: string; requestMessage?: string }) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const { row } = await loadCase(ctx, caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  if (row.status !== "clinical_review") throw conflict("Clinical review can be recorded only while the case is under review.");
  await ctx.tx.insert(clinicalReviews).values({ caseId: row.id, clinicianId: ctx.actor.clinicianId!, outcome: input.outcome, notes: encryptOptional(input.notes) });
  await audit(ctx, { action: "clinical_review.recorded", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { outcome: input.outcome } });
  if (input.outcome === "session_required") {
    const updated = await transition(ctx, row, "appointment_needed", "clinician requires a session");
    await notifyPatient(ctx, updated, "appointment_needed");
  } else if (input.outcome === "info_required") {
    if (!input.requestMessage?.trim()) throw invalid("Describe what information you need from the patient.");
    await createRequest(ctx, row.id, "information", input.requestMessage);
  } else {
    const [svc] = await ctx.tx.select().from(services).where(eq(services.id, row.serviceId!)).limit(1);
    if (svc?.requiresSession) {
      const [done] = await ctx.tx.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.caseId, row.id), eq(appointments.status, "completed"))).limit(1);
      if (!done) throw invalid("This service requires a telehealth session before a determination. Choose 'Session required'.");
    }
    await transition(ctx, row, "provider_review", "ready for determination");
  }
}

export async function createRequest(ctx: Ctx, caseId: string, kind: RequestKind, message: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  const level = kind === "information" ? "clinical" : "operational";
  const { row } = await loadCase(ctx, caseId, level);
  if (!message.trim() || message.length > 2000) throw invalid("Write a short request for the patient (up to 2000 characters).");
  const [req] = await ctx.tx.insert(documentRequests).values({ caseId: row.id, kind, message: encrypt(message.trim()), requestedBy: ctx.actor.userId }).returning();
  await audit(ctx, { action: "request.created", subjectType: "document_request", subjectId: req!.id, caseId: row.id, metadata: { kind } });
  if (["clinical_review", "provider_review"].includes(row.status)) await transition(ctx, row, "info_requested", `request: ${kind}`);
  await notifyPatient(ctx, row, kind === "information" ? "information_requested" : "document_requested");
  return req!.id;
}

export async function openRequests(ctx: Ctx, caseId: string) {
  const rows = await ctx.tx.select().from(documentRequests).where(eq(documentRequests.caseId, caseId)).orderBy(desc(documentRequests.createdAt));
  return rows.map((r) => ({ ...r, message: decrypt(r.message), response: decryptOptional(r.response) }));
}

/** Patient responds to a request (text, or after uploading the requested file). */
export async function fulfillRequest(ctx: Ctx, requestId: string, response: string | null) {
  const [req] = await ctx.tx.select().from(documentRequests).where(eq(documentRequests.id, requestId)).limit(1);
  if (!req) throw notFound("Request");
  const { row } = await loadCase(ctx, req.caseId, "owner");
  if (req.status !== "open") throw invalid("This request is already complete.");
  if (req.kind === "information" && !response?.trim()) throw invalid("Please write a response.");
  await ctx.tx.update(documentRequests).set({ status: "fulfilled", fulfilledAt: new Date(), response: encryptOptional(response?.trim() ?? null) }).where(eq(documentRequests.id, req.id));
  await audit(ctx, { action: "request.fulfilled", subjectType: "document_request", subjectId: req.id, caseId: row.id });
  const [remaining] = await ctx.tx.select({ n: sql<number>`count(*)::int` }).from(documentRequests).where(and(eq(documentRequests.caseId, row.id), eq(documentRequests.status, "open")));
  if (row.status === "info_requested" && Number(remaining?.n ?? 0) === 0) await transition(ctx, row, "clinical_review", "patient responded");
  await touch(ctx, row.id);
}

export async function cancelRequest(ctx: Ctx, requestId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  const [req] = await ctx.tx.select().from(documentRequests).where(eq(documentRequests.id, requestId)).limit(1);
  if (!req || req.status !== "open") throw invalid("This request is not open.");
  const { row } = await loadCase(ctx, req.caseId, "operational");
  await ctx.tx.update(documentRequests).set({ status: "cancelled" }).where(eq(documentRequests.id, req.id));
  const [remaining] = await ctx.tx.select({ n: sql<number>`count(*)::int` }).from(documentRequests).where(and(eq(documentRequests.caseId, row.id), eq(documentRequests.status, "open")));
  if (row.status === "info_requested" && Number(remaining?.n ?? 0) === 0) await transition(ctx, row, "clinical_review", "request withdrawn");
}

export async function reviewMeasure(ctx: Ctx, measureId: string) {
  requireRole(ctx.actor, CLINICAL);
  const [m] = await ctx.tx.select().from(measureResponses).where(eq(measureResponses.id, measureId)).limit(1);
  if (!m) throw notFound("Questionnaire");
  await loadCase(ctx, m.caseId, "clinical");
  await ctx.tx.update(measureResponses).set({ reviewedBy: ctx.actor.userId, reviewedAt: new Date() }).where(eq(measureResponses.id, m.id));
  await audit(ctx, { action: "measure.reviewed", subjectType: "measure", subjectId: m.id, caseId: m.caseId });
}

export async function reviewEmployerForm(ctx: Ctx, formId: string, input: { formKind: (typeof employerForms.$inferSelect)["formKind"]; pages: number[]; notes: string }) {
  requireRole(ctx.actor, CLINICAL);
  const [f] = await ctx.tx.select().from(employerForms).where(eq(employerForms.id, formId)).limit(1);
  if (!f) throw notFound("Form");
  await loadCase(ctx, f.caseId, "clinical");
  await ctx.tx
    .update(employerForms)
    .set({ formKind: input.formKind, pagesRequiringCompletion: input.pages.filter((n) => Number.isInteger(n) && n > 0 && n < 200), extracted: encryptJson({ reviewerNotes: input.notes, source: "clinician" }), status: "reviewed", reviewedBy: ctx.actor.userId, reviewedAt: new Date() })
    .where(eq(employerForms.id, f.id));
  await audit(ctx, { action: "employer_form.reviewed", subjectType: "employer_form", subjectId: f.id, caseId: f.caseId });
}

export async function saveAssessmentNote(ctx: Ctx, caseId: string, body: string, appointmentId: string | null) {
  requireRole(ctx.actor, CLINICAL);
  const { row } = await loadCase(ctx, caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  if (!body.trim()) throw invalid("The note is empty.");
  await ctx.tx.insert(assessmentNotes).values({ caseId: row.id, clinicianId: ctx.actor.clinicianId!, appointmentId, body: encrypt(body) });
  await audit(ctx, { action: "assessment_note.saved", subjectType: "case", subjectId: row.id, caseId: row.id });
}

export async function assessmentNoteHistory(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, "clinical");
  const rows = await ctx.tx.select().from(assessmentNotes).where(eq(assessmentNotes.caseId, caseId)).orderBy(desc(assessmentNotes.createdAt));
  return rows.map((r) => ({ ...r, body: decrypt(r.body) }));
}

/**
 * Records the clinician's determination. Only the assigned clinician, with MFA and a fresh
 * step-up, may do this; rationale and findings are required; nothing is preselected and no code
 * path derives the decision from software output. The DB trigger re-checks the clinician.
 */
export async function recordDetermination(ctx: Ctx, caseId: string, input: { decision: string; rationale: string; findings: string; patientMessage: string; requestMessage?: string }) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const sec = await getSetting(ctx.tx, "security");
  requireStepUp(ctx.actor, sec.stepUpMinutes);
  const { row } = await loadCase(ctx, caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  if (!(DETERMINATION_DECISIONS as readonly string[]).includes(input.decision)) throw invalid("Choose a determination.");
  const decision = input.decision as DeterminationDecision;
  if (input.rationale.trim().length < 20) throw invalid("Rationale is required (at least a sentence).");
  if (input.findings.trim().length < 10) throw invalid("Relevant findings are required.");
  if (!input.patientMessage.trim()) throw invalid("Write the message the patient will see.");
  if (!["clinical_review", "provider_review", "appointment_scheduled", "completed"].includes(row.status)) {
    throw conflict("A determination can't be recorded at this stage.");
  }
  if (decision === "DOCUMENTATION_CLINICALLY_SUPPORTED") {
    const [svc] = await ctx.tx.select().from(services).where(eq(services.id, row.serviceId!)).limit(1);
    if (svc?.requiresSession) {
      const [done] = await ctx.tx.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.caseId, row.id), eq(appointments.status, "completed"))).limit(1);
      if (!done) throw invalid("This service requires a completed telehealth session before documentation can be supported.");
    }
    if (row.jurisdictionCode) {
      const can = await checkCanServe(ctx.tx, ctx.actor.clinicianId!, row.serviceId!, row.jurisdictionCode, new Date());
      if (!can.ok) throw invalid(`Your authorization for this state is not currently valid: ${can.reasons.map((r) => DENY_REASON_LABEL[r]).join("; ")}.`);
    }
  }
  const [prior] = await ctx.tx.select({ id: determinations.id }).from(determinations).where(eq(determinations.caseId, row.id)).orderBy(desc(determinations.createdAt)).limit(1);
  const [d] = await ctx.tx
    .insert(determinations)
    .values({
      caseId: row.id,
      clinicianId: ctx.actor.clinicianId!,
      decidedByUserId: ctx.actor.userId,
      decision,
      rationale: encrypt(input.rationale.trim()),
      findings: encrypt(input.findings.trim()),
      patientMessage: encrypt(input.patientMessage.trim()),
      stepUpAt: ctx.actor.stepUpAt!,
      supersedesId: prior?.id ?? null,
    })
    .returning({ id: determinations.id });
  await audit(ctx, { action: "determination.recorded", subjectType: "determination", subjectId: d!.id, caseId: row.id, metadata: { decision, supersedes: prior?.id ?? null } });

  let current = row;
  if (current.status === "appointment_scheduled") current = await transition(ctx, current, "provider_review", "determination recorded");
  if (current.status === "clinical_review" && decision !== "ADDITIONAL_INFORMATION_REQUIRED") current = await transition(ctx, current, "provider_review", "determination recorded");
  switch (decision) {
    case "DOCUMENTATION_CLINICALLY_SUPPORTED":
      // Documentation builder next; the case advances when documents are ready to sign.
      if (current.status === "completed") current = await transition(ctx, current, "provider_review", "determination revised");
      break;
    case "ADDITIONAL_INFORMATION_REQUIRED":
      if (!input.requestMessage?.trim()) throw invalid("Describe the additional information needed.");
      await createRequest(ctx, row.id, "information", input.requestMessage);
      break;
    case "DOCUMENTATION_NOT_CLINICALLY_SUPPORTED":
    case "REFER_OUTSIDE_SCOPE":
      if (current.status !== "completed") current = await transition(ctx, current, "completed", decision.toLowerCase());
      await notifyPatient(ctx, current, "case_update");
      break;
  }
}

export async function caseDeterminations(ctx: Ctx, caseId: string, view: "clinical" | "patient") {
  await loadCase(ctx, caseId, view === "patient" ? "owner" : "clinical");
  const rows = await ctx.tx
    .select({ d: determinations, clinicianName: clinicians.displayName, credentials: clinicians.credentials })
    .from(determinations)
    .innerJoin(clinicians, eq(clinicians.id, determinations.clinicianId))
    .where(eq(determinations.caseId, caseId))
    .orderBy(desc(determinations.createdAt));
  return rows.map(({ d, clinicianName, credentials }) => ({
    id: d.id,
    decision: d.decision,
    createdAt: d.createdAt,
    clinician: `${clinicianName}, ${credentials}`,
    patientMessage: decrypt(d.patientMessage),
    supersedesId: d.supersedesId,
    // Patients see the decision and the clinician's message, not the internal rationale (CLN-10).
    rationale: view === "clinical" ? decrypt(d.rationale) : null,
    findings: view === "clinical" ? decrypt(d.findings) : null,
  }));
}

export async function addCaseNote(ctx: Ctx, caseId: string, visibility: "clinical" | "operational", body: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support", "billing", "compliance"]);
  await loadCase(ctx, caseId, visibility === "clinical" ? "clinical" : "operational");
  if (!body.trim() || body.length > 4000) throw invalid("Notes must be 1–4000 characters.");
  await ctx.tx.insert(caseNotes).values({ caseId, authorUserId: ctx.actor.userId, visibility, body: encrypt(body.trim()) });
  await audit(ctx, { action: "case.note_added", subjectType: "case", subjectId: caseId, caseId, metadata: { visibility } });
}

export async function listCaseNotes(ctx: Ctx, caseId: string, includeClinical: boolean) {
  const rows = await ctx.tx.select().from(caseNotes).where(eq(caseNotes.caseId, caseId)).orderBy(desc(caseNotes.createdAt));
  return rows.filter((r) => includeClinical || r.visibility === "operational").map((r) => ({ ...r, body: decrypt(r.body) }));
}

export async function acknowledgeSafety(ctx: Ctx, eventId: string, note: string, hold: boolean) {
  requireRole(ctx.actor, CLINICAL);
  const [e] = await ctx.tx.select().from(safetyEvents).where(eq(safetyEvents.id, eventId)).limit(1);
  if (!e || e.acknowledgedAt) throw invalid("This safety event is not open.");
  if (!note.trim()) throw invalid("Document the follow-up taken.");
  if (e.caseId) await loadCase(ctx, e.caseId, "clinical");
  await ctx.tx.update(safetyEvents).set({ acknowledgedBy: ctx.actor.userId, acknowledgedAt: new Date(), followUpNote: encrypt(note.trim()) }).where(eq(safetyEvents.id, e.id));
  await audit(ctx, { action: "safety.event_acknowledged", subjectType: "safety_event", subjectId: e.id, caseId: e.caseId });
  if (e.caseId && hold) {
    const row = await getCaseRow(ctx, e.caseId);
    if (row.status !== "safety_hold") await transition(ctx, row, "safety_hold", "clinician placed safety hold");
  }
}

export async function releaseSafetyHold(ctx: Ctx, caseId: string, note: string) {
  requireRole(ctx.actor, CLINICAL);
  const { row } = await loadCase(ctx, caseId, "clinical");
  if (row.status !== "safety_hold") throw invalid("The case is not on hold.");
  await ctx.tx.insert(caseNotes).values({ caseId, authorUserId: ctx.actor.userId, visibility: "clinical", body: encrypt(`Safety hold released: ${note}`) });
  await transition(ctx, row, "clinical_review", "safety hold released");
}

export async function openSafetyEvents(ctx: Ctx, caseId?: string) {
  const rows = await ctx.tx
    .select()
    .from(safetyEvents)
    .where(caseId ? and(eq(safetyEvents.caseId, caseId), isNull(safetyEvents.acknowledgedAt)) : isNull(safetyEvents.acknowledgedAt))
    .orderBy(desc(safetyEvents.createdAt));
  return rows;
}

/** Closing requires: a determination, and every non-voided document signed and delivered. */
export async function closeCase(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin"]);
  const { row } = await loadCase(ctx, caseId, "operational");
  const [d] = await ctx.tx.select({ id: determinations.id }).from(determinations).where(eq(determinations.caseId, row.id)).limit(1);
  if (!d) throw invalid("A determination must be recorded before closing.");
  const docs = await ctx.tx.select({ status: documents.status }).from(documents).where(and(eq(documents.caseId, row.id), sql`${documents.status} <> 'voided'`));
  if (docs.some((x) => x.status !== "delivered")) throw invalid("Every document must be signed and delivered before closing.");
  await transition(ctx, row, "closed", "case closed");
}

export async function clinicianOptions(ctx: Ctx) {
  return ctx.tx.select({ id: clinicians.id, name: clinicians.displayName, credentials: clinicians.credentials, status: clinicians.status }).from(clinicians).where(inArray(clinicians.status, ["active"]));
}
