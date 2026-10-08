import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import { cases, caseStatusHistory, patients, screenings, userRoles, users } from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, encrypt } from "../crypto";
import { DUMMY_HASH, hashPassword, passwordProblems, verifyPassword } from "../auth/password";
import { generateTotpSecret, verifyTotp } from "../auth/totp";
import { getSetting } from "../settings";
import { newCaseReference } from "./cases";
import { notifyUser } from "./notify";
import type { ScreeningRow } from "./screening";
import { DomainError, invalid } from "@/domain/errors";
import type { Answers } from "@/domain/screening/engine";
import { LEAVE_TYPES, type LeaveType } from "@/domain/constants";

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your legal first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your legal last name.").max(80),
  preferredName: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")).pipe(z.string().max(254)),
  password: z.string(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth."),
  timeZone: z.string().max(64).default("America/Chicago"),
  ageAttest: z.literal("on", { message: "Please confirm you are 18 or older." }),
  termsAccept: z.literal("on", { message: "Please accept the terms and privacy policy to continue." }),
});

function ageOn(dob: string, now = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number) as [number, number, number];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age--;
  return age;
}

/** Creates a case from a completed screening. Used for new accounts and returning patients. */
export async function promoteScreeningToCase(ctx: Ctx, screening: ScreeningRow, patientId: string): Promise<string> {
  if (screening.status !== "completed" || !screening.outcome || !["AVAILABLE", "NEEDS_REVIEW"].includes(screening.outcome)) {
    throw invalid("Please complete the availability questions first.");
  }
  const answers = decryptJson<Answers>(screening.answers, {});
  const leave = typeof answers["leave_type"] === "string" && (LEAVE_TYPES as readonly string[]).includes(answers["leave_type"]) ? (answers["leave_type"] as LeaveType) : "unsure";
  const deadline = typeof answers["deadline"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answers["deadline"]) ? answers["deadline"] : null;
  const [c] = await ctx.tx
    .insert(cases)
    .values({
      reference: newCaseReference(),
      patientId,
      requestedLeaveType: leave,
      jurisdictionCode: screening.stateCode,
      screeningId: screening.id,
      screeningReview: screening.outcome === "NEEDS_REVIEW" ? "pending" : "none",
      referralOrganizationId: screening.referralOrganizationId,
      documentationDeadline: deadline,
      priority: deadline ? "normal" : "normal",
    })
    .returning();
  await ctx.tx.insert(caseStatusHistory).values({ caseId: c!.id, fromStatus: null, toStatus: "started", actorUserId: ctx.actor.kind === "patient" ? ctx.actor.userId : null, reason: "created from screening" });
  await ctx.tx.update(screenings).set({ status: "promoted", patientId }).where(eq(screenings.id, screening.id));
  await audit(ctx, { action: "case.created", subjectType: "case", subjectId: c!.id, caseId: c!.id, metadata: { screeningOutcome: screening.outcome } });
  return c!.id;
}

/** Runs as the system actor (no patient exists yet). Returns the new user id and case id. */
export async function signUp(ctx: Ctx, input: z.infer<typeof signUpSchema>, screening: ScreeningRow) {
  const pwProblem = passwordProblems(input.password);
  if (pwProblem) throw invalid(pwProblem);
  if (ageOn(input.dateOfBirth) < 18) throw invalid("This service is for adults 18 and older.");
  const [existing] = await ctx.tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
  if (existing) throw invalid("We couldn't create an account with those details. If you already have an account, please sign in.");

  const [user] = await ctx.tx.insert(users).values({ email: input.email, passwordHash: await hashPassword(input.password) }).returning();
  await ctx.tx.insert(userRoles).values({ userId: user!.id, role: "patient" });
  const [patient] = await ctx.tx
    .insert(patients)
    .values({
      userId: user!.id,
      legalFirstName: input.firstName,
      legalLastName: input.lastName,
      preferredName: input.preferredName || null,
      dateOfBirth: encrypt(input.dateOfBirth),
      timeZone: input.timeZone,
      ageAttestedAt: new Date(),
    })
    .returning();
  const caseId = await promoteScreeningToCase(ctx, screening, patient!.id);
  await audit(ctx, { action: "auth.sign_up", subjectType: "user", subjectId: user!.id });
  await notifyUser(ctx, user!.id, "account_created", "/portal");
  return { userId: user!.id, caseId };
}

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().max(200),
});

/**
 * Verifies credentials with uniform timing and generic errors (no account enumeration).
 * Locks the account after repeated failures.
 */
