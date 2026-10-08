"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffSession, run } from "@/server/auth/guards";
import { formFields, formFile, handle, type ActionState } from "@/server/web/action";
import { getSetting } from "@/server/settings";
import {
  addCaseNote,
  assignClinician,
  cancelRequest,
  closeCase,
  createRequest,
  decideScreeningReview,
  recordClinicalReview,
  recordDetermination,
  reviewEmployerForm,
  reviewMeasure,
  saveAssessmentNote,
} from "@/server/services/clinical";
import { reviewIdentity } from "@/server/services/identity";
import {
  attachCompletedForm,
  createDocument,
  decideSuggestion,
  deliverToPatient,
  generateSuggestions,
  markReadyForSignature,
  saveDocumentVersion,
  signDocument,
  voidDocument,
} from "@/server/services/documents";
import { bookAppointment, cancelAppointment, completeAppointment } from "@/server/services/scheduling";
import { sendMessage } from "@/server/services/messaging";
import { requestRefund } from "@/server/services/payments";
import { requestAccessGrant } from "@/server/services/admin";
import { loadCase } from "@/server/services/cases";
import { invalid } from "@/domain/errors";
import { CLINICAL_REVIEW_OUTCOMES, type ClinicalReviewOutcome } from "@/domain/constants";
import type { RefundTrigger } from "@/domain/payments/refunds";

/*
 * Server actions for the case workspace. Every action re-authenticates the staff session and
 * calls a service that enforces role, case access, MFA and step-up itself. handle() sends
 * step_up_required to /step-up and back to the page the form was on.
 */

const casePath = (caseId: string) => `/ops/cases/${caseId}`;
const done = (caseId: string) => revalidatePath(casePath(caseId), "layout");

async function staff() {
  return (await requireStaffSession()).actor;
}

export async function assignAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const clinicianId = String(fd.get("clinicianId") ?? "");
    if (!clinicianId) throw invalid("Choose a clinician.");
    await run(actor, (ctx) => assignClinician(ctx, caseId, clinicianId));
    done(caseId);
    return { message: "Clinician assigned." };
  }, fd);
}

export async function reviewIdentityAction(caseId: string, verificationId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const decision = fd.get("decision");
    if (decision !== "verified" && decision !== "rejected") throw invalid("Choose verified or rejected.");
    const note = String(fd.get("note") ?? "").trim();
    if (decision === "rejected" && !note) throw invalid("Add a short note explaining what the patient needs to fix.");
    await run(actor, async (ctx) => {
      await loadCase(ctx, caseId, "operational");
      await reviewIdentity(ctx, verificationId, decision, note || null);
    });
    done(caseId);
    return { message: decision === "verified" ? "Identity marked verified." : "Identity marked rejected." };
  }, fd);
}

export async function createRequestAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const kind = String(fd.get("kind") ?? "");
    if (!["employer_form", "supporting_document", "identity", "information"].includes(kind)) throw invalid("Choose what you are requesting.");
    const message = String(fd.get("message") ?? "");
    await run(actor, (ctx) => createRequest(ctx, caseId, kind as "employer_form" | "supporting_document" | "identity" | "information", message));
    done(caseId);
    return { message: "Request sent to the patient." };
  }, fd);
}

export async function cancelRequestAction(caseId: string, requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => cancelRequest(ctx, requestId));
    done(caseId);
    return { message: "Request withdrawn." };
  }, fd);
}

export async function screeningReviewAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const decision = fd.get("decision");
    if (decision !== "cleared" && decision !== "declined") throw invalid("Choose a screening review decision.");
    await run(actor, (ctx) => decideScreeningReview(ctx, caseId, decision, String(fd.get("note") ?? "")));
    done(caseId);
    return { message: "Screening review recorded." };
  }, fd);
}

export async function closeCaseAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => closeCase(ctx, caseId));
    done(caseId);
    return { message: "Case closed." };
  }, fd);
}

export async function requestAccessAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const hours = Number.parseInt(String(fd.get("hours") ?? "1"), 10) || 1;
    await run(actor, (ctx) => requestAccessGrant(ctx, { caseId, reason: String(fd.get("reason") ?? ""), hours }));
    done(caseId);
    return { message: "Access request submitted. A clinical director or admin must approve it before access begins." };
  }, fd);
}

