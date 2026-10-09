import "server-only";
import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import {
  accessGrants,
  auditEvents,
  clinicians,
  compactPrivileges,
  complianceReviews,
  consentDocuments,
  consentVersions,
  contentEntries,
  jurisdictions,
  licenses,
  notificationTemplates,
  organizations,
  prices,
  questionnaires,
  screeningRulesets,
  serviceAuthorizations,
  services,
  userRoles,
  users,
} from "../db/schema";
import { audit } from "../audit";
import { sha256Hex } from "../crypto";
import { env } from "../env";
import { getSetting } from "../settings";
import { hashPassword, passwordProblems } from "../auth/password";
import { loadAuthorizations } from "./jurisdiction";
import { canServe } from "@/domain/jurisdiction/can-serve";
import { lintTemplate } from "@/domain/notifications/templates";
import { rulesetSchema } from "@/domain/screening/engine";
import { requireRole, requireStaffMfa, requireStepUp } from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { CLINICAL_ROLES, ROLES, STAFF_ROLES, type ReviewTag, type Role } from "@/domain/constants";

async function adminGate(ctx: Ctx, stepUp = false) {
  requireRole(ctx.actor, ["admin"]);
  requireStaffMfa(ctx.actor);
  if (stepUp) requireStepUp(ctx.actor, (await getSetting(ctx.tx, "security")).stepUpMinutes);
}

/** In production, content carrying an open review tag cannot be published. */
function assertPublishable(reviewTag: ReviewTag | null | undefined) {
  if (env.APP_ENV === "production" && reviewTag) throw conflict("This item still has an open review tag and cannot be published to production.");
}

// ---- Jurisdictions -------------------------------------------------------------------

export async function listJurisdictions(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const rows = await ctx.tx.select().from(jurisdictions).orderBy(jurisdictions.name);
  const auths = await ctx.tx.select({ code: serviceAuthorizations.jurisdictionCode, n: sql<number>`count(*)::int` }).from(serviceAuthorizations).where(eq(serviceAuthorizations.status, "active")).groupBy(serviceAuthorizations.jurisdictionCode);
  return rows.map((r) => ({ ...r, activeAuthorizations: auths.find((a) => a.code === r.code)?.n ?? 0 }));
}

