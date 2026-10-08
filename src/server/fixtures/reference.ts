import "server-only";
import { eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import {
  availabilityRules,
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
import { encrypt, sha256Hex } from "../crypto";
import { hashPassword } from "../auth/password";
import { CONSENTS, CONTENT, JURISDICTIONS, SERVICES, TEMPLATES } from "@/config/catalog";
import { INTAKE_V1, intakeDefinitionSchema } from "@/config/intake";
import { SCREENING_V1 } from "@/config/screening";
import { DEFAULT_INSTRUMENTS } from "@/domain/instruments";
import type { Role } from "@/domain/constants";

/**
 * Development and test fixtures. Every person, license number and organization here is fictional.
 * The seed refuses to run in production (see scripts/seed.ts).
 */

export const FIXTURE_PASSWORD = "Fictional-Dev-Pass-1";
/** Base32 TOTP secret shared by fixture staff so local sign-in and e2e tests can compute codes. */
export const FIXTURE_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
/** Jurisdictions the fixtures activate so the journey can run locally. Not a launch decision (OWN-02). */
/** Mirrors the owner's launch decision (OWN-01/OWN-02, 2026-10-08): Mississippi and Tennessee. Clinicians are fictional. */
export const FIXTURE_ACTIVE_STATES = ["MS", "TN"] as const;

export const FIXTURE_STAFF = {
  admin: { email: "admin@leavebridge.test", roles: ["admin"] as Role[] },
  director: { email: "director@leavebridge.test", roles: ["clinician", "clinical_director"] as Role[] },
  clinician: { email: "clinician@leavebridge.test", roles: ["clinician"] as Role[] },
  clinician2: { email: "clinician2@leavebridge.test", roles: ["clinician"] as Role[] },
  support: { email: "support@leavebridge.test", roles: ["support"] as Role[] },
  billing: { email: "billing@leavebridge.test", roles: ["billing"] as Role[] },
  compliance: { email: "compliance@leavebridge.test", roles: ["compliance"] as Role[] },
};
export type FixtureStaffKey = keyof typeof FIXTURE_STAFF;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000);

/** Catalog, consents, content, templates, questionnaires and the screening ruleset. */
export async function seedReference(ctx: Ctx) {
  await ctx.tx.insert(jurisdictions).values(JURISDICTIONS.map(([code, name]) => ({ code, name, kind: code === "DC" ? ("district" as const) : ("state" as const) }))).onConflictDoNothing();

  for (const s of SERVICES) {
    const [row] = await ctx.tx
      .insert(services)
      .values({
        slug: s.slug,
        name: s.name,
        summary: s.summary,
        description: s.description,
        documentationType: s.documentationType,
        enabled: s.enabled,
        requiresSession: s.requiresSession,
        requiresIdentityVerification: s.requiresIdentityVerification,
        requiresEmployerForm: s.requiresEmployerForm,
        sessionMinutes: s.sessionMinutes,
        displayOrder: s.displayOrder,
        reviewTag: s.reviewTag,
      })
      .returning();
    await ctx.tx.insert(prices).values({ serviceId: row!.id, amountCents: s.priceCents, effectiveFrom: new Date(Date.now() - 86_400_000) });
  }

  for (const c of CONSENTS) {
    const [doc] = await ctx.tx.insert(consentDocuments).values({ key: c.key, title: c.title, requiredBefore: c.requiredBefore, displayOrder: c.order }).returning();
    await ctx.tx.insert(consentVersions).values({ documentId: doc!.id, version: 1, bodyMd: c.body, bodyHash: sha256Hex(c.body), status: "published", reviewTag: "LEGAL_REVIEW_REQUIRED", effectiveFrom: new Date(Date.now() - 86_400_000) });
  }

  for (const c of CONTENT) {
    await ctx.tx.insert(contentEntries).values({ kind: c.kind, key: c.key, category: c.category ?? null, title: c.title, bodyMd: c.body, status: "published", reviewTag: c.reviewTag, sortOrder: c.order });
  }

  for (const t of TEMPLATES) {
    await ctx.tx.insert(notificationTemplates).values({ key: t.key, channel: t.channel, subject: t.subject, body: t.body, reviewTag: "LEGAL_REVIEW_REQUIRED" });
  }

  await ctx.tx.insert(questionnaires).values({ kind: "intake", key: "intake", version: 1, definition: intakeDefinitionSchema.parse(INTAKE_V1), status: "published", reviewTag: "CLINICAL_REVIEW_REQUIRED" });
  for (const inst of DEFAULT_INSTRUMENTS) {
    await ctx.tx.insert(questionnaires).values({ kind: "measure", key: inst.key, version: 1, definition: inst, status: "published", reviewTag: "CLINICAL_REVIEW_REQUIRED" });
  }
  await ctx.tx.insert(screeningRulesets).values({ version: 1, definition: SCREENING_V1, status: "published", reviewTag: "CLINICAL_REVIEW_REQUIRED", publishedAt: new Date() });

  await ctx.tx.insert(organizations).values({ name: "Example Logistics Co. (fictional)", kind: "private_employer", referralCode: "example-logistics", landingHeadline: "Support for Example Logistics team members" });
}

async function createUser(ctx: Ctx, email: string, roles: Role[], mfa: boolean) {
  const [u] = await ctx.tx
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(FIXTURE_PASSWORD),
      emailVerifiedAt: new Date(),
      mfaTotpSecret: mfa ? encrypt(FIXTURE_TOTP_SECRET) : null,
      mfaEnabledAt: mfa ? new Date() : null,
      isFixture: true,
    })
    .returning();
  for (const role of roles) await ctx.tx.insert(userRoles).values({ userId: u!.id, role });
  return u!.id;
}

