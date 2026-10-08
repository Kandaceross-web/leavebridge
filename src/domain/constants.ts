/**
 * Shared vocabulary for the whole platform. Database columns, validation schemas and UI
 * labels all derive from these lists so a status or role is defined exactly once.
 */

export const ROLES = [
  "patient",
  "clinician",
  "clinical_director",
  "admin",
  "support",
  "billing",
  "compliance",
] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = [
  "clinician",
  "clinical_director",
  "admin",
  "support",
  "billing",
  "compliance",
];
export const CLINICAL_ROLES: readonly Role[] = ["clinician", "clinical_director"];

export const CASE_STATUSES = [
  "started",
  "intake_incomplete",
  "awaiting_documents",
  "submitted",
  "clinical_review",
  "info_requested",
  "appointment_needed",
  "appointment_scheduled",
  "provider_review",
  "provider_signature",
  "completed",
  "delivered",
  "closed",
  "cancelled",
  "safety_hold",
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const OPS_STAGES = [
  "new_requests",
  "awaiting_documents",
  "appointment_needed",
  "clinical_review",
  "provider_signature",
  "completed",
  "delivered",
] as const;
export type OpsStage = (typeof OPS_STAGES)[number];

export const SCREENING_OUTCOMES = ["AVAILABLE", "NEEDS_REVIEW", "NOT_AVAILABLE", "EMERGENCY"] as const;
export type ScreeningOutcome = (typeof SCREENING_OUTCOMES)[number];

/** The four clinician-only decisions. Software never selects one. */
export const DETERMINATION_DECISIONS = [
  "DOCUMENTATION_CLINICALLY_SUPPORTED",
  "ADDITIONAL_INFORMATION_REQUIRED",
  "DOCUMENTATION_NOT_CLINICALLY_SUPPORTED",
  "REFER_OUTSIDE_SCOPE",
] as const;
export type DeterminationDecision = (typeof DETERMINATION_DECISIONS)[number];

export const CLINICAL_REVIEW_OUTCOMES = [
  "session_required",
  "info_required",
  "ready_for_determination",
] as const;
export type ClinicalReviewOutcome = (typeof CLINICAL_REVIEW_OUTCOMES)[number];

export const LEAVE_TYPES = ["continuous", "intermittent", "reduced_schedule", "unsure"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const DOCUMENTATION_TYPES = [
  "initial",
  "recertification",
  "extension",
  "return_to_work",
] as const;
export type DocumentationType = (typeof DOCUMENTATION_TYPES)[number];

export const FILE_CATEGORIES = [
  "employer_form",
  "supporting",
  "identity",
  "generated",
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const SCAN_STATUSES = ["pending", "clean", "rejected"] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const DOCUMENT_KINDS = [
  "continuous_leave",
  "intermittent_leave",
  "reduced_schedule",
  "employer_form_completion",
  "return_to_work",
  "determination_letter",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_STATUSES = [
  "draft",
  "ready_for_signature",
  "signed",
  "delivered",
  "voided",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "booked",
  "completed",
  "cancelled_by_patient",
  "cancelled_by_clinician",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const CONSENT_STAGES = ["payment", "intake", "session", "release"] as const;
export type ConsentStage = (typeof CONSENT_STAGES)[number];

export const IDV_STATUSES = ["not_started", "pending", "verified", "rejected"] as const;
export type IdvStatus = (typeof IDV_STATUSES)[number];

export const REQUEST_KINDS = ["employer_form", "supporting_document", "identity", "information"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export const ORG_KINDS = [
  "private_employer",
  "public_employer",
  "correctional",
  "school",
  "healthcare",
  "other",
] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

/** Review tags mark content or configuration that a professional has not yet signed off. */
export const REVIEW_TAGS = [
  "OWNER_DECISION_REQUIRED",
  "LEGAL_REVIEW_REQUIRED",
  "CLINICAL_REVIEW_REQUIRED",
  "STATE_RULE_REQUIRED",
  "SECURITY_REVIEW_REQUIRED",
] as const;
export type ReviewTag = (typeof REVIEW_TAGS)[number];
