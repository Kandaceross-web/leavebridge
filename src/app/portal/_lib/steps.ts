import type { StepKey } from "@/domain/cases/checklist";
import type { CaseStatus, DocumentKind, LeaveType, RequestKind } from "@/domain/constants";

/** Where each checklist step lives in the portal. Ids only in paths, never PHI. */
const STEP_PATH: Record<StepKey, string> = {
  service: "service",
  identity: "verify",
  consents_payment: "consents/payment",
  payment: "checkout",
  consents_intake: "consents/intake",
  intake: "intake",
  measures: "measures",
  documents: "documents",
  submit: "documents#submit",
};

export const stepHref = (caseId: string, key: StepKey) => `/portal/cases/${caseId}/${STEP_PATH[key]}`;
export const caseHref = (caseId: string) => `/portal/cases/${caseId}`;
/** Where a case lives in the portal: same-day automated screenings have their own page. */
export const portalCaseHref = (c: { id: string; kind: string }) => (c.kind === "automated_screening" ? `/portal/screening/${c.id}` : caseHref(c.id));

export const PRE_SUBMISSION: readonly CaseStatus[] = ["started", "intake_incomplete", "awaiting_documents"];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  continuous: "Continuous leave (one block of time)",
  intermittent: "Intermittent leave (time off as needed)",
  reduced_schedule: "Reduced schedule (fewer hours)",
  unsure: "Not sure yet",
};

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  employer_form: "Employer or leave form",
  supporting_document: "Supporting document",
  identity: "Identity document",
  information: "Information",
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  continuous_leave: "Continuous leave documentation",
  intermittent_leave: "Intermittent leave documentation",
  reduced_schedule: "Reduced schedule documentation",
  employer_form_completion: "Completed employer or leave-administrator form",
  return_to_work: "Return-to-work note",
  determination_letter: "Assessment summary letter",
  work_excuse_letter: "Excuse letter",
};

/**
 * Patient-facing wording for a clinician's recorded decision. Neutral and descriptive: it says
 * what the clinician found, never that leave was granted. (Copy pending owner/clinical review.)
 */
export const DECISION_LABEL: Record<string, string> = {
  DOCUMENTATION_CLINICALLY_SUPPORTED: "Your clinician found that documentation is clinically supported",
  ADDITIONAL_INFORMATION_REQUIRED: "Your clinician needs more information",
  DOCUMENTATION_NOT_CLINICALLY_SUPPORTED: "Your clinician did not find documentation clinically supported at this time",
  REFER_OUTSIDE_SCOPE: "Your clinician recommends care outside this service",
};

export const RECIPIENT_TYPE_LABEL = {
  employer: "Employer",
  hr: "Human resources",
  leave_administrator: "Leave administrator",
  tpa: "Third-party administrator",
} as const;

/** Formats a slot's local date key and labels in the patient's time zone. */
export function zonedParts(at: Date, timeZone: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(at);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(at);
  return { day, key, time };
}