export const jurisdictionConfigSchema = z.object({
  telehealthAuthorized: z.boolean(),
  requiredDisclosures: z.string().max(4000),
  specialRestrictions: z.string().max(4000),
  complianceNotes: z.string().max(4000),
  nextReviewDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

export async function updateJurisdiction(ctx: Ctx, code: string, input: z.infer<typeof jurisdictionConfigSchema>) {
  await adminGate(ctx);
  await ctx.tx
    .update(jurisdictions)
    .set({ telehealthAuthorized: input.telehealthAuthorized, requiredDisclosures: input.requiredDisclosures || null, specialRestrictions: input.specialRestrictions || null, complianceNotes: input.complianceNotes || null, nextReviewDueOn: input.nextReviewDueOn || null, updatedAt: new Date() })
    .where(eq(jurisdictions.code, code));
  await audit(ctx, { action: "config.updated", subjectType: "jurisdiction", subjectId: code });
}

/** Activation checklist. Activation is refused until every item passes. */
export async function activationChecklist(ctx: Ctx, code: string) {
  const [j] = await ctx.tx.select().from(jurisdictions).where(eq(jurisdictions.code, code)).limit(1);
  if (!j) throw notFound("State");
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const [review] = await ctx.tx
    .select()
    .from(complianceReviews)
    .where(and(eq(complianceReviews.subjectType, "jurisdiction"), eq(complianceReviews.subjectId, code), eq(complianceReviews.outcome, "approved"), gte(complianceReviews.reviewedOn, yearAgo)))
    .orderBy(desc(complianceReviews.reviewedOn))
    .limit(1);
  const auths = await loadAuthorizations(ctx.tx, { jurisdictionCode: code });
  const clinRows = auths.length ? await ctx.tx.select().from(clinicians) : [];
  const now = new Date();
  const servable = auths.filter((a) => {
    const c = clinRows.find((x) => x.id === a.clinicianId);
    return c && canServe({ jurisdiction: { code, isActive: true, telehealthAuthorized: j.telehealthAuthorized }, clinician: c, serviceId: a.serviceId, authorizations: [a], on: now }).ok;
  });
  const servableClinicians = [...new Set(servable.map((a) => clinRows.find((c) => c.id === a.clinicianId)!.displayName))];
  const items = [
    { key: "telehealth", label: "Telehealth authorized for this state", ok: j.telehealthAuthorized },
    { key: "review", label: "Approved compliance review within the last 12 months", ok: Boolean(review) },
    { key: "authorization", label: "At least one clinician with a valid license or privilege and service authorization", ok: servable.length > 0 },
  ];
  return { jurisdiction: j, items, ready: items.every((i) => i.ok), servableClinicians, review: review ?? null };
}

export async function setJurisdictionActive(ctx: Ctx, code: string, active: boolean) {
  await adminGate(ctx, true);
  if (active) {
    const check = await activationChecklist(ctx, code);
    if (!check.ready) throw invalid("This state can't be activated until every checklist item passes.");
  }
  await ctx.tx
    .update(jurisdictions)
    .set({ isActive: active, activatedBy: active ? (ctx.actor as { userId: string }).userId : null, activatedAt: active ? new Date() : null, updatedAt: new Date() })
    .where(eq(jurisdictions.code, code));
  await audit(ctx, { action: active ? "jurisdiction.activated" : "jurisdiction.deactivated", subjectType: "jurisdiction", subjectId: code });
}

export const complianceReviewSchema = z.object({
  subjectType: z.enum(["jurisdiction", "consent_version", "content", "screening_ruleset", "vendor", "policy", "setting"]),
  subjectId: z.string().min(1).max(100),
  reviewType: z.enum(["legal", "clinical", "state_rule", "security", "owner"]),
  reviewerName: z.string().min(2).max(120),
  outcome: z.enum(["approved", "changes_requested"]),
  notes: z.string().max(4000),
  reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nextDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

export async function addComplianceReview(ctx: Ctx, input: z.infer<typeof complianceReviewSchema>) {
  requireRole(ctx.actor, ["admin", "compliance"]);
  requireStaffMfa(ctx.actor);
  await ctx.tx.insert(complianceReviews).values({ ...input, nextDueOn: input.nextDueOn || null, createdBy: ctx.actor.userId });
  if (input.subjectType === "jurisdiction" && input.outcome === "approved") {
    await ctx.tx.update(jurisdictions).set({ lastReviewOn: input.reviewedOn, nextReviewDueOn: input.nextDueOn || null }).where(eq(jurisdictions.code, input.subjectId));
  }
  await audit(ctx, { action: "config.updated", subjectType: "compliance_review", subjectId: `${input.subjectType}:${input.subjectId}`, metadata: { outcome: input.outcome, reviewType: input.reviewType } });
}

export async function listComplianceReviews(ctx: Ctx, subjectType?: string, subjectId?: string) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const conds = [];
  if (subjectType) conds.push(eq(complianceReviews.subjectType, subjectType));
  if (subjectId) conds.push(eq(complianceReviews.subjectId, subjectId));
  return ctx.tx.select().from(complianceReviews).where(conds.length ? and(...conds) : undefined).orderBy(desc(complianceReviews.reviewedOn)).limit(200);
}

// ---- Clinicians, licenses, privileges, authorizations ------------------------------

export async function listClinicians(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  return ctx.tx.select({ c: clinicians, email: users.email }).from(clinicians).innerJoin(users, eq(users.id, clinicians.userId)).orderBy(clinicians.displayName);
}

export async function clinicianDetail(ctx: Ctx, clinicianId: string) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director", "clinician"]);
  if (ctx.actor.roles.length === 1 && ctx.actor.roles[0] === "clinician" && ctx.actor.clinicianId !== clinicianId) throw forbidden();
  const [c] = await ctx.tx.select({ c: clinicians, email: users.email }).from(clinicians).innerJoin(users, eq(users.id, clinicians.userId)).where(eq(clinicians.id, clinicianId)).limit(1);
  if (!c) throw notFound("Clinician");
  const lic = await ctx.tx.select().from(licenses).where(eq(licenses.clinicianId, clinicianId)).orderBy(licenses.jurisdictionCode);
  const cps = await ctx.tx.select().from(compactPrivileges).where(eq(compactPrivileges.clinicianId, clinicianId)).orderBy(compactPrivileges.remoteJurisdictionCode);
  const auths = await ctx.tx.select({ a: serviceAuthorizations, serviceName: services.name }).from(serviceAuthorizations).innerJoin(services, eq(services.id, serviceAuthorizations.serviceId)).where(eq(serviceAuthorizations.clinicianId, clinicianId));
  return { ...c, licenses: lic, privileges: cps, authorizations: auths };
}

export const clinicianSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  initialPassword: z.string(),
  legalName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().min(2).max(160),
  credentials: z.string().trim().min(2).max(60),
  degree: z.string().trim().max(60),
  npi: z.string().trim().regex(/^(\d{10})?$/, "NPI must be 10 digits"),
  bio: z.string().max(3000),
  malpracticeCarrier: z.string().max(160),
  malpracticeExpiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  publicProfile: z.boolean(),
  director: z.boolean(),
});