export interface FixtureStaff {
  userIds: Record<FixtureStaffKey, string>;
  clinicianIds: { director: string; clinician: string; clinician2: string };
  serviceId: string;
}

/** Fictional staff, clinicians with verified-looking (fictional) credentials, and two active states. */
export async function seedStaff(ctx: Ctx): Promise<FixtureStaff> {
  const userIds = {} as Record<FixtureStaffKey, string>;
  for (const [key, s] of Object.entries(FIXTURE_STAFF) as [FixtureStaffKey, (typeof FIXTURE_STAFF)[FixtureStaffKey]][]) {
    userIds[key] = await createUser(ctx, s.email, s.roles, true);
  }
  const [svc] = await ctx.tx.select().from(services).where(eq(services.slug, "mental-health-leave-assessment")).limit(1);
  const serviceId = svc!.id;

  const people = {
    director: { legalName: "Dana Whitfield (fictional)", displayName: "Dr. Dana Whitfield", credentials: "PhD, Licensed Psychologist", degree: "PhD" },
    clinician: { legalName: "Morgan Reyes (fictional)", displayName: "Morgan Reyes", credentials: "LPC", degree: "MA" },
    clinician2: { legalName: "Sam Okafor (fictional)", displayName: "Sam Okafor", credentials: "LCSW", degree: "MSW" },
  };
  const clinicianIds = {} as FixtureStaff["clinicianIds"];
  for (const key of ["director", "clinician", "clinician2"] as const) {
    const p = people[key];
    const [c] = await ctx.tx
      .insert(clinicians)
      .values({
        userId: userIds[key],
        ...p,
        bio: "Fictional clinician profile for development. Not a real person.",
        publicProfile: true,
        malpracticeCarrier: "Example Mutual (fictional)",
        malpracticeExpiresOn: iso(addDays(300)),
        status: "active",
      })
      .returning();
    clinicianIds[key] = c!.id;
    for (let weekday = 1; weekday <= 5; weekday++) {
      await ctx.tx.insert(availabilityRules).values({ clinicianId: c!.id, weekday, startMinute: 9 * 60, endMinute: 17 * 60, timeZone: "America/Chicago" });
    }
  }

  for (const code of FIXTURE_ACTIVE_STATES) {
    await ctx.tx
      .update(jurisdictions)
      .set({
        isActive: true,
        telehealthAuthorized: true,
        complianceNotes: "FIXTURE ONLY: activated for local development. Not a reviewed launch state.",
        lastReviewOn: iso(new Date()),
        nextReviewDueOn: iso(addDays(180)),
        activatedBy: userIds.admin,
        activatedAt: new Date(),
      })
      .where(eq(jurisdictions.code, code));
    await ctx.tx.insert(complianceReviews).values({ subjectType: "jurisdiction", subjectId: code, reviewType: "state_rule", reviewerName: "Fixture reviewer (fictional)", outcome: "approved", notes: "Development fixture. Replace with real counsel review (LEG-01).", reviewedOn: iso(new Date()), nextDueOn: iso(addDays(180)), createdBy: userIds.admin });
  }

  const license = async (clinicianId: string, code: string, type: string, expiresInDays: number) => {
    const [l] = await ctx.tx
      .insert(licenses)
      .values({ clinicianId, jurisdictionCode: code, licenseType: type, licenseNumber: `FIC-${code}-${Math.floor(Math.random() * 90000 + 10000)}`, issuedOn: iso(addDays(-900)), expiresOn: iso(addDays(expiresInDays)), verifiedBy: userIds.admin, verifiedAt: new Date(), verificationSource: "Fixture: no real verification performed" })
      .returning();
    return l!.id;
  };
  const enabled = await ctx.tx.select({ id: services.id }).from(services).where(eq(services.enabled, true));
  const authorize = async (clinicianId: string, code: string, basis: "license" | "compact_privilege", credentialId: string) => {
    for (const svcRow of enabled)
      await ctx.tx.insert(serviceAuthorizations).values({ clinicianId, serviceId: svcRow.id, jurisdictionCode: code, basis, licenseId: basis === "license" ? credentialId : null, compactPrivilegeId: basis === "compact_privilege" ? credentialId : null, effectiveOn: iso(addDays(-30)), authorizedBy: userIds.admin });
  };

  // Director: MS psychologist license, TN via PSYPACT privilege (exercises the compact path).
  const dMs = await license(clinicianIds.director, "MS", "Licensed Psychologist", 400);
  await authorize(clinicianIds.director, "MS", "license", dMs);
  const [dTn] = await ctx.tx
    .insert(compactPrivileges)
    .values({ clinicianId: clinicianIds.director, compact: "psypact", homeLicenseId: dMs, remoteJurisdictionCode: "TN", privilegeIdentifier: "FIC-PSYPACT-0001", effectiveOn: iso(addDays(-60)), expiresOn: iso(addDays(300)), verifiedBy: userIds.admin, verifiedAt: new Date() })
    .returning();
  await authorize(clinicianIds.director, "TN", "compact_privilege", dTn!.id);

  // Clinician: LPC licensed in both MS and TN, like the launch clinician (fictional person).
  const cMs = await license(clinicianIds.clinician, "MS", "Licensed Professional Counselor", 500);
  await authorize(clinicianIds.clinician, "MS", "license", cMs);
  const cTn = await license(clinicianIds.clinician, "TN", "Licensed Professional Counselor", 500);
  await authorize(clinicianIds.clinician, "TN", "license", cTn);

  // Clinician 2: MS LCSW expiring soon (shows the expiring-credentials alert).
  const c2Ms = await license(clinicianIds.clinician2, "MS", "Licensed Clinical Social Worker", 20);
  await authorize(clinicianIds.clinician2, "MS", "license", c2Ms);

  return { userIds, clinicianIds, serviceId };
}

/** Looks up the fixture staff created by seedStaff (tests and scripts). */
export async function loadFixtureStaff(ctx: Ctx): Promise<FixtureStaff> {
  const userIds = {} as Record<FixtureStaffKey, string>;
  for (const [key, s] of Object.entries(FIXTURE_STAFF) as [FixtureStaffKey, (typeof FIXTURE_STAFF)[FixtureStaffKey]][]) {
    const [u] = await ctx.tx.select({ id: users.id }).from(users).where(eq(users.email, s.email)).limit(1);
    if (!u) throw new Error(`Fixture staff missing: ${s.email}. Run the seed first.`);
    userIds[key] = u.id;
  }
  const clinicianIds = {} as FixtureStaff["clinicianIds"];
  for (const key of ["director", "clinician", "clinician2"] as const) {
    const [c] = await ctx.tx.select({ id: clinicians.id }).from(clinicians).where(eq(clinicians.userId, userIds[key])).limit(1);
    clinicianIds[key] = c!.id;
  }
  const [svc] = await ctx.tx.select({ id: services.id }).from(services).where(eq(services.slug, "mental-health-leave-assessment")).limit(1);
  return { userIds, clinicianIds, serviceId: svc!.id };
}