export async function verifyCredentials(ctx: Ctx, email: string, password: string): Promise<{ userId: string }> {
  const sec = await getSetting(ctx.tx, "security");
  const [u] = await ctx.tx.select().from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  const ok = await verifyPassword(password, u?.passwordHash ?? DUMMY_HASH);
  const generic = new DomainError("unauthenticated", "That email and password combination didn't work.");
  if (!u) {
    await audit(ctx, { action: "auth.sign_in_failed", outcome: "denied", metadata: { reason: "unknown_account" } });
    throw generic;
  }
  if (u.status !== "active" || (u.lockedUntil && u.lockedUntil.getTime() > Date.now())) {
    await audit(ctx, { action: "auth.sign_in_failed", subjectType: "user", subjectId: u.id, outcome: "denied", metadata: { reason: "locked" } });
    throw new DomainError("unauthenticated", "This account is temporarily locked. Try again later or contact support.");
  }
  if (!ok) {
    const failures = u.failedLoginCount + 1;
    const lock = failures >= sec.maxFailedLogins;
    await ctx.tx
      .update(users)
      .set({ failedLoginCount: lock ? 0 : failures, lockedUntil: lock ? new Date(Date.now() + sec.lockoutMinutes * 60_000) : u.lockedUntil })
      .where(eq(users.id, u.id));
    await audit(ctx, { action: lock ? "auth.locked" : "auth.sign_in_failed", subjectType: "user", subjectId: u.id, outcome: "denied" });
    throw generic;
  }
  await ctx.tx.update(users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await audit(ctx, { action: "auth.sign_in", subjectType: "user", subjectId: u.id });
  return { userId: u.id };
}

export async function userMfaState(ctx: Ctx, userId: string) {
  const [u] = await ctx.tx.select({ enabled: users.mfaEnabledAt, secret: users.mfaTotpSecret, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return { enabled: Boolean(u?.enabled), hasPendingSecret: Boolean(u?.secret && !u.enabled), email: u?.email ?? "" };
}

/** Starts (or restarts) TOTP enrollment; returns the secret for the authenticator app. */
export async function beginTotpEnrollment(ctx: Ctx, userId: string): Promise<string> {
  const [u] = await ctx.tx.select({ enabled: users.mfaEnabledAt, secret: users.mfaTotpSecret }).from(users).where(eq(users.id, userId)).limit(1);
  if (u?.enabled) throw invalid("Two-step verification is already set up.");
  if (u?.secret) return decrypt(u.secret);
  const secret = generateTotpSecret();
  await ctx.tx.update(users).set({ mfaTotpSecret: encrypt(secret) }).where(and(eq(users.id, userId), isNull(users.mfaEnabledAt)));
  return secret;
}

export async function verifyTotpForUser(ctx: Ctx, userId: string, code: string): Promise<boolean> {
  const [u] = await ctx.tx.select({ enabled: users.mfaEnabledAt, secret: users.mfaTotpSecret }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.secret) return false;
  const ok = verifyTotp(decrypt(u.secret), code.replace(/\s/g, ""));
  if (!ok) {
    await audit(ctx, { action: "auth.sign_in_failed", subjectType: "user", subjectId: userId, outcome: "denied", metadata: { reason: "mfa" } });
    return false;
  }
  if (!u.enabled) {
    await ctx.tx.update(users).set({ mfaEnabledAt: new Date() }).where(eq(users.id, userId));
    await audit(ctx, { action: "auth.mfa_enrolled", subjectType: "user", subjectId: userId });
  } else {
    await audit(ctx, { action: "auth.mfa_verified", subjectType: "user", subjectId: userId });
  }
  return true;
}

export async function verifyStepUp(ctx: Ctx, userId: string, password: string): Promise<boolean> {
  const [u] = await ctx.tx.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  const ok = await verifyPassword(password, u?.hash ?? DUMMY_HASH);
  await audit(ctx, { action: "auth.step_up", subjectType: "user", subjectId: userId, outcome: ok ? "allowed" : "denied" });
  return ok;
}

export const profileSchema = z.object({
  preferredName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  timeZone: z.string().max(64),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
});

export async function updatePatientProfile(ctx: Ctx, input: z.infer<typeof profileSchema>) {
  if (ctx.actor.kind !== "patient") throw invalid("Only patients have a profile here.");
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, ctx.actor.patientId)).limit(1);
  if (input.smsNotifications && !input.phone) throw invalid("Add a mobile number to receive text notifications.");
  await ctx.tx
    .update(patients)
    .set({
      preferredName: input.preferredName || null,
      phone: input.phone || null,
      timeZone: input.timeZone,
      emailNotifications: input.emailNotifications,
      smsNotifications: input.smsNotifications,
      smsConsentAt: input.smsNotifications ? (p?.smsConsentAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, ctx.actor.patientId));
}