export async function createClinician(ctx: Ctx, input: z.infer<typeof clinicianSchema>) {
  await adminGate(ctx, true);
  const pw = passwordProblems(input.initialPassword);
  if (pw) throw invalid(pw);
  const [existing] = await ctx.tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
  if (existing) throw conflict("A user with that email already exists.");
  const [u] = await ctx.tx.insert(users).values({ email: input.email, passwordHash: await hashPassword(input.initialPassword) }).returning();
  const [c] = await ctx.tx
    .insert(clinicians)
    .values({
      userId: u!.id,
      legalName: input.legalName,
      displayName: input.displayName,
      credentials: input.credentials,
      degree: input.degree || null,
      npi: input.npi || null,
      bio: input.bio || null,
      malpracticeCarrier: input.malpracticeCarrier || null,
      malpracticeExpiresOn: input.malpracticeExpiresOn || null,
      publicProfile: input.publicProfile,
      status: "onboarding",
    })
    .returning();
  const roles: Role[] = input.director ? ["clinician", "clinical_director"] : ["clinician"];
  for (const role of roles) await ctx.tx.insert(userRoles).values({ userId: u!.id, role, grantedBy: ctx.actor.kind === "staff" ? ctx.actor.userId : null });
  await audit(ctx, { action: "credential.updated", subjectType: "clinician", subjectId: c!.id, metadata: { created: true } });
  for (const role of roles) await audit(ctx, { action: "role.granted", subjectType: "user", subjectId: u!.id, metadata: { role } });
  return c!.id;
}

