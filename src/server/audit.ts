import "server-only";
import { desc, sql } from "drizzle-orm";
import { auditEvents } from "./db/schema";
import { actorRoleLabel, actorUserId, type Ctx } from "./db/actor";
import { sha256Hex } from "./crypto";

/**
 * Security audit log. Append-only (DB trigger + revoked UPDATE/DELETE), hash-chained so
 * tampering with any historical row breaks verification. Metadata must be references and
 * short codes only: values are restricted to primitives and truncated.
 */
export type AuditAction =
  | "auth.sign_up"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.mfa_enrolled"
  | "auth.mfa_verified"
  | "auth.step_up"
  | "auth.locked"
  | "screening.completed"
  | "screening.emergency_routed"
  | "case.created"
  | "case.status_changed"
  | "case.viewed"
  | "case.assigned"
  | "case.service_selected"
  | "case.note_added"
  | "identity.submitted"
  | "identity.reviewed"
  | "location.attested"
  | "consent.signed"
  | "payment.checkout_started"
  | "payment.succeeded"
  | "payment.refund_requested"
  | "payment.refund_processed"
  | "estimate.issued"
  | "estimate.downloaded"
  | "intake.saved"
  | "intake.submitted"
  | "intake.viewed"
  | "measure.completed"
  | "measure.reviewed"
  | "file.uploaded"
  | "file.downloaded"
  | "file.rejected"
  | "employer_form.reviewed"
  | "request.created"
  | "request.fulfilled"
  | "clinical_review.recorded"
  | "appointment.scheduled"
  | "appointment.cancelled"
  | "appointment.completed"
  | "appointment.joined"
  | "assessment_note.saved"
  | "determination.recorded"
  | "document.created"
  | "document.version_saved"
  | "document.signed"
  | "document.delivered"
  | "document.downloaded"
  | "ai.suggestion_generated"
  | "ai.suggestion_accepted"
  | "release.authorized"
  | "release.revoked"
  | "message.sent"
  | "safety.event_created"
  | "safety.event_acknowledged"
  | "config.updated"
  | "jurisdiction.activated"
  | "jurisdiction.deactivated"
  | "credential.updated"
  | "authorization.changed"
  | "role.granted"
  | "role.revoked"
  | "access_grant.created"
  | "access_grant.used"
  | "access.denied"
  | "security_review.completed"
  | "content.published"
  | "consent_version.published"
  | "service.updated"
  | "price.created"
  | "waitlist.notified"
  | "email.verification_sent"
  | "email.verified"
  | "same_day.acknowledged"
  | "same_day.instruments_chosen"
  | "same_day.functioning_saved"
  | "same_day.completed"
  | "same_day.held"
  | "same_day.hold_released"
  | "same_day.closed_without_issue"
  | "same_day.refund_flag_resolved"
  | "staff.alerted"
  | "issued_document.issued"
  | "issued_document.revoked"
  | "issued_document.verified"
  | "letter.requested"
  | "letter.assigned"
  | "letter.version_saved"
  | "letter.approved"
  | "letter.declined";

export interface AuditInput {
  action: AuditAction;
  subjectType?: string;
  subjectId?: string;
  caseId?: string | null;
  outcome?: "allowed" | "denied";
  accessGrantId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

const AUDIT_LOCK_KEY = 7_420_001;

function cleanMetadata(m: AuditInput["metadata"]) {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(m ?? {})) {
    out[k.slice(0, 40)] = typeof v === "string" ? v.slice(0, 120) : v;
  }
  return out;
}

export async function audit(ctx: Ctx, input: AuditInput): Promise<void> {
  const { tx, actor } = ctx;
  // Serialize writers so the chain is linear.
  await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`);
  const [last] = await tx.select({ hash: auditEvents.hash }).from(auditEvents).orderBy(desc(auditEvents.id)).limit(1);
  const prevHash = last?.hash ?? "GENESIS";
  const record = {
    occurredAt: new Date(),
    actorUserId: actorUserId(actor),
    actorRole: actorRoleLabel(actor),
    action: input.action,
    subjectType: input.subjectType ?? null,
    subjectId: input.subjectId ?? null,
    caseId: input.caseId ?? null,
    outcome: input.outcome ?? "allowed",
    requestId: ctx.requestId,
    ipHash: ctx.ipHash,
    accessGrantId: input.accessGrantId ?? null,
    metadata: cleanMetadata(input.metadata),
  } as const;
  const hash = sha256Hex(prevHash + canonical(record));
  await tx.insert(auditEvents).values({ ...record, prevHash, hash });
}

/** Deterministic serialization used for the hash chain. */
export function canonical(record: Record<string, unknown>): string {
  const norm = (v: unknown): unknown => {
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])]));
    }
    return v;
  };
  return JSON.stringify(norm(record));
}

/** Recomputes the chain; returns the id of the first broken row, or null if intact. */
export async function verifyAuditChain(ctx: Ctx): Promise<number | null> {
  const rows = await ctx.tx.select().from(auditEvents).orderBy(auditEvents.id);
  let prev = "GENESIS";
  for (const r of rows) {
    const record = {
      occurredAt: r.occurredAt,
      actorUserId: r.actorUserId,
      actorRole: r.actorRole,
      action: r.action,
      subjectType: r.subjectType,
      subjectId: r.subjectId,
      caseId: r.caseId,
      outcome: r.outcome,
      requestId: r.requestId,
      ipHash: r.ipHash,
      accessGrantId: r.accessGrantId,
      metadata: r.metadata,
    };
    if (r.prevHash !== prev || sha256Hex(prev + canonical(record)) !== r.hash) return r.id;
    prev = r.hash;
  }
  return null;
}
