import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import {
  cases,
  clinicians,
  consentDocuments,
  consentVersions,
  contentEntries,
  jurisdictions,
  licenses,
  compactPrivileges,
  notificationTemplates,
  questionnaires,
  screeningRulesets,
  services,
  serviceAuthorizations,
} from "../db/schema";
import { audit, verifyAuditChain } from "../audit";
import { getSetting, settingReviewStatus } from "../settings";
import { loadAuthorizations } from "./jurisdiction";
import { canServe } from "@/domain/jurisdiction/can-serve";
import { requireRole, requireStaffMfa, requireStepUp } from "@/domain/policy";
import { notFound } from "@/domain/errors";

/*
 * Read-only helpers (plus one narrow update) for the admin console. Every function checks the
 * caller's role itself; none return patient data.
 */

/** Number of distinct clinicians who can serve each jurisdiction today (any service). */
export async function servableClinicianCounts(ctx: Ctx): Promise<Record<string, number>> {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const [js, auths, clins] = await Promise.all([
    ctx.tx.select().from(jurisdictions),
    loadAuthorizations(ctx.tx, {}),
    ctx.tx.select().from(clinicians),
  ]);
  const now = new Date();
  const out: Record<string, Set<string>> = {};
  for (const a of auths) {
    const j = js.find((x) => x.code === a.jurisdictionCode);
    const c = clins.find((x) => x.id === a.clinicianId);
    if (!j || !c) continue;
    // Readiness view: evaluate as if the state were active so inactive states still show coverage.
    const res = canServe({ jurisdiction: { code: j.code, isActive: true, telehealthAuthorized: j.telehealthAuthorized }, clinician: c, serviceId: a.serviceId, authorizations: [a], on: now });
    if (res.ok) (out[j.code] ??= new Set()).add(c.id);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.size]));
}

/** Per-clinician summary for the list page: states with an active authorization and credential counts. */
export async function clinicianSummaries(ctx: Ctx) {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const [auths, lic, cps] = await Promise.all([
    ctx.tx.select({ clinicianId: serviceAuthorizations.clinicianId, code: serviceAuthorizations.jurisdictionCode }).from(serviceAuthorizations).where(eq(serviceAuthorizations.status, "active")),
    ctx.tx.select({ clinicianId: licenses.clinicianId }).from(licenses).where(eq(licenses.status, "active")),
    ctx.tx.select({ clinicianId: compactPrivileges.clinicianId }).from(compactPrivileges).where(eq(compactPrivileges.status, "active")),
  ]);
  const out: Record<string, { states: string[]; licenses: number; privileges: number }> = {};
  const get = (id: string) => (out[id] ??= { states: [], licenses: 0, privileges: 0 });
  for (const a of auths) {
    const s = get(a.clinicianId);
    if (!s.states.includes(a.code)) s.states.push(a.code);
  }
  for (const l of lic) get(l.clinicianId).licenses++;
  for (const p of cps) get(p.clinicianId).privileges++;
  for (const v of Object.values(out)) v.states.sort();
  return out;
}

/** Resolves a short case reference (non-PHI, e.g. LB-7K3Q9M) to the case id, or null. */
export async function caseIdForReference(ctx: Ctx, reference: string): Promise<string | null> {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const ref = reference.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(ref)) return null;
  const [row] = await ctx.tx.select({ id: cases.id }).from(cases).where(eq(cases.reference, ref)).limit(1);
  return row?.id ?? null;
}

/** Maps case ids to their short references for display. */
export async function caseReferences(ctx: Ctx, ids: (string | null)[]): Promise<Record<string, string>> {
  requireRole(ctx.actor, ["admin", "compliance", "clinical_director"]);
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  if (!uniq.length) return {};
  const rows = await ctx.tx.select({ id: cases.id, reference: cases.reference }).from(cases).where(inArray(cases.id, uniq));
  return Object.fromEntries(rows.map((r) => [r.id, r.reference]));
}

/** Runs the audit hash-chain verification. Read-only. */
export async function verifyAuditChainAs(ctx: Ctx): Promise<number | null> {
  requireRole(ctx.actor, ["admin", "compliance"]);
  requireStaffMfa(ctx.actor);
  return verifyAuditChain(ctx);
}

export interface OpenReviewItem {
  area: "Setting" | "Service" | "Consent version" | "Content" | "Notification template" | "Questionnaire" | "Screening ruleset";
  id: string;
  key: string;
  title: string;
  reviewTag: string;
  href: string;
}

