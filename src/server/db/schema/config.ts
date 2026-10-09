import { boolean, date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { clinicians, createdAt, ts, updatedAt, users } from "./identity";
import type { ConsentStage, DocumentationType, OrgKind, ReviewTag } from "@/domain/constants";

/** Jurisdictions start inactive. Only an authorized admin can activate one, with review evidence. */
export const jurisdictions = pgTable("jurisdictions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").$type<"state" | "district" | "territory">().notNull().default("state"),
  isActive: boolean("is_active").notNull().default(false),
  telehealthAuthorized: boolean("telehealth_authorized").notNull().default(false),
  requiredDisclosures: text("required_disclosures"),
  specialRestrictions: text("special_restrictions"),
  complianceNotes: text("compliance_notes"),
  lastReviewOn: date("last_review_on"),
  nextReviewDueOn: date("next_review_due_on"),
  activatedBy: uuid("activated_by").references(() => users.id),
  activatedAt: ts("activated_at"),
  updatedAt: updatedAt(),
});

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
    jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
    licenseType: text("license_type").notNull(),
    licenseNumber: text("license_number").notNull(),
    issuedOn: date("issued_on"),
    expiresOn: date("expires_on").notNull(),
    status: text("status").$type<"active" | "expired" | "suspended" | "inactive">().notNull().default("active"),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: ts("verified_at"),
    verificationSource: text("verification_source"),
    createdAt: createdAt(),
  },
  (t) => [index("licenses_lookup_idx").on(t.clinicianId, t.jurisdictionCode, t.expiresOn)],
);

export const compactPrivileges = pgTable("compact_privileges", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
  compact: text("compact").$type<"counseling" | "psypact" | "social_work" | "nurse" | "other">().notNull(),
  homeLicenseId: uuid("home_license_id").references(() => licenses.id),
  remoteJurisdictionCode: text("remote_jurisdiction_code").notNull().references(() => jurisdictions.code),
  privilegeIdentifier: text("privilege_identifier"),
  effectiveOn: date("effective_on").notNull(),
  expiresOn: date("expires_on").notNull(),
  status: text("status").$type<"active" | "expired" | "suspended" | "inactive">().notNull().default("active"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: ts("verified_at"),
  createdAt: createdAt(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  documentationType: text("documentation_type").$type<DocumentationType>().notNull(),
  enabled: boolean("enabled").notNull().default(false),
  requiresSession: boolean("requires_session").notNull().default(true),
  requiresIdentityVerification: boolean("requires_identity_verification").notNull().default(true),
  requiresEmployerForm: boolean("requires_employer_form").notNull().default(false),
  sessionMinutes: integer("session_minutes").notNull().default(50),
  minAge: integer("min_age").notNull().default(18),
  displayOrder: integer("display_order").notNull().default(0),
  reviewTag: text("review_tag").$type<ReviewTag>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id").notNull().references(() => services.id),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    payerType: text("payer_type").$type<"self_pay" | "employer" | "insurance">().notNull().default("self_pay"),
    effectiveFrom: ts("effective_from").notNull().defaultNow(),
    effectiveTo: ts("effective_to"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("prices_service_idx").on(t.serviceId, t.effectiveFrom)],
);

/** Clinician × service × jurisdiction. Created only by an admin; never inferred. */
export const serviceAuthorizations = pgTable(
  "service_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
    serviceId: uuid("service_id").notNull().references(() => services.id),
    jurisdictionCode: text("jurisdiction_code").notNull().references(() => jurisdictions.code),
    basis: text("basis").$type<"license" | "compact_privilege">().notNull(),
    licenseId: uuid("license_id").references(() => licenses.id),
    compactPrivilegeId: uuid("compact_privilege_id").references(() => compactPrivileges.id),
    effectiveOn: date("effective_on").notNull(),
    endsOn: date("ends_on"),
    status: text("status").$type<"active" | "suspended" | "ended">().notNull().default("active"),
    authorizedBy: uuid("authorized_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("service_auth_lookup_idx").on(t.jurisdictionCode, t.serviceId, t.status)],
);

export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicianId: uuid("clinician_id").notNull().references(() => clinicians.id),
  weekday: integer("weekday").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  timeZone: text("time_zone").notNull(),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  createdAt: createdAt(),
});

/** Runtime overrides for typed configuration defaults in src/config. Zod-validated on write. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  reviewTag: text("review_tag").$type<ReviewTag>(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});

export const consentDocuments = pgTable("consent_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  requiredBefore: text("required_before").$type<ConsentStage>().notNull(),
  jurisdictionCode: text("jurisdiction_code").references(() => jurisdictions.code),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const consentVersions = pgTable(
  "consent_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => consentDocuments.id),
    version: integer("version").notNull(),
    bodyMd: text("body_md").notNull(),
    bodyHash: text("body_hash").notNull(),
    status: text("status").$type<"draft" | "published" | "retired">().notNull().default("draft"),
    reviewTag: text("review_tag").$type<ReviewTag>(),
    effectiveFrom: ts("effective_from"),
    publishedBy: uuid("published_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("consent_versions_doc_version_key").on(t.documentId, t.version)],
);

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").$type<"faq" | "page_section" | "disclosure" | "crisis" | "legal" | "resource" | "state">().notNull(),
    key: text("key").notNull().unique(),
    category: text("category"),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull(),
    status: text("status").$type<"draft" | "published" | "retired">().notNull().default("draft"),
    reviewTag: text("review_tag").$type<ReviewTag>(),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: updatedAt(),
  },
  (t) => [index("content_kind_idx").on(t.kind, t.status, t.sortOrder)],
);

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    channel: text("channel").$type<"email" | "sms" | "in_app">().notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    active: boolean("active").notNull().default(true),
    reviewTag: text("review_tag").$type<ReviewTag>(),
    updatedBy: uuid("updated_by").references(() => users.id),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("notification_templates_key").on(t.key, t.channel)],
);

/** Versioned questionnaires: intake templates and validated measures. */
export const questionnaires = pgTable(
  "questionnaires",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").$type<"intake" | "measure">().notNull(),
    key: text("key").notNull(),
    version: integer("version").notNull(),
    definition: jsonb("definition").notNull(),
    status: text("status").$type<"draft" | "published" | "retired">().notNull().default("draft"),
    enabled: boolean("enabled").notNull().default(true),
    reviewTag: text("review_tag").$type<ReviewTag>(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("questionnaires_key_version").on(t.key, t.version)],
);

export const screeningRulesets = pgTable("screening_rulesets", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: integer("version").notNull().unique(),
  definition: jsonb("definition").notNull(),
  status: text("status").$type<"draft" | "published" | "retired">().notNull().default("draft"),
  reviewTag: text("review_tag").$type<ReviewTag>(),
  publishedBy: uuid("published_by").references(() => users.id),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
});

export const complianceReviews = pgTable("compliance_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  reviewType: text("review_type").$type<"legal" | "clinical" | "state_rule" | "security" | "owner">().notNull(),
  reviewerName: text("reviewer_name").notNull(),
  outcome: text("outcome").$type<"approved" | "changes_requested">().notNull(),
  notes: text("notes"),
  reviewedOn: date("reviewed_on").notNull(),
  nextDueOn: date("next_due_on"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: createdAt(),
});

/** Employer / referral organizations. Never linked to clinical data beyond an opaque referral id on a case. */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: text("kind").$type<OrgKind>().notNull(),
    referralCode: text("referral_code").notNull(),
    landingHeadline: text("landing_headline"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organizations_referral_code").on(sql`lower(${t.referralCode})`)],
);