export async function updateClinician(ctx: Ctx, clinicianId: string, input: Omit<z.infer<typeof clinicianSchema>, "email" | "initialPassword" | "director"> & { status: "onboarding" | "active" | "inactive" }) {
  await adminGate(ctx, input.status === "active");
  await ctx.tx
    .update(clinicians)
    .set({
      legalName: input.legalName,
      displayName: input.displayName,
      credentials: input.credentials,
      degree: input.degree || null,
      npi: input.npi || null,
      bio: input.bio || null,
      malpracticeCarrier: input.malpracticeCarrier || null,
      malpracticeExpiresOn: input.malpracticeExpiresOn || null,
      publicProfile: input.publicProfile,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(clinicians.id, clinicianId));
  await audit(ctx, { action: "credential.updated", subjectType: "clinician", subjectId: clinicianId, metadata: { status: input.status } });
}

export const licenseSchema = z.object({
  jurisdictionCode: z.string().length(2),
  licenseType: z.string().trim().min(2).max(60),
  licenseNumber: z.string().trim().min(1).max(60),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verificationSource: z.string().trim().min(3, "Record where you verified this license.").max(400),
});

/** Credentials are recorded only after manual verification; nothing renews automatically. */
export async function addLicense(ctx: Ctx, clinicianId: string, input: z.infer<typeof licenseSchema>) {
  await adminGate(ctx, true);
  const [l] = await ctx.tx
    .insert(licenses)
    .values({ clinicianId, jurisdictionCode: input.jurisdictionCode, licenseType: input.licenseType, licenseNumber: input.licenseNumber, issuedOn: input.issuedOn || null, expiresOn: input.expiresOn, verificationSource: input.verificationSource, verifiedBy: (ctx.actor as { userId: string }).userId, verifiedAt: new Date() })
    .returning({ id: licenses.id });
  await audit(ctx, { action: "credential.updated", subjectType: "license", subjectId: l!.id, metadata: { jurisdiction: input.jurisdictionCode } });
}

export const privilegeSchema = z.object({
  compact: z.enum(["counseling", "psypact", "social_work", "nurse", "other"]),
  remoteJurisdictionCode: z.string().length(2),
  homeLicenseId: z.string().uuid().or(z.literal("")),
  privilegeIdentifier: z.string().trim().max(80),
  effectiveOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function addPrivilege(ctx: Ctx, clinicianId: string, input: z.infer<typeof privilegeSchema>) {
  await adminGate(ctx, true);
  const [p] = await ctx.tx
    .insert(compactPrivileges)
    .values({ clinicianId, compact: input.compact, remoteJurisdictionCode: input.remoteJurisdictionCode, homeLicenseId: input.homeLicenseId || null, privilegeIdentifier: input.privilegeIdentifier || null, effectiveOn: input.effectiveOn, expiresOn: input.expiresOn, verifiedBy: (ctx.actor as { userId: string }).userId, verifiedAt: new Date() })
    .returning({ id: compactPrivileges.id });
  await audit(ctx, { action: "credential.updated", subjectType: "compact_privilege", subjectId: p!.id, metadata: { jurisdiction: input.remoteJurisdictionCode, compact: input.compact } });
}

export async function setCredentialStatus(ctx: Ctx, kind: "license" | "privilege", id: string, status: "active" | "expired" | "suspended" | "inactive") {
  await adminGate(ctx, true);
  if (kind === "license") await ctx.tx.update(licenses).set({ status }).where(eq(licenses.id, id));
  else await ctx.tx.update(compactPrivileges).set({ status }).where(eq(compactPrivileges.id, id));
  await audit(ctx, { action: "credential.updated", subjectType: kind, subjectId: id, metadata: { status } });
}

export const authorizationSchema = z.object({
  serviceId: z.string().uuid(),
  jurisdictionCode: z.string().length(2),
  basis: z.enum(["license", "compact_privilege"]),
  credentialId: z.string().uuid(),
  effectiveOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
});

export async function addAuthorization(ctx: Ctx, clinicianId: string, input: z.infer<typeof authorizationSchema>) {
  await adminGate(ctx, true);
  if (input.basis === "license") {
    const [l] = await ctx.tx.select().from(licenses).where(and(eq(licenses.id, input.credentialId), eq(licenses.clinicianId, clinicianId))).limit(1);
    if (!l || l.jurisdictionCode !== input.jurisdictionCode) throw invalid("The license must belong to this clinician and this state.");
  } else {
    const [p] = await ctx.tx.select().from(compactPrivileges).where(and(eq(compactPrivileges.id, input.credentialId), eq(compactPrivileges.clinicianId, clinicianId))).limit(1);
    if (!p || p.remoteJurisdictionCode !== input.jurisdictionCode) throw invalid("The privilege must belong to this clinician and this state.");
  }
  const [a] = await ctx.tx
    .insert(serviceAuthorizations)
    .values({
      clinicianId,
      serviceId: input.serviceId,
      jurisdictionCode: input.jurisdictionCode,
      basis: input.basis,
      licenseId: input.basis === "license" ? input.credentialId : null,
      compactPrivilegeId: input.basis === "compact_privilege" ? input.credentialId : null,
      effectiveOn: input.effectiveOn,
      endsOn: input.endsOn || null,
      authorizedBy: (ctx.actor as { userId: string }).userId,
    })
    .returning({ id: serviceAuthorizations.id });
  await audit(ctx, { action: "authorization.changed", subjectType: "service_authorization", subjectId: a!.id, metadata: { jurisdiction: input.jurisdictionCode, change: "created" } });
}

export async function endAuthorization(ctx: Ctx, authorizationId: string) {
  await adminGate(ctx, true);
  await ctx.tx.update(serviceAuthorizations).set({ status: "ended", endsOn: new Date().toISOString().slice(0, 10) }).where(eq(serviceAuthorizations.id, authorizationId));
  await audit(ctx, { action: "authorization.changed", subjectType: "service_authorization", subjectId: authorizationId, metadata: { change: "ended" } });
}

/** Credentials expiring within `days`, for the reminder panel and nightly job. */
export async function expiringCredentials(ctx: Ctx, days = 90) {
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const lic = await ctx.tx.select({ l: licenses, name: clinicians.displayName }).from(licenses).innerJoin(clinicians, eq(clinicians.id, licenses.clinicianId)).where(and(eq(licenses.status, "active"), sql`${licenses.expiresOn} <= ${until}`));
  const cps = await ctx.tx.select({ p: compactPrivileges, name: clinicians.displayName }).from(compactPrivileges).innerJoin(clinicians, eq(clinicians.id, compactPrivileges.clinicianId)).where(and(eq(compactPrivileges.status, "active"), sql`${compactPrivileges.expiresOn} <= ${until}`));
  const mal = await ctx.tx.select().from(clinicians).where(and(eq(clinicians.status, "active"), sql`${clinicians.malpracticeExpiresOn} <= ${until}`));
  return [
    ...lic.map((x) => ({ kind: "License", who: x.name, detail: `${x.l.jurisdictionCode} ${x.l.licenseType} ${x.l.licenseNumber}`, expiresOn: x.l.expiresOn })),
    ...cps.map((x) => ({ kind: "Compact privilege", who: x.name, detail: `${x.p.remoteJurisdictionCode} ${x.p.compact}`, expiresOn: x.p.expiresOn })),
    ...mal.map((x) => ({ kind: "Malpractice", who: x.displayName, detail: x.malpracticeCarrier ?? "", expiresOn: x.malpracticeExpiresOn ?? "" })),
  ].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}

// ---- Services and prices --------------------------------------------------------------

export async function listServices(ctx: Ctx) {
  const rows = await ctx.tx.select().from(services).orderBy(services.displayOrder);
  const ps = await ctx.tx.select().from(prices).orderBy(desc(prices.effectiveFrom));
  return rows.map((s) => ({ ...s, prices: ps.filter((p) => p.serviceId === s.id) }));
}

export const serviceSchema = z.object({
  name: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(400),
  description: z.string().trim().min(10).max(4000),
  enabled: z.boolean(),
  requiresSession: z.boolean(),
  requiresIdentityVerification: z.boolean(),
  requiresEmployerForm: z.boolean(),
  sessionMinutes: z.number().int().min(15).max(180),
});

export async function updateService(ctx: Ctx, serviceId: string, input: z.infer<typeof serviceSchema>) {
  await adminGate(ctx, true);
  const [svc] = await ctx.tx.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!svc) throw notFound("Service");
  if (input.enabled && !svc.enabled) assertPublishable(svc.reviewTag);
  await ctx.tx.update(services).set({ ...input, updatedAt: new Date() }).where(eq(services.id, serviceId));
  await audit(ctx, { action: "service.updated", subjectType: "service", subjectId: serviceId, metadata: { enabled: input.enabled } });
}

export async function clearServiceReviewTag(ctx: Ctx, serviceId: string) {
  await adminGate(ctx, true);
  await ctx.tx.update(services).set({ reviewTag: null }).where(eq(services.id, serviceId));
  await audit(ctx, { action: "service.updated", subjectType: "service", subjectId: serviceId, metadata: { reviewTag: "cleared" } });
}

/** Prices are versioned: a new price closes the previous one; nothing is edited in place. */
export async function setPrice(ctx: Ctx, serviceId: string, amountCents: number, effectiveFrom: Date) {
  await adminGate(ctx, true);
  if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > 1_000_000) throw invalid("Enter a valid price.");
  await ctx.tx.update(prices).set({ effectiveTo: effectiveFrom }).where(and(eq(prices.serviceId, serviceId), isNull(prices.effectiveTo)));
  await ctx.tx.insert(prices).values({ serviceId, amountCents, effectiveFrom, createdBy: (ctx.actor as { userId: string }).userId });
  await audit(ctx, { action: "price.created", subjectType: "service", subjectId: serviceId, metadata: { amountCents } });
}

// ---- Consent documents ----------------------------------------------------------------

export async function listConsents(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const docs = await ctx.tx.select().from(consentDocuments).orderBy(consentDocuments.displayOrder);
  const versions = await ctx.tx.select().from(consentVersions).orderBy(desc(consentVersions.version));
  return docs.map((d) => ({ ...d, versions: versions.filter((v) => v.documentId === d.id) }));
}

export async function draftConsentVersion(ctx: Ctx, documentId: string, bodyMd: string, reviewTag: ReviewTag | null) {
  await adminGate(ctx);
  if (bodyMd.trim().length < 20) throw invalid("The consent text is too short.");
  const [last] = await ctx.tx.select({ v: consentVersions.version }).from(consentVersions).where(eq(consentVersions.documentId, documentId)).orderBy(desc(consentVersions.version)).limit(1);
  await ctx.tx.insert(consentVersions).values({ documentId, version: (last?.v ?? 0) + 1, bodyMd, bodyHash: sha256Hex(bodyMd), status: "draft", reviewTag });
  await audit(ctx, { action: "config.updated", subjectType: "consent_document", subjectId: documentId, metadata: { draft: (last?.v ?? 0) + 1 } });
}

export async function publishConsentVersion(ctx: Ctx, versionId: string) {
  await adminGate(ctx, true);
  const [v] = await ctx.tx.select().from(consentVersions).where(eq(consentVersions.id, versionId)).limit(1);
  if (!v || v.status !== "draft") throw invalid("Only drafts can be published.");
  assertPublishable(v.reviewTag);
  await ctx.tx.update(consentVersions).set({ status: "retired" }).where(and(eq(consentVersions.documentId, v.documentId), eq(consentVersions.status, "published")));
  await ctx.tx.update(consentVersions).set({ status: "published", effectiveFrom: new Date(), publishedBy: (ctx.actor as { userId: string }).userId }).where(eq(consentVersions.id, v.id));
  await audit(ctx, { action: "consent_version.published", subjectType: "consent_version", subjectId: v.id, metadata: { version: v.version } });
}

// ---- Content (FAQ, legal pages) -------------------------------------------------------

export async function listContent(ctx: Ctx, kind?: string) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  return ctx.tx.select().from(contentEntries).where(kind ? eq(contentEntries.kind, kind as "faq") : undefined).orderBy(contentEntries.kind, contentEntries.category, contentEntries.sortOrder);
}

