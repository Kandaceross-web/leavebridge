import type { CaseStatus, OpsStage } from "../constants";
import { conflict } from "../errors";

/**
 * Case lifecycle. Transitions are a whitelist; anything else is rejected. Patient-facing labels
 * are neutral: nothing says "approved", "qualified" or "certified".
 */
const TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  started: ["intake_incomplete", "cancelled", "safety_hold"],
  intake_incomplete: ["awaiting_documents", "submitted", "cancelled", "safety_hold"],
  awaiting_documents: ["submitted", "intake_incomplete", "cancelled", "safety_hold"],
  submitted: ["clinical_review", "cancelled", "safety_hold"],
  clinical_review: ["info_requested", "appointment_needed", "provider_review", "provider_signature", "completed", "safety_hold", "cancelled"],
  info_requested: ["clinical_review", "safety_hold", "cancelled"],
  appointment_needed: ["appointment_scheduled", "clinical_review", "safety_hold", "cancelled"],
  appointment_scheduled: ["provider_review", "appointment_needed", "safety_hold", "cancelled"],
  provider_review: ["provider_signature", "info_requested", "appointment_needed", "completed", "safety_hold"],
  provider_signature: ["completed", "provider_review", "safety_hold"],
  completed: ["delivered", "closed", "provider_review"],
  delivered: ["closed"],
  closed: [],
  cancelled: [],
  safety_hold: ["clinical_review", "cancelled", "closed"],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: CaseStatus, to: CaseStatus) {
  if (!canTransition(from, to)) throw conflict("This case cannot move to that step right now.");
}

export const TERMINAL_STATUSES: readonly CaseStatus[] = ["closed", "cancelled"];
export const isOpen = (s: CaseStatus) => !TERMINAL_STATUSES.includes(s);

export interface PatientStatusView {
  label: string;
  /** One-line explanation shown under the label. */
  explainer: string;
  tone: "neutral" | "info" | "progress" | "action" | "done" | "alert";
}

export const PATIENT_STATUS: Record<CaseStatus, PatientStatusView> = {
  started: { label: "Getting started", explainer: "Finish the steps below to submit your request.", tone: "action" },
  intake_incomplete: { label: "Intake incomplete", explainer: "Your secure intake has a few steps left.", tone: "action" },
  awaiting_documents: { label: "Awaiting documents", explainer: "Upload the forms listed below so the clinician can review them.", tone: "action" },
  submitted: { label: "Submitted", explainer: "We received everything. A clinician will begin review.", tone: "info" },
  clinical_review: { label: "Under clinical review", explainer: "A licensed clinician is reviewing your information.", tone: "progress" },
  info_requested: { label: "Additional information needed", explainer: "Your clinician asked for something more. See your tasks.", tone: "action" },
  appointment_needed: { label: "Appointment needed", explainer: "Your clinician would like to meet by video. Choose a time.", tone: "action" },
  appointment_scheduled: { label: "Appointment scheduled", explainer: "Your telehealth assessment is booked.", tone: "info" },
  provider_review: { label: "Provider review", explainer: "Your clinician is completing their review.", tone: "progress" },
  provider_signature: { label: "Provider signature", explainer: "Documentation is being finalized for the clinician's signature.", tone: "progress" },
  completed: {
    label: "Completed",
    explainer: "Your clinician has completed their review. Any decision about leave is made by your employer or leave administrator.",
    tone: "done",
  },
  delivered: { label: "Delivered", explainer: "Your documents are ready in your portal.", tone: "done" },
  closed: { label: "Closed", explainer: "This case is closed. Your records remain available.", tone: "neutral" },
  cancelled: { label: "Cancelled", explainer: "This request was cancelled.", tone: "neutral" },
  safety_hold: {
    label: "On hold",
    explainer: "Our clinical team needs to follow up with you. Please check your messages. If you are in danger, call or text 988 or call 911.",
    tone: "alert",
  },
};

/** The visible timeline. Statuses not relevant externally collapse into these milestones. */
export const PATIENT_TIMELINE: { key: string; label: string; statuses: readonly CaseStatus[] }[] = [
  { key: "start", label: "Request started", statuses: ["started"] },
  { key: "intake", label: "Intake and documents", statuses: ["intake_incomplete", "awaiting_documents"] },
  { key: "submitted", label: "Submitted", statuses: ["submitted"] },
  { key: "review", label: "Clinical review", statuses: ["clinical_review", "info_requested", "safety_hold"] },
  { key: "appointment", label: "Telehealth assessment", statuses: ["appointment_needed", "appointment_scheduled"] },
  { key: "provider", label: "Provider review and signature", statuses: ["provider_review", "provider_signature"] },
  { key: "complete", label: "Completed", statuses: ["completed"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered", "closed"] },
];

export function timelinePosition(status: CaseStatus): number {
  return PATIENT_TIMELINE.findIndex((m) => m.statuses.includes(status));
}

export const OPS_STAGE_OF: Record<CaseStatus, OpsStage | null> = {
  started: null,
  intake_incomplete: "awaiting_documents",
  awaiting_documents: "awaiting_documents",
  submitted: "new_requests",
  clinical_review: "clinical_review",
  info_requested: "awaiting_documents",
  appointment_needed: "appointment_needed",
  appointment_scheduled: "appointment_needed",
  provider_review: "clinical_review",
  provider_signature: "provider_signature",
  completed: "completed",
  delivered: "delivered",
  closed: null,
  cancelled: null,
  safety_hold: "clinical_review",
};

export const OPS_STAGE_LABEL: Record<OpsStage, string> = {
  new_requests: "New requests",
  awaiting_documents: "Awaiting documents",
  appointment_needed: "Appointment needed",
  clinical_review: "Clinical review",
  provider_signature: "Provider signature",
  completed: "Completed",
  delivered: "Delivered",
};

export const STATUS_STAFF_LABEL: Record<CaseStatus, string> = {
  started: "Started (unpaid)",
  intake_incomplete: "Intake incomplete",
  awaiting_documents: "Awaiting documents",
  submitted: "New request",
  clinical_review: "Clinical review",
  info_requested: "Info requested",
  appointment_needed: "Appointment needed",
  appointment_scheduled: "Appointment scheduled",
  provider_review: "Provider review",
  provider_signature: "Provider signature",
  completed: "Completed",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
  safety_hold: "Safety hold",
};