// ---- Clinical ---------------------------------------------------------------------------

export async function reviewMeasureAction(caseId: string, measureId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => reviewMeasure(ctx, measureId));
    done(caseId);
    return { message: "Marked reviewed." };
  }, fd);
}

const FORM_KINDS = ["wh_380_e", "administrator_form", "employer_form", "disability_form", "other", "unknown"] as const;

export async function reviewEmployerFormAction(caseId: string, formId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const formKind = String(fd.get("formKind") ?? "");
    if (!(FORM_KINDS as readonly string[]).includes(formKind)) throw invalid("Choose the form type.");
    const pages = String(fd.get("pages") ?? "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((p) => Number.parseInt(p, 10))
      .filter((n) => Number.isInteger(n));
    await run(actor, (ctx) => reviewEmployerForm(ctx, formId, { formKind: formKind as (typeof FORM_KINDS)[number], pages, notes: String(fd.get("notes") ?? "").slice(0, 2000) }));
    done(caseId);
    return { message: "Form review saved." };
  }, fd);
}

export async function clinicalReviewAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const outcome = String(fd.get("outcome") ?? "");
    if (!(CLINICAL_REVIEW_OUTCOMES as readonly string[]).includes(outcome)) throw invalid("Choose a review outcome.");
    const f = formFields(fd);
    await run(actor, (ctx) => recordClinicalReview(ctx, caseId, { outcome: outcome as ClinicalReviewOutcome, notes: f.notes ?? "", requestMessage: f.requestMessage }));
    done(caseId);
    return { message: "Clinical review recorded." };
  }, fd);
}

export async function assessmentNoteAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const f = formFields(fd);
    await run(actor, (ctx) => saveAssessmentNote(ctx, caseId, f.body ?? "", f.appointmentId || null));
    done(caseId);
    return { message: "Note saved as a new version." };
  }, fd);
}

export async function determinationAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const f = formFields(fd);
    const fieldErrors: Record<string, string> = {};
    if (!f.decision) fieldErrors.decision = "Choose your determination.";
    if ((f.rationale ?? "").trim().length < 20) fieldErrors.rationale = "Write your rationale (at least 20 characters).";
    if ((f.findings ?? "").trim().length < 10) fieldErrors.findings = "List the relevant findings (at least 10 characters).";
    if (!(f.patientMessage ?? "").trim()) fieldErrors.patientMessage = "Write the message the patient will see.";
    if (f.decision === "ADDITIONAL_INFORMATION_REQUIRED" && !(f.requestMessage ?? "").trim()) fieldErrors.requestMessage = "Describe the information you need.";
    if (Object.keys(fieldErrors).length) return { ok: false, error: "Please check the highlighted fields.", fieldErrors, values: f };
    await run(actor, (ctx) =>
      recordDetermination(ctx, caseId, { decision: f.decision!, rationale: f.rationale!, findings: f.findings!, patientMessage: f.patientMessage!, requestMessage: f.requestMessage }),
    );
    done(caseId);
    return { message: "Determination recorded." };
  }, fd);
}

export async function createDocumentAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let docId = "";
  const res = await handle(async () => {
    const actor = await staff();
    const kind = String(fd.get("kind") ?? "");
    const employerFormId = String(fd.get("employerFormId") ?? "") || null;
    docId = await run(actor, (ctx) => createDocument(ctx, caseId, kind, employerFormId));
    done(caseId);
  }, fd);
  if (res.error || !docId) return res;
  redirect(`${casePath(caseId)}/documents/${docId}`);
}

export async function saveDocumentAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const f = formFields(fd);
    await run(actor, (ctx) => saveDocumentVersion(ctx, docId, f));
    done(caseId);
    return { message: "Saved as a new version." };
  }, fd);
}

export async function attachFormAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const file = await formFile(fd, "file");
    if (!file) return { ok: false, error: "Choose the completed form PDF.", fieldErrors: { file: "Choose a PDF file." } };
    await run(actor, (ctx) => attachCompletedForm(ctx, docId, file));
    done(caseId);
    return { message: "Completed form attached." };
  }, fd);
}

export async function generateSuggestionsAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const n = await run(actor, (ctx) => generateSuggestions(ctx, docId));
    done(caseId);
    return { message: n ? `${n} draft ${n === 1 ? "suggestion" : "suggestions"} added for your review.` : "No suggestions with record citations were produced." };
  }, fd);
}

