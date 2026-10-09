import { bigserial, boolean, check, date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinicians, createdAt, patients, ts, updatedAt, users } from "./identity";
import { consentVersions, jurisdictions, organizations, prices, questionnaires, screeningRulesets, services, serviceAuthorizations } from "./config";
import type { StoredAttribution } from "@/domain/attribution";
import type {
  AppointmentStatus,
  CaseStatus,
  ClinicalReviewOutcome,
  DeterminationDecision,
  DocumentKind,
  DocumentStatus,
  FileCategory,
  LeaveType,
  PaymentStatus,
  RequestKind,
  ScanStatus,
  ScreeningOutcome,
} from "@/domain/constants";

export const screenings = pgTable(
  "screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** HMAC of the anonymous cookie token. */
    tokenHash: text("token_hash").notNull().unique(),
    rulesetId: uuid("ruleset_id").notNull().references(() => screeningRulesets.id),
    /** Encrypted JSON of answers. */
    answers: text("answers"),
    stepIndex: integer("step_index").notNull().default(0),
    stateCode: text("state_code"),
    outcome: text("outcome").$type<ScreeningOutcome>(),
    reasonCodes: text("reason_codes").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").$type<"in_progress" | "completed" | "promoted" | "expired">().notNull().default("in_progress"),
    referralOrganizationId: uuid("referral_organization_id").references(() => organizations.id),
    /** First-party campaign attribution (src/domain/attribution.ts). Marketing data only; never sent to third parties. */
    attribution: jsonb("attribution").$type<StoredAttribution>(),
    patientId: uuid("patient_id").references(() => patients.id),
    createdAt: createdAt(),
    completedAt: ts("completed_at"),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("screenings_expiry_idx").on(t.status, t.expiresAt)],
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short non-PHI reference shown to patients and staff, e.g. LB-7K3Q9M. */
    reference: text("reference").notNull().unique(),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    serviceId: uuid("service_id").references(() => services.id),
    requestedLeaveType: text("requested_leave_type").$type<LeaveType>(),
    status: text("status").$type<CaseStatus>().notNull().default("started"),
    priority: text("priority").$type<"normal" | "urgent">().notNull().default("normal"),
    assignedClinicianId: uuid("assigned_clinician_id").references(() => clinicians.id),
    jurisdictionCode: text("jurisdiction_code").references(() => jurisdictions.code),
    screeningId: uuid("screening_id").references(() => screenings.id),
    /** NEEDS_REVIEW screenings must be cleared by a clinician before payment opens. */
    screeningReview: text("screening_review").$type<"none" | "pending" | "cleared" | "declined">().notNull().default("none"),
    referralOrganizationId: uuid("referral_organization_id").references(() => organizations.id),
    attribution: jsonb("attribution").$type<StoredAttribution>(),
    documentationDeadline: date("documentation_deadline"),
    /** Encrypted. */
    employerName: text("employer_name"),
    submittedAt: ts("submitted_at"),
    lastActivityAt: ts("last_activity_at").notNull().defaultNow(),
    closedAt: ts("closed_at"),
    closeReason: text("close_reason"),
    isFixture: boolean("is_fixture").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("cases_patient_idx").on(t.patientId),
    index("cases_status_idx").on(t.status, t.lastActivityAt),
    index("cases_clinician_idx").on(t.assignedClinicianId, t.status),
  ],
);

export const caseStatusHistory = pgTable(
  "case_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    fromStatus: text("from_status").$type<CaseStatus>(),
    toStatus: text("to_status").$type<CaseStatus>().notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("case_status_history_case_idx").on(t.caseId, t.createdAt)],
);

export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id),
  visibility: text("visibility").$type<"clinical" | "operational">().notNull(),
  /** Encrypted. */
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const safetyEvents = pgTable("safety_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").$type<"screening" | "intake" | "measure" | "message">().notNull(),
  screeningId: uuid("screening_id").references(() => screenings.id),
  caseId: uuid("case_id").references(() => cases.id),
  rule: text("rule").notNull(),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: ts("acknowledged_at"),
  /** Encrypted follow-up note. */
  followUpNote: text("follow_up_note"),
  createdAt: createdAt(),
});