export const contentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  bodyMd: z.string().trim().min(3).max(20000),
  category: z.string().max(40),
  status: z.enum(["draft", "published", "retired"]),
  reviewTag: z.enum(["OWNER_DECISION_REQUIRED", "LEGAL_REVIEW_REQUIRED", "CLINICAL_REVIEW_REQUIRED", "STATE_RULE_REQUIRED", "SECURITY_REVIEW_REQUIRED"]).nullable(),
  sortOrder: z.number().int(),
});

export async function saveContent(ctx: Ctx, id: string | null, kind: "faq" | "legal" | "resource" | "state", key: string | null, input: z.infer<typeof contentSchema>) {
  await adminGate(ctx);
  if (input.status === "published") assertPublishable(input.reviewTag);
  const userId = (ctx.actor as { userId: string }).userId;
  if (id) {
    await ctx.tx.update(contentEntries).set({ ...input, category: input.category || null, updatedBy: userId, updatedAt: new Date() }).where(eq(contentEntries.id, id));
  } else {
    const k = key ?? `${kind}.${input.category || "general"}.${sha256Hex(input.title + Date.now()).slice(0, 8)}`;
    await ctx.tx.insert(contentEntries).values({ ...input, kind, key: k, category: input.category || null, updatedBy: userId });
  }
  await audit(ctx, { action: input.status === "published" ? "content.published" : "config.updated", subjectType: "content", subjectId: id ?? key ?? "new" });
}

