import type { DocumentKind } from "@/domain/constants";

/**
 * Documentation templates (v1 drafts, CLN-14). Fields marked `fromRecord` are pre-filled only from
 * record data that already exists, showing their source; everything clinical is written or
 * accepted by the clinician. Nothing here states a legal conclusion.
 */
export interface TemplateField {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date";
  required: boolean;
  /** Record path used for pre-fill; shown to the clinician as the source. */
  fromRecord?: "patient.name" | "patient.dob" | "case.leaveType" | "intake.job_title" | "intake.essential_functions" | "case.reference";
  /** Whether AI drafting may propose text for this field (CLN-06). */
  aiAllowed: boolean;
  help?: string;
}

export interface DocumentTemplate {
  kind: DocumentKind;
  title: string;
  description: string;
  requiresAttachment: boolean;
  fields: TemplateField[];
}

const base: TemplateField[] = [
  { key: "patient_name", label: "Patient name", kind: "text", required: true, fromRecord: "patient.name", aiAllowed: false },
  { key: "patient_dob", label: "Date of birth", kind: "date", required: true, fromRecord: "patient.dob", aiAllowed: false },
  { key: "job_title", label: "Job title", kind: "text", required: false, fromRecord: "intake.job_title", aiAllowed: false },
];

const clinicianStatement: TemplateField = {
  key: "clinician_statement",
  label: "Clinician statement",
  kind: "textarea",
  required: true,
  aiAllowed: false,
  help: "Your own statement of the clinical basis. Not AI-assisted.",
};

export const DOCUMENT_TEMPLATES: Record<DocumentKind, DocumentTemplate> = {
  continuous_leave: {
    kind: "continuous_leave",
    title: "Continuous leave documentation",
    description: "A period of incapacity during which the patient is unable to work.",
    requiresAttachment: false,
    fields: [
      ...base,
      { key: "condition_onset", label: "Approximate onset of condition", kind: "date", required: false, aiAllowed: false },
      { key: "incapacity_start", label: "Incapacity begins", kind: "date", required: true, aiAllowed: false },
      { key: "incapacity_end", label: "Estimated end of incapacity", kind: "date", required: true, aiAllowed: false },
      { key: "functional_limitations", label: "Functional limitations relevant to work", kind: "textarea", required: true, aiAllowed: true },
      { key: "treatment_plan", label: "Treatment plan or recommendations", kind: "textarea", required: false, aiAllowed: true },
      clinicianStatement,
    ],
  },
  intermittent_leave: {
    kind: "intermittent_leave",
    title: "Intermittent leave documentation",
    description: "Episodic absences or flare-ups, with estimated frequency and duration.",
    requiresAttachment: false,
    fields: [
      ...base,
      { key: "episode_frequency", label: "Estimated frequency of episodes", kind: "text", required: true, aiAllowed: false, help: "For example: up to 2 times per month." },
      { key: "episode_duration", label: "Estimated duration per episode", kind: "text", required: true, aiAllowed: false },
      { key: "period_start", label: "Period begins", kind: "date", required: true, aiAllowed: false },
      { key: "period_end", label: "Period ends (estimate)", kind: "date", required: true, aiAllowed: false },
      { key: "functional_limitations", label: "Functional limitations during episodes", kind: "textarea", required: true, aiAllowed: true },
      clinicianStatement,
    ],
  },
  reduced_schedule: {
    kind: "reduced_schedule",
    title: "Reduced schedule documentation",
    description: "A temporary reduction in hours per day or week.",
    requiresAttachment: false,
    fields: [
      ...base,
      { key: "schedule", label: "Recommended schedule (hours per day / days per week)", kind: "text", required: true, aiAllowed: false },
      { key: "period_start", label: "Period begins", kind: "date", required: true, aiAllowed: false },
      { key: "period_end", label: "Period ends (estimate)", kind: "date", required: true, aiAllowed: false },
      { key: "functional_limitations", label: "Functional limitations relevant to the schedule", kind: "textarea", required: true, aiAllowed: true },
      clinicianStatement,
    ],
  },
  employer_form_completion: {
    kind: "employer_form_completion",
    title: "Employer / leave-administrator form",
    description: "The patient's uploaded form, completed by the clinician and attached as a PDF.",
    requiresAttachment: true,
    fields: [
      ...base,
      { key: "form_summary", label: "Summary of what was completed", kind: "textarea", required: true, aiAllowed: false },
      clinicianStatement,
    ],
  },
  return_to_work: {
    kind: "return_to_work",
    title: "Return-to-work note",
    description: "Only where clinically and legally appropriate (pending CLN/LEG review).",
    requiresAttachment: false,
    fields: [...base, { key: "return_date", label: "Return date", kind: "date", required: true, aiAllowed: false }, { key: "restrictions", label: "Restrictions, if any", kind: "textarea", required: false, aiAllowed: false }, clinicianStatement],
  },
  determination_letter: {
    kind: "determination_letter",
    title: "Assessment summary letter",
    description: "A letter summarizing the clinician's determination for the patient.",
    requiresAttachment: false,
    fields: [...base, { key: "summary", label: "Summary", kind: "textarea", required: true, aiAllowed: false }, clinicianStatement],
  },
};

export const DOCUMENT_DISCLAIMER =
  "This document reflects the independent clinical judgment of the signing clinician. Eligibility for leave and any leave decision are determined by the employer, insurer or leave administrator.";