export const locationAttestations = pgTable("location_attestations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  appointmentId: uuid("appointment_id"),
  stateCode: text("state_code").notNull(),
  context: text("context").$type<"verification" | "appointment_join">().notNull(),
  matchesAuthorization: boolean("matches_authorization").notNull(),
  createdAt: createdAt(),
});

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").references(() => cases.id),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    versionId: uuid("version_id").notNull().references(() => consentVersions.id),
    signerUserId: uuid("signer_user_id").notNull().references(() => users.id),
    typedName: text("typed_name").notNull(),
    bodyHash: text("body_hash").notNull(),
    authEvidence: jsonb("auth_evidence").notNull(),
    jurisdictionCode: text("jurisdiction_code"),
    signedAt: createdAt(),
    revokedAt: ts("revoked_at"),
  },
  (t) => [index("consents_case_idx").on(t.caseId)],
);

export const intakes = pgTable("intakes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().unique().references(() => cases.id),
  questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id),
  /** Encrypted JSON of all answers. */
  answers: text("answers"),
  completedSections: text("completed_sections").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").$type<"in_progress" | "submitted">().notNull().default("in_progress"),
  submittedAt: ts("submitted_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const measureResponses = pgTable(
  "measure_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id),
    instrumentKey: text("instrument_key").notNull(),
    /** Encrypted JSON of item responses. */
    answers: text("answers").notNull(),
    totalScore: integer("total_score").notNull(),
    severityBand: text("severity_band").notNull(),
    safetyFlag: boolean("safety_flag").notNull().default(false),
    completedAt: createdAt(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [uniqueIndex("measure_responses_case_instrument").on(t.caseId, t.instrumentKey)],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").references(() => cases.id),
    patientId: uuid("patient_id").references(() => patients.id),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    category: text("category").$type<FileCategory>().notNull(),
    storageKey: text("storage_key").notNull(),
    sha256: text("sha256").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    scanStatus: text("scan_status").$type<ScanStatus>().notNull().default("pending"),
    scanDetail: text("scan_detail"),
    /** Encrypted original filename. */
    originalName: text("original_name").notNull(),
    documentRequestId: uuid("document_request_id"),
    createdAt: createdAt(),
  },
  (t) => [index("files_case_idx").on(t.caseId), index("files_sha_idx").on(t.patientId, t.sha256)],
);

export const documentRequests = pgTable("document_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  kind: text("kind").$type<RequestKind>().notNull(),
  /** Encrypted request text written by staff/clinician. */
  message: text("message").notNull(),
  status: text("status").$type<"open" | "fulfilled" | "cancelled">().notNull().default("open"),
  requestedBy: uuid("requested_by").notNull().references(() => users.id),
  /** Encrypted patient response, if the request is informational. */
  response: text("response"),
  createdAt: createdAt(),
  fulfilledAt: ts("fulfilled_at"),
});