export async function publishedContent(tx: Ctx["tx"], kind: "faq" | "legal" | "resource" | "state") {
  return tx.select().from(contentEntries).where(and(eq(contentEntries.kind, kind), eq(contentEntries.status, "published"))).orderBy(contentEntries.category, contentEntries.sortOrder);
}

// ---- Notification templates -----------------------------------------------------------

export async function listTemplates(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance"]);
  return ctx.tx.select().from(notificationTemplates).orderBy(notificationTemplates.key, notificationTemplates.channel);
}

export async function saveTemplate(ctx: Ctx, id: string, input: { subject: string | null; body: string; active: boolean }) {
  await adminGate(ctx);
  const problems = [...lintTemplate(input.body), ...(input.subject ? lintTemplate(input.subject) : [])];
  if (problems.length) throw invalid(problems.join(" "));
  if (input.body.length > 1000) throw invalid("Template is too long.");
  await ctx.tx.update(notificationTemplates).set({ subject: input.subject, body: input.body, active: input.active, updatedBy: (ctx.actor as { userId: string }).userId, updatedAt: new Date() }).where(eq(notificationTemplates.id, id));
  await audit(ctx, { action: "config.updated", subjectType: "notification_template", subjectId: id });
}

// ---- Questionnaires and screening rules -----------------------------------------------

export async function listQuestionnaires(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "clinical_director", "compliance"]);
  return ctx.tx.select().from(questionnaires).orderBy(questionnaires.kind, questionnaires.key, desc(questionnaires.version));
}

export async function setQuestionnaireEnabled(ctx: Ctx, id: string, enabled: boolean) {
  requireRole(ctx.actor, ["admin", "clinical_director"]);
  requireStaffMfa(ctx.actor);
  await ctx.tx.update(questionnaires).set({ enabled }).where(eq(questionnaires.id, id));
  await audit(ctx, { action: "config.updated", subjectType: "questionnaire", subjectId: id, metadata: { enabled } });
}

export async function listRulesets(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "clinical_director", "compliance"]);
  return ctx.tx.select().from(screeningRulesets).orderBy(desc(screeningRulesets.version));
}

/** New draft ruleset from JSON. Validated by the same schema the engine uses. */
export async function draftRuleset(ctx: Ctx, json: string) {
  requireRole(ctx.actor, ["admin", "clinical_director"]);
  requireStaffMfa(ctx.actor);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw invalid("The rules are not valid JSON.");
  }
  const def = rulesetSchema.safeParse(parsed);
  if (!def.success) throw invalid(`Rules are not valid: ${def.error.issues.slice(0, 3).map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
  const [last] = await ctx.tx.select({ v: screeningRulesets.version }).from(screeningRulesets).orderBy(desc(screeningRulesets.version)).limit(1);
  await ctx.tx.insert(screeningRulesets).values({ version: (last?.v ?? 0) + 1, definition: def.data, status: "draft", reviewTag: "CLINICAL_REVIEW_REQUIRED" });
  await audit(ctx, { action: "config.updated", subjectType: "screening_ruleset", subjectId: String((last?.v ?? 0) + 1) });
}

export async function publishRuleset(ctx: Ctx, id: string, clearTag: boolean) {
  requireRole(ctx.actor, ["admin", "clinical_director"]);
  requireStaffMfa(ctx.actor);
  requireStepUp(ctx.actor, (await getSetting(ctx.tx, "security")).stepUpMinutes);
  const [r] = await ctx.tx.select().from(screeningRulesets).where(eq(screeningRulesets.id, id)).limit(1);
  if (!r || r.status !== "draft") throw invalid("Only drafts can be published.");
  const tag = clearTag ? null : r.reviewTag;
  assertPublishable(tag);
  await ctx.tx.update(screeningRulesets).set({ status: "retired" }).where(eq(screeningRulesets.status, "published"));
  await ctx.tx.update(screeningRulesets).set({ status: "published", reviewTag: tag, publishedBy: ctx.actor.userId, publishedAt: new Date() }).where(eq(screeningRulesets.id, id));
  await audit(ctx, { action: "content.published", subjectType: "screening_ruleset", subjectId: id, metadata: { version: r.version } });
}

// ---- Staff users and roles --------------------------------------------------------------

export async function listStaff(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance"]);
  const rows = await ctx.tx.select({ id: users.id, email: users.email, status: users.status, mfa: users.mfaEnabledAt, lastLogin: users.lastLoginAt }).from(users);
  const roles = await ctx.tx.select().from(userRoles).where(isNull(userRoles.revokedAt));
  return rows
    .map((u) => ({ ...u, roles: roles.filter((r) => r.userId === u.id).map((r) => r.role) }))
    .filter((u) => u.roles.some((r) => STAFF_ROLES.includes(r)));
}

export const staffSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), initialPassword: z.string(), role: z.enum(["admin", "support", "billing", "compliance"]) });

export async function createStaffUser(ctx: Ctx, input: z.infer<typeof staffSchema>) {
  await adminGate(ctx, true);
  const pw = passwordProblems(input.initialPassword);
  if (pw) throw invalid(pw);
  const [existing] = await ctx.tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${input.email}`).limit(1);
  if (existing) throw conflict("A user with that email already exists.");
  const [u] = await ctx.tx.insert(users).values({ email: input.email, passwordHash: await hashPassword(input.initialPassword) }).returning();
  await ctx.tx.insert(userRoles).values({ userId: u!.id, role: input.role, grantedBy: (ctx.actor as { userId: string }).userId });
  await audit(ctx, { action: "role.granted", subjectType: "user", subjectId: u!.id, metadata: { role: input.role } });
}

