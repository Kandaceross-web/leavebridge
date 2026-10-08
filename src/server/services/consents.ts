import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { consents, consentVersions } from "../db/schema";
import { audit } from "../audit";
import { loadCase, requiredConsentVersions, touch } from "./cases";
import { invalid } from "@/domain/errors";
import type { ConsentStage } from "@/domain/constants";

/** Required versions for a stage with the patient's signature status. */
export async function consentStatus(ctx: Ctx, caseId: string, stage: ConsentStage) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const required = await requiredConsentVersions(ctx, stage, row.jurisdictionCode);
  const signed = required.length
    ? await ctx.tx
        .select()
        .from(consents)
        .where(and(eq(consents.caseId, row.id), isNull(consents.revokedAt), inArray(consents.versionId, required.map((r) => r.version.id))))
    : [];
  return required.map((r) => ({
    documentKey: r.doc.key,
    title: r.doc.title,
    versionId: r.version.id,
    version: r.version.version,
    body: r.version.bodyMd,
    reviewTag: r.version.reviewTag,
    signedAt: signed.find((s) => s.versionId === r.version.id)?.signedAt ?? null,
  }));
}

/**
 * Records signatures for every required version in the stage. The typed name must match the
 * patient's legal name; the hash of exactly what was shown is stored with authentication evidence.
 */
export async function signStageConsents(ctx: Ctx, caseId: string, stage: ConsentStage, input: { typedName: string; versionIds: string[]; legalName: string; sessionMfa: boolean }) {
  if (ctx.actor.kind !== "patient") throw invalid("Only the patient can sign.");
  const { row } = await loadCase(ctx, caseId, "owner");
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  if (norm(input.typedName) !== norm(input.legalName)) throw invalid("Type your full legal name exactly as it appears on your account.");
  const required = await requiredConsentVersions(ctx, stage, row.jurisdictionCode);
  const requiredIds = required.map((r) => r.version.id);
  // Must acknowledge exactly the current versions; protects against a stale page after a new version publishes.
  if (requiredIds.some((id) => !input.versionIds.includes(id))) throw invalid("These documents were updated. Please review the current versions.");
  const existing = await ctx.tx.select({ versionId: consents.versionId }).from(consents).where(and(eq(consents.caseId, row.id), isNull(consents.revokedAt)));
  const have = new Set(existing.map((e) => e.versionId));
  for (const r of required) {
    if (have.has(r.version.id)) continue;
    const [v] = await ctx.tx.select({ hash: consentVersions.bodyHash }).from(consentVersions).where(eq(consentVersions.id, r.version.id)).limit(1);
    const [signed] = await ctx.tx
      .insert(consents)
      .values({
        caseId: row.id,
        patientId: row.patientId,
        versionId: r.version.id,
        signerUserId: ctx.actor.userId,
        typedName: input.typedName.trim(),
        bodyHash: v!.hash,
        jurisdictionCode: row.jurisdictionCode,
        authEvidence: { method: "password_session", mfa: input.sessionMfa, requestId: ctx.requestId, at: new Date().toISOString() },
      })
      .returning({ id: consents.id });
    await audit(ctx, { action: "consent.signed", subjectType: "consent", subjectId: signed!.id, caseId: row.id, metadata: { document: r.doc.key, version: r.version.version } });
  }
  await touch(ctx, row.id);
}