export const employerForms = pgTable("employer_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  fileId: uuid("file_id").notNull().references(() => files.id),
  formKind: text("form_kind").$type<"wh_380_e" | "administrator_form" | "employer_form" | "disability_form" | "other" | "unknown">().notNull().default("unknown"),
  /** Pages that need clinician completion, e.g. [2,3]. */
  pagesRequiringCompletion: integer("pages_requiring_completion").array().notNull().default(sql`'{}'::int[]`),
  /** Encrypted JSON of extracted/mapped fields (machine output is marked as such). */
  extracted: text("extracted"),
  status: text("status").$type<"received" | "reviewed" | "completed">().notNull().default("received"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: ts("reviewed_at"),
  createdAt: createdAt(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
    serviceAuthorizationId: uuid("service_authorization_id").notNull().references(() => serviceAuthorizations.id),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    jurisdictionCode: text("jurisdiction_code").notNull(),
    status: text("status").$type<AppointmentStatus>().notNull().default("booked"),
    videoRef: text("video_ref"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("appointments_clinician_idx").on(t.clinicianId, t.startsAt), index("appointments_case_idx").on(t.caseId)],
);

export const clinicalReviews = pgTable("clinical_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
  outcome: text("outcome").$type<ClinicalReviewOutcome>().notNull(),
  /** Encrypted. */
  notes: text("notes"),
  createdAt: createdAt(),
});

export const assessmentNotes = pgTable("assessment_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
  /** Encrypted. Insert-only: each save is a revision. */
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const determinations = pgTable(
  "determinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
    decidedByUserId: uuid("decided_by_user_id").notNull().references(() => users.id),
    decision: text("decision").$type<DeterminationDecision>().notNull(),
    /** Encrypted, required. */
    rationale: text("rationale").notNull(),
    /** Encrypted, required. */
    findings: text("findings").notNull(),
    /** Clinician-approved message the patient sees. Encrypted. */
    patientMessage: text("patient_message").notNull(),
    stepUpAt: ts("step_up_at").notNull(),
    supersedesId: uuid("supersedes_id"),
    source: text("source").notNull().default("clinician"),
    createdAt: createdAt(),
  },
  (t) => [
    check("determinations_source_clinician", sql`${t.source} = 'clinician'`),
    check(
      "determinations_decision_valid",
      sql`${t.decision} in ('DOCUMENTATION_CLINICALLY_SUPPORTED','ADDITIONAL_INFORMATION_REQUIRED','DOCUMENTATION_NOT_CLINICALLY_SUPPORTED','REFER_OUTSIDE_SCOPE')`,
    ),
    index("determinations_case_idx").on(t.caseId, t.createdAt),
  ],
);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  kind: text("kind").$type<DocumentKind>().notNull(),
  title: text("title").notNull(),
  status: text("status").$type<DocumentStatus>().notNull().default("draft"),
  employerFormId: uuid("employer_form_id").references(() => employerForms.id),
  currentVersionId: uuid("current_version_id"),
  signedVersionId: uuid("signed_version_id"),
  /** Clinician-completed employer form (PDF) attached to this document, if any. */
  attachmentFileId: uuid("attachment_file_id").references(() => files.id),
  /** Rendered PDF of the signed version; the only file a patient can download for this document. */
  signedFileId: uuid("signed_file_id").references(() => files.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id),
    versionNo: integer("version_no").notNull(),
    /** Encrypted JSON: { fields: Record<string,string>, body: string }. */
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    origin: text("origin").$type<"clinician" | "ai_draft">().notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("document_versions_doc_no").on(t.documentId, t.versionNo)],
);

export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  fieldKey: text("field_key").notNull(),
  /** Encrypted. */
  text: text("text").notNull(),
  sourceRefs: jsonb("source_refs").notNull(),
  provider: text("provider").notNull(),
  acceptedBy: uuid("accepted_by").references(() => users.id),
  acceptedAt: ts("accepted_at"),
  rejectedAt: ts("rejected_at"),
  createdAt: createdAt(),
});

export const signatures = pgTable("signatures", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentVersionId: uuid("document_version_id").notNull().unique().references(() => documentVersions.id),
  signerUserId: uuid("signer_user_id").notNull().references(() => users.id),
  clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
  contentHash: text("content_hash").notNull(),
  attestation: text("attestation").notNull(),
  stepUpAt: ts("step_up_at").notNull(),
  signedAt: createdAt(),
});

export const releaseAuthorizations = pgTable("release_authorizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  patientId: uuid("patient_id").notNull().references(() => patients.id),
  consentId: uuid("consent_id").references(() => consents.id),
  recipientType: text("recipient_type").$type<"employer" | "hr" | "leave_administrator" | "tpa">().notNull(),
  recipientName: text("recipient_name").notNull(),
  /** Encrypted. */
  recipientContact: text("recipient_contact"),
  scope: text("scope").array().notNull(),
  expiresOn: date("expires_on").notNull(),
  revokedAt: ts("revoked_at"),
  createdAt: createdAt(),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  versionId: uuid("version_id").notNull().references(() => documentVersions.id),
  recipientType: text("recipient_type").$type<"patient" | "employer" | "hr" | "leave_administrator" | "tpa">().notNull(),
  releaseAuthorizationId: uuid("release_authorization_id").references(() => releaseAuthorizations.id),
  channel: text("channel").$type<"portal" | "secure_link">().notNull().default("portal"),
  deliveredBy: uuid("delivered_by").notNull().references(() => users.id),
  deliveredAt: createdAt(),
  firstAccessedAt: ts("first_accessed_at"),
  accessCount: integer("access_count").notNull().default(0),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    priceId: uuid("price_id").notNull().references(() => prices.id),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    provider: text("provider").notNull(),
    providerCheckoutRef: text("provider_checkout_ref"),
    providerPaymentRef: text("provider_payment_ref"),
    status: text("status").$type<PaymentStatus>().notNull().default("pending"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    paidAt: ts("paid_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_case_idx").on(t.caseId), uniqueIndex("payments_checkout_ref").on(t.providerCheckoutRef)],
);

