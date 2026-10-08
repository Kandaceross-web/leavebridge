import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { IdvStatus, Role } from "@/domain/constants";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
export const createdAt = () => ts("created_at").notNull().defaultNow();
export const updatedAt = () => ts("updated_at").notNull().defaultNow();
export { ts };

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").$type<"active" | "locked" | "disabled">().notNull().default("active"),
    emailVerifiedAt: ts("email_verified_at"),
    /** Encrypted TOTP secret (application-layer AES-GCM). */
    mfaTotpSecret: text("mfa_totp_secret"),
    mfaEnabledAt: ts("mfa_enabled_at"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    isFixture: boolean("is_fixture").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_key").on(sql`lower(${t.email})`)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: text("role").$type<Role>().notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: createdAt(),
    revokedAt: ts("revoked_at"),
    revokedBy: uuid("revoked_by").references(() => users.id),
  },
  (t) => [
    uniqueIndex("user_roles_active_key").on(t.userId, t.role).where(sql`${t.revokedAt} is null`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the opaque cookie token. The token itself is never stored. */
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    createdAt: createdAt(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    idleTimeoutSeconds: integer("idle_timeout_seconds").notNull(),
    mfaVerifiedAt: ts("mfa_verified_at"),
    stepUpAt: ts("step_up_at"),
    ipHash: text("ip_hash"),
    revokedAt: ts("revoked_at"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  legalFirstName: text("legal_first_name").notNull(),
  legalLastName: text("legal_last_name").notNull(),
  preferredName: text("preferred_name"),
  /** Encrypted ISO date. */
  dateOfBirth: text("date_of_birth"),
  phone: text("phone"),
  timeZone: text("time_zone").notNull().default("America/Chicago"),
  /** Encrypted JSON. */
  address: text("address"),
  /** Encrypted JSON. */
  emergencyContact: text("emergency_contact"),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  smsConsentAt: ts("sms_consent_at"),
  ageAttestedAt: ts("age_attested_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const clinicians = pgTable("clinicians", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  credentials: text("credentials").notNull(),
  degree: text("degree"),
  npi: text("npi"),
  bio: text("bio"),
  publicProfile: boolean("public_profile").notNull().default(false),
  malpracticeCarrier: text("malpractice_carrier"),
  malpracticeExpiresOn: date("malpractice_expires_on"),
  status: text("status").$type<"onboarding" | "active" | "inactive">().notNull().default("onboarding"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const identityVerifications = pgTable(
  "identity_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id").notNull().references(() => patients.id),
    method: text("method").$type<"document_review" | "vendor">().notNull().default("document_review"),
    status: text("status").$type<IdvStatus>().notNull().default("pending"),
    fileId: uuid("file_id"),
    vendorRef: text("vendor_ref"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: ts("reviewed_at"),
    /** Encrypted reviewer note. */
    reviewNote: text("review_note"),
    createdAt: createdAt(),
  },
  (t) => [index("idv_patient_idx").on(t.patientId)],
);

export const accessGrants = pgTable("access_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  granteeUserId: uuid("grantee_user_id").notNull().references(() => users.id),
  caseId: uuid("case_id"),
  reason: text("reason").notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  startsAt: ts("starts_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at"),
  createdAt: createdAt(),
});