/** Admins cannot grant themselves a clinical role or remove their own admin role. */
export async function setRole(ctx: Ctx, userId: string, role: Role, grant: boolean) {
  await adminGate(ctx, true);
  if (!(ROLES as readonly string[]).includes(role) || role === "patient") throw invalid("Unknown role.");
  const self = ctx.actor.kind === "staff" && ctx.actor.userId === userId;
  if (self && CLINICAL_ROLES.includes(role) && grant) throw forbidden("You can't grant yourself a clinical role.");
  if (self && role === "admin" && !grant) throw forbidden("You can't remove your own admin role.");
  if (grant && CLINICAL_ROLES.includes(role)) {
    const [c] = await ctx.tx.select({ id: clinicians.id }).from(clinicians).where(eq(clinicians.userId, userId)).limit(1);
    if (!c) throw invalid("Clinical roles require a clinician profile.");
  }
  if (grant) {
    await ctx.tx.insert(userRoles).values({ userId, role, grantedBy: (ctx.actor as { userId: string }).userId }).onConflictDoNothing();
  } else {
    await ctx.tx.update(userRoles).set({ revokedAt: new Date(), revokedBy: (ctx.actor as { userId: string }).userId }).where(and(eq(userRoles.userId, userId), eq(userRoles.role, role), isNull(userRoles.revokedAt)));
  }
  await audit(ctx, { action: grant ? "role.granted" : "role.revoked", subjectType: "user", subjectId: userId, metadata: { role } });
}

export async function setUserStatus(ctx: Ctx, userId: string, status: "active" | "disabled") {
  await adminGate(ctx, true);
  if (ctx.actor.kind === "staff" && ctx.actor.userId === userId) throw forbidden("You can't disable your own account.");
  await ctx.tx.update(users).set({ status, lockedUntil: null, failedLoginCount: 0 }).where(eq(users.id, userId));
  await audit(ctx, { action: "config.updated", subjectType: "user", subjectId: userId, metadata: { status } });
}

// ---- Break-glass access grants ----------------------------------------------------------

export async function requestAccessGrant(ctx: Ctx, input: { caseId: string | null; reason: string; hours: number }) {
  requireRole(ctx.actor, ["compliance", "clinical_director", "clinician"]);
  requireStaffMfa(ctx.actor);
  const sec = await getSetting(ctx.tx, "security");
  if (input.reason.trim().length < 15) throw invalid("Explain why access is needed.");
  const hours = Math.min(Math.max(1, input.hours), sec.breakGlassMaxHours);
  const [g] = await ctx.tx
    .insert(accessGrants)
    .values({ granteeUserId: ctx.actor.userId, caseId: input.caseId, reason: input.reason.trim(), expiresAt: new Date(Date.now() + hours * 3_600_000) })
    .returning({ id: accessGrants.id });
  await audit(ctx, { action: "access_grant.created", subjectType: "access_grant", subjectId: g!.id, caseId: input.caseId, metadata: { hours, state: "requested" } });
  return g!.id;
}