/**
 * Written Good Faith Estimates (45 CFR 149.610, LEG-08). Append-only and part of the record:
 * a changed service or amount adds a new row, never edits an old one.
 */
export const goodFaithEstimates = pgTable(
  "good_faith_estimates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => cases.id),
    serviceId: uuid("service_id").notNull().references(() => services.id),
    priceId: uuid("price_id").notNull().references(() => prices.id),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    /** Encrypted JSON of the exact estimate shown (src/domain/payments/good-faith-estimate.ts). */
    content: text("content").notNull(),
    /** SHA-256 of the canonical plaintext content. */
    contentHash: text("content_hash").notNull(),
    issuedBy: uuid("issued_by").references(() => users.id),
    issuedAt: ts("issued_at").notNull().defaultNow(),
  },
  (t) => [index("good_faith_estimates_case_idx").on(t.caseId, t.issuedAt)],
);

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  amountCents: integer("amount_cents").notNull(),
  reasonCode: text("reason_code").notNull(),
  withinPolicy: boolean("within_policy").notNull(),
  requestedBy: uuid("requested_by").notNull().references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  providerRef: text("provider_ref"),
  status: text("status").$type<"requested" | "approved" | "processed" | "denied">().notNull().default("requested"),
  createdAt: createdAt(),
});

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  paymentId: uuid("payment_id").references(() => payments.id),
  createdAt: createdAt(),
});

export const messageThreads = pgTable("message_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => cases.id),
  category: text("category").$type<"clinical" | "administrative">().notNull(),
  lastMessageAt: ts("last_message_at").notNull().defaultNow(),
  createdAt: createdAt(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").notNull().references(() => messageThreads.id),
    senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
    /** Encrypted. */
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId, t.createdAt)],
);

export const messageReads = pgTable(
  "message_reads",
  {
    threadId: uuid("thread_id").notNull().references(() => messageThreads.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    lastReadAt: ts("last_read_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("message_reads_pk").on(t.threadId, t.userId)],
);

/** In-app notification center. Content is generic by construction; no PHI. */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    templateKey: text("template_key").notNull(),
    channel: text("channel").$type<"in_app" | "email" | "sms">().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    linkPath: text("link_path"),
    status: text("status").$type<"queued" | "sent" | "failed" | "suppressed">().notNull().default("queued"),
    readAt: ts("read_at"),
    sentAt: ts("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/** Append-only, hash-chained security audit log. References only, never PHI payloads. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: createdAt(),
    actorUserId: uuid("actor_user_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    caseId: uuid("case_id"),
    outcome: text("outcome").$type<"allowed" | "denied">().notNull().default("allowed"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    accessGrantId: uuid("access_grant_id"),
    metadata: jsonb("metadata").notNull().default({}),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [index("audit_case_idx").on(t.caseId, t.occurredAt), index("audit_actor_idx").on(t.actorUserId, t.occurredAt)],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  /** Encrypted: people sometimes include health details despite the warning. */
  message: text("message").notNull(),
  status: text("status").$type<"new" | "handled">().notNull().default("new"),
  attribution: jsonb("attribution").$type<StoredAttribution>(),
  createdAt: createdAt(),
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  stateCode: text("state_code").notNull(),
  createdAt: createdAt(),
});

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: ts("reset_at").notNull(),
});