/** Everything that still carries a review tag: the production-readiness view. */
export async function openReviewTags(ctx: Ctx): Promise<OpenReviewItem[]> {
  requireRole(ctx.actor, ["admin", "compliance"]);
  const [settingRows, svc, cv, content, tpl, q, rs] = await Promise.all([
    settingReviewStatus(ctx.tx),
    ctx.tx.select({ id: services.id, key: services.slug, title: services.name, reviewTag: services.reviewTag }).from(services).where(isNotNull(services.reviewTag)),
    ctx.tx
      .select({ id: consentVersions.id, key: consentDocuments.key, title: consentDocuments.title, version: consentVersions.version, status: consentVersions.status, reviewTag: consentVersions.reviewTag })
      .from(consentVersions)
      .innerJoin(consentDocuments, eq(consentDocuments.id, consentVersions.documentId))
      .where(and(isNotNull(consentVersions.reviewTag), inArray(consentVersions.status, ["draft", "published"]))),
    ctx.tx.select({ id: contentEntries.id, key: contentEntries.key, title: contentEntries.title, reviewTag: contentEntries.reviewTag }).from(contentEntries).where(isNotNull(contentEntries.reviewTag)),
    ctx.tx.select({ id: notificationTemplates.id, key: notificationTemplates.key, title: notificationTemplates.channel, reviewTag: notificationTemplates.reviewTag }).from(notificationTemplates).where(isNotNull(notificationTemplates.reviewTag)),
    ctx.tx.select({ id: questionnaires.id, key: questionnaires.key, version: questionnaires.version, reviewTag: questionnaires.reviewTag }).from(questionnaires).where(isNotNull(questionnaires.reviewTag)),
    ctx.tx.select({ id: screeningRulesets.id, version: screeningRulesets.version, status: screeningRulesets.status, reviewTag: screeningRulesets.reviewTag }).from(screeningRulesets).where(and(isNotNull(screeningRulesets.reviewTag), inArray(screeningRulesets.status, ["draft", "published"]))),
  ]);
  const items: OpenReviewItem[] = [];
  for (const s of settingRows) if (s.reviewTag) items.push({ area: "Setting", id: s.key, key: s.key, title: s.label, reviewTag: s.reviewTag, href: `/ops/admin/settings#setting-${s.key}` });
  for (const s of svc) items.push({ area: "Service", id: s.id, key: s.key, title: s.title, reviewTag: s.reviewTag!, href: `/ops/admin/services#svc-${s.id}` });
  for (const v of cv) items.push({ area: "Consent version", id: v.id, key: v.key, title: `${v.title} v${v.version} (${v.status})`, reviewTag: v.reviewTag!, href: `/ops/admin/consents#v-${v.id}` });
  for (const c of content) items.push({ area: "Content", id: c.id, key: c.key, title: c.title, reviewTag: c.reviewTag!, href: `/ops/admin/content/${c.id}` });
  for (const t of tpl) items.push({ area: "Notification template", id: t.id, key: t.key, title: t.title, reviewTag: t.reviewTag!, href: `/ops/admin/templates#tpl-${t.id}` });
  for (const x of q) items.push({ area: "Questionnaire", id: x.id, key: x.key, title: `${x.key} v${x.version}`, reviewTag: x.reviewTag!, href: `/ops/admin/questionnaires#q-${x.id}` });
  for (const r of rs) items.push({ area: "Screening ruleset", id: r.id, key: `v${r.version}`, title: `Ruleset v${r.version} (${r.status})`, reviewTag: r.reviewTag!, href: `/ops/admin/questionnaires#rs-${r.id}` });
  return items;
}

export const serviceExtrasSchema = z.object({
  minAge: z.number().int().min(13).max(120),
  displayOrder: z.number().int().min(0).max(1000),
});

/** Minimum age and display order are not covered by updateService; same gate (admin, MFA, step-up). */
export async function updateServiceExtras(ctx: Ctx, serviceId: string, input: z.infer<typeof serviceExtrasSchema>) {
  requireRole(ctx.actor, ["admin"]);
  requireStaffMfa(ctx.actor);
  requireStepUp(ctx.actor, (await getSetting(ctx.tx, "security")).stepUpMinutes);
  const [svc] = await ctx.tx.select({ id: services.id }).from(services).where(eq(services.id, serviceId)).limit(1);
  if (!svc) throw notFound("Service");
  await ctx.tx.update(services).set({ minAge: input.minAge, displayOrder: input.displayOrder, updatedAt: new Date() }).where(eq(services.id, serviceId));
  await audit(ctx, { action: "service.updated", subjectType: "service", subjectId: serviceId, metadata: { minAge: input.minAge, displayOrder: input.displayOrder } });
}