export async function decideSuggestionAction(caseId: string, docId: string, suggestionId: string, accept: boolean, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => decideSuggestion(ctx, suggestionId, accept));
    done(caseId);
    return { message: accept ? "Accepted into a new draft version you can edit." : "Suggestion dismissed." };
  }, fd);
}

export async function readyForSignatureAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => markReadyForSignature(ctx, docId));
    done(caseId);
    return { message: "Ready for signature." };
  }, fd);
}

export async function signDocumentAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const f = formFields(fd);
    if (!f.confirm) return { ok: false, error: "Confirm the attestation to sign.", fieldErrors: { confirm: "Check this box to sign." } };
    await run(actor, (ctx) => signDocument(ctx, docId, f.attestation ?? ""));
    done(caseId);
    return { message: "Document signed." };
  }, fd);
}

export async function deliverAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => deliverToPatient(ctx, docId));
    done(caseId);
    return { message: "Delivered to the patient portal." };
  }, fd);
}

export async function voidDocumentAction(caseId: string, docId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => voidDocument(ctx, docId));
    done(caseId);
    return { message: "Document voided." };
  }, fd);
}

// ---- Appointments, messages, notes, payments -------------------------------------------

export async function completeAppointmentAction(caseId: string, appointmentId: string, outcome: "completed" | "no_show", _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => completeAppointment(ctx, appointmentId, outcome));
    done(caseId);
    return { message: outcome === "completed" ? "Appointment marked completed." : "Marked as no-show." };
  }, fd);
}

export async function cancelAppointmentAction(caseId: string, appointmentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const reason = String(fd.get("reason") ?? "").trim();
    if (!reason) return { ok: false, error: "Add a short reason.", fieldErrors: { reason: "Add a short reason." } };
    await run(actor, (ctx) => cancelAppointment(ctx, appointmentId, reason));
    done(caseId);
    return { message: "Appointment cancelled. The patient has been asked to choose a new time." };
  }, fd);
}

export async function bookAppointmentAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const startsAt = String(fd.get("startsAt") ?? "");
    if (!startsAt) return { ok: false, error: "Choose a time.", fieldErrors: { startsAt: "Choose a time." } };
    await run(actor, (ctx) => bookAppointment(ctx, caseId, startsAt));
    done(caseId);
    return { message: "Appointment booked." };
  }, fd);
}

export async function sendMessageAction(caseId: string, category: "clinical" | "administrative", _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    await run(actor, (ctx) => sendMessage(ctx, caseId, category, String(fd.get("body") ?? "")));
    done(caseId);
    return { message: "Message sent." };
  }, fd);
}

export async function addNoteAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const visibility = fd.get("visibility") === "clinical" ? "clinical" : "operational";
    await run(actor, (ctx) => addCaseNote(ctx, caseId, visibility, String(fd.get("body") ?? "")));
    done(caseId);
    return { message: "Note added." };
  }, fd);
}

const TRIGGERS: readonly RefundTrigger[] = ["before_intake_submitted", "after_intake_before_review", "clinician_out_of_scope", "emergency_routed", "no_show", "late_cancel", "after_determination"];

export async function requestRefundAction(caseId: string, paymentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const actor = await staff();
    const trigger = String(fd.get("trigger") ?? "") as RefundTrigger;
    if (!TRIGGERS.includes(trigger)) throw invalid("Choose the refund reason.");
    const dollars = Number.parseFloat(String(fd.get("amount") ?? "").replace(/[$,\s]/g, ""));
    if (!Number.isFinite(dollars) || dollars <= 0) return { ok: false, error: "Enter a refund amount.", fieldErrors: { amount: "Enter an amount in dollars, for example 275 or 137.50." } };
    const amountCents = Math.round(dollars * 100);
    const res = await run(actor, async (ctx) => {
      await loadCase(ctx, caseId, "operational");
      const sec = await getSetting(ctx.tx, "security");
      return requestRefund(ctx, paymentId, { trigger, amountCents, stepUpMinutes: sec.stepUpMinutes });
    });
    done(caseId);
    revalidatePath("/ops/billing");
    return { message: res.withinPolicy ? "Refund processed within policy." : "Refund is above the policy amount and is waiting for a second approver." };
  }, fd);
}
