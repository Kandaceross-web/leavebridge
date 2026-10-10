import { check, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinicians, createdAt, ts, updatedAt, users } from "./identity";
import { cases, documents, files } from "./cases";

/**
 * Same-Day Mental Health Assessment (automated screening), work excuse letter requests, the
 * registry of verifiable issued documents, and email verification tokens. See docs/DATABASE.md.
 */

/** Single-use email verification tokens. Only the token's HMAC is stored. */
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: createdAt(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
  },
  (t) => [index("email_verification_tokens_user_idx").on(t.userId)],
);

export type AutomatedScreeningStatus = "awaiting_payment" | "in_progress" | "held_for_review" | "issued" | "closed";

/** One automated screening per same-day case. Item answers live in measure_responses. */
export const automatedScreenings = pgTable(
  "automated_screenings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .unique()
      .references(() => cases.id),
    status: text("status").$type<AutomatedScreeningStatus>().notNull().default("awaiting_payment"),
    /** Instruments the patient chose: phq9, gad7 or both. */
    instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
    /** Encrypted JSON: symptom, work-functioning and missed-work answers. */
    functioning: text("functioning"),
    /** SHA-256 of the pre-payment acknowledgement text the patient accepted, and when. */
    acknowledgementHash: text("acknowledgement_hash"),
    acknowledgedAt: ts("acknowledged_at"),
    /** Rule codes that held the record for clinician review (e.g. PHQ9_ITEM9, SAFETY_NOW). Never shown publicly. */
    holdReasons: text("hold_reasons").array().notNull().default(sql`'{}'::text[]`),
    /** Encrypted JSON of the rule-based summary exactly as issued. */
    summary: text("summary"),
    summaryHash: text("summary_hash"),
    completedAt: ts("completed_at"),
    /** Clinician review of a held record. */
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: ts("reviewed_at"),
    /** Encrypted clinician note. */
    reviewNote: text("review_note"),
    /** A held screening's payment is flagged for the owner's refund decision; never refunded automatically. */
    refundReview: text("refund_review").$type<"none" | "flagged" | "resolved">().notNull().default("none"),
    /** The patient asked to be contacted about scheduling a full assessment (opt-in, after the record is issued). */
    followUpRequestedAt: ts("follow_up_requested_at"),
    /** Staff recorded that they reached out about that request. */
    followUpHandledAt: ts("follow_up_handled_at"),
    followUpHandledBy: uuid("follow_up_handled_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("automated_screenings_status_idx").on(t.status),
    check("automated_screenings_status_valid", sql`${t.status} in ('awaiting_payment','in_progress','held_for_review','issued','closed')`),
  ],
);

export type IssuedDocumentKind = "automated_screening_record" | "work_excuse_letter";

/**
 * Registry of issued, digitally signed documents. `publicId` is the non-guessable document number
 * printed on the PDF and in its QR code. Rows are never deleted; only revocation fields change
 * (database trigger). One document per source: a screening issues one record, a letter request one letter.
 */
export const issuedDocuments = pgTable(
  "issued_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    kind: text("kind").$type<IssuedDocumentKind>().notNull(),
    /** automated_screenings.id or work_excuse_requests.id. */
    sourceId: uuid("source_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id),
    /** SHA-256 of the exact signed PDF bytes stored. */
    sha256: text("sha256").notNull(),
    /** SHA-256 fingerprint of the signing certificate. */
    signingCertFingerprint: text("signing_cert_fingerprint").notNull(),
    issuedAt: ts("issued_at").notNull(),
    issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
    issuerClinicianId: uuid("issuer_clinician_id").references(() => clinicians.id),
    issuerPractice: text("issuer_practice").notNull(),
    /**
     * Letters only: what the public verification page shows so a recipient can spot an edited copy
     * (patient initials and the excused dates). Fixed at issue, never changed (database-guarded).
     */
    publicDetail: text("public_detail").array(),
    status: text("status").$type<"valid" | "revoked">().notNull().default("valid"),
    revokedAt: ts("revoked_at"),
    revokedBy: uuid("revoked_by").references(() => users.id),
    /** Encrypted: may contain clinical context, never shown on the public page. */
    revocationReason: text("revocation_reason"),
  },
  (t) => [
    uniqueIndex("issued_documents_source_key").on(t.kind, t.sourceId),
    index("issued_documents_case_idx").on(t.caseId),
    check("issued_documents_kind_valid", sql`${t.kind} in ('automated_screening_record','work_excuse_letter')`),
    check("issued_documents_letter_has_clinician", sql`${t.kind} <> 'work_excuse_letter' or ${t.issuerClinicianId} is not null`),
    check("issued_documents_revocation_complete", sql`${t.status} = 'valid' or (${t.revokedAt} is not null and ${t.revokedBy} is not null and ${t.revocationReason} is not null)`),
  ],
);

export type WorkExcuseStatus = "requested" | "approved" | "declined" | "cancelled";

/**
 * A clinician-reviewed work excuse letter request. At most one per automated screening (unique),
 * so an existing screening cannot generate additional letters.
 */
export const workExcuseRequests = pgTable(
  "work_excuse_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    automatedScreeningId: uuid("automated_screening_id")
      .notNull()
      .unique()
      .references(() => automatedScreenings.id),
    status: text("status").$type<WorkExcuseStatus>().notNull().default("requested"),
    /** Encrypted JSON of what the patient asked for (dates, note to the clinician). */
    patientInput: text("patient_input").notNull(),
    /** Encrypted JSON of the system-prepared proposed letter (a starting point; never signable as is). */
    proposedDraft: text("proposed_draft").notNull(),
    /** The clinician's own document (versions and signature) once they start editing. */
    documentId: uuid("document_id").references(() => documents.id),
    decidedBy: uuid("decided_by").references(() => users.id),
    decidedAt: ts("decided_at"),
    /** Encrypted message to the patient when declined. */
    declineMessage: text("decline_message"),
    /** Whether the clinician recommended a full clinician-led assessment instead. */
    recommendAssessment: text("recommend_assessment").$type<"no" | "yes">().notNull().default("no"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("work_excuse_requests_status_idx").on(t.status, t.createdAt),
    check("work_excuse_requests_status_valid", sql`${t.status} in ('requested','approved','declined','cancelled')`),
  ],
);