export async function approveAccessGrant(ctx: Ctx, grantId: string) {
  requireRole(ctx.actor, ["admin", "clinical_director"]);
  requireStaffMfa(ctx.actor);
  requireStepUp(ctx.actor, (await getSetting(ctx.tx, "security")).stepUpMinutes);
  const [g] = await ctx.tx.select().from(accessGrants).where(eq(accessGrants.id, grantId)).limit(1);
  if (!g || g.approvedBy || g.revokedAt) throw invalid("This request is not pending.");
  if (g.granteeUserId === ctx.actor.userId) throw forbidden("You can't approve your own access request.");
  await ctx.tx.update(accessGrants).set({ approvedBy: ctx.actor.userId, startsAt: new Date() }).where(eq(accessGrants.id, g.id));
  await audit(ctx, { action: "access_grant.created", subjectType: "access_grant", subjectId: g.id, caseId: g.caseId, metadata: { state: "approved" } });
}

export async function revokeAccessGrant(ctx: Ctx, grantId: string) {
  requireRole(ctx.actor, ["admin", "clinical_director", "compliance"]);
  await ctx.tx.update(accessGrants).set({ revokedAt: new Date() }).where(eq(accessGrants.id, grantId));
  await audit(ctx, { action: "access_grant.created", subjectType: "access_grant", subjectId: grantId, metadata: { state: "revoked" } });
}

export async function listAccessGrants(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "clinical_director", "compliance", "clinician"]);
  const rows = await ctx.tx.select({ g: accessGrants, email: users.email }).from(accessGrants).innerJoin(users, eq(users.id, accessGrants.granteeUserId)).orderBy(desc(accessGrants.createdAt)).limit(100);
  if (ctx.actor.roles.every((r) => r === "clinician")) return rows.filter((r) => r.g.granteeUserId === (ctx.actor as { userId: string }).userId);
  return rows;
}

// ---- Audit search -----------------------------------------------------------------------

export async function searchAudit(ctx: Ctx, filters: { caseId?: string; action?: string; actorEmail?: string; limit?: number }) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const conds = [];
  if (filters.caseId && /^[0-9a-f-]{36}$/i.test(filters.caseId)) conds.push(eq(auditEvents.caseId, filters.caseId));
  if (filters.action) conds.push(ilike(auditEvents.action, `${filters.action.replace(/[%_]/g, "")}%`));
  if (filters.actorEmail) {
    const [u] = await ctx.tx.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${filters.actorEmail.toLowerCase()}`).limit(1);
    conds.push(u ? eq(auditEvents.actorUserId, u.id) : sql`false`);
  }
  const rows = await ctx.tx
    .select({ e: auditEvents, email: users.email })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditEvents.id))
    .limit(Math.min(filters.limit ?? 200, 500));
  return rows;
}

export async function caseAudit(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["admin", "compliance"]);
  return ctx.tx.select({ e: auditEvents, email: users.email }).from(auditEvents).leftJoin(users, eq(users.id, auditEvents.actorUserId)).where(eq(auditEvents.caseId, caseId)).orderBy(desc(auditEvents.id)).limit(300);
}

// ---- Employer / referral organizations --------------------------------------------------

export const orgSchema = z.object({
  name: z.string().trim().min(2).max(160),
  kind: z.enum(["private_employer", "public_employer", "correctional", "school", "healthcare", "other"]),
  referralCode: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/, "Use 3–40 lowercase letters, numbers or dashes."),
  landingHeadline: z.string().trim().max(200),
  active: z.boolean(),
});

export async function listOrganizations(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "support", "billing", "compliance"]);
  const rows = await ctx.tx.select().from(organizations).orderBy(organizations.name);
  // Aggregate, de-identified referral counts only. Suppressed below 5 to avoid re-identification.
  const counts = await ctx.tx.execute<{ org: string; n: number }>(sql`select referral_organization_id as org, count(*)::int as n from cases where referral_organization_id is not null group by 1`);
  return rows.map((o) => {
    const n = Number((counts.rows as { org: string; n: number }[]).find((c) => c.org === o.id)?.n ?? 0);
    return { ...o, referrals: n >= 5 ? String(n) : n === 0 ? "0" : "fewer than 5" };
  });
}

export async function saveOrganization(ctx: Ctx, id: string | null, input: z.infer<typeof orgSchema>) {
  await adminGate(ctx);
  if (id) await ctx.tx.update(organizations).set({ ...input, landingHeadline: input.landingHeadline || null }).where(eq(organizations.id, id));
  else await ctx.tx.insert(organizations).values({ ...input, landingHeadline: input.landingHeadline || null });
  await audit(ctx, { action: "config.updated", subjectType: "organization", subjectId: id ?? input.referralCode });
}

export async function findOrganizationByCode(tx: Ctx["tx"], code: string) {
  const [o] = await tx.select().from(organizations).where(and(sql`lower(${organizations.referralCode}) = lower(${code})`, eq(organizations.active, true))).limit(1);
  return o ?? null;
}

export async function searchUsers(ctx: Ctx, q: string) {
  requireRole(ctx.actor, ["admin", "support"]);
  return ctx.tx.select({ id: users.id, email: users.email, status: users.status }).from(users).where(or(ilike(users.email, `%${q.replace(/[%_]/g, "")}%`))).limit(20);
}
