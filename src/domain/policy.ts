import type { Actor } from "./actor";
import { CLINICAL_ROLES, type Role } from "./constants";
import { DomainError, forbidden } from "./errors";

/**
 * Authorization policy. Deny by default. Clinical content requires a clinical role AND a
 * relationship to the case (assignment, triage eligibility, or an active break-glass grant).
 * Administrative power over configuration never implies clinical access.
 */

export function hasRole(actor: Actor, roles: readonly Role[]): boolean {
  return actor.kind === "staff" && actor.roles.some((r) => roles.includes(r));
}

export function requireRole(actor: Actor, roles: readonly Role[]): asserts actor is Extract<Actor, { kind: "staff" }> {
  if (!hasRole(actor, roles)) throw forbidden();
}

export function requirePatient(actor: Actor): asserts actor is Extract<Actor, { kind: "patient" }> {
  if (actor.kind !== "patient") throw forbidden();
}

export function requireStaffMfa(actor: Actor) {
  if (actor.kind === "staff" && !actor.mfa) throw new DomainError("mfa_required", "Multi-factor verification is required.");
}

/** Step-up: a fresh re-authentication within `minutes` before high-risk actions. */
export function requireStepUp(actor: Actor, minutes: number, now = new Date()) {
  const at = actor.kind === "staff" || actor.kind === "patient" ? actor.stepUpAt : null;
  if (!at || now.getTime() - at.getTime() > minutes * 60_000) {
    throw new DomainError("step_up_required", "Please confirm your password to continue.");
  }
}

export type CaseAccess = "none" | "owner" | "operational" | "clinical";

export interface CaseAccessInput {
  patientId: string;
  assignedClinicianId: string | null;
  jurisdictionCode: string | null;
  status: string;
}

export interface CaseAccessContext {
  /** Jurisdictions where this clinician holds an active service authorization. */
  authorizedJurisdictions?: readonly string[];
  /** True when the actor has an unexpired break-glass grant for this case. */
  hasActiveGrant?: boolean;
}

const TRIAGE_STATUSES = new Set(["submitted", "safety_hold"]);

export function caseAccess(actor: Actor, c: CaseAccessInput, ctx: CaseAccessContext = {}): CaseAccess {
  if (actor.kind === "system") return "clinical";
  if (actor.kind === "patient") return actor.patientId === c.patientId ? "owner" : "none";
  if (actor.kind !== "staff") return "none";

  if (actor.roles.includes("clinical_director")) return "clinical";
  if (actor.roles.includes("clinician") && actor.clinicianId) {
    if (c.assignedClinicianId === actor.clinicianId) return "clinical";
    const inJurisdiction = !!c.jurisdictionCode && (ctx.authorizedJurisdictions ?? []).includes(c.jurisdictionCode);
    if (!c.assignedClinicianId && TRIAGE_STATUSES.has(c.status) && inJurisdiction) return "clinical";
  }
  if (ctx.hasActiveGrant && (actor.roles.includes("compliance") || CLINICAL_ROLES.some((r) => actor.roles.includes(r)))) {
    return "clinical";
  }
  if (actor.roles.some((r) => r === "admin" || r === "support" || r === "billing" || r === "compliance")) return "operational";
  if (actor.roles.includes("clinician")) return "operational";
  return "none";
}

export function requireCaseAccess(actor: Actor, c: CaseAccessInput, level: "owner" | "operational" | "clinical", ctx?: CaseAccessContext): CaseAccess {
  const access = caseAccess(actor, c, ctx);
  const ok =
    level === "owner"
      ? access === "owner"
      : level === "operational"
        ? access === "operational" || access === "clinical"
        : access === "clinical";
  if (!ok) throw forbidden();
  return access;
}

/** Only the assigned clinician may record a determination or sign. */
export function requireAssignedClinician(actor: Actor, assignedClinicianId: string | null) {
  if (actor.kind !== "staff" || !actor.clinicianId || !hasRole(actor, CLINICAL_ROLES) || actor.clinicianId !== assignedClinicianId) {
    throw forbidden("Only the clinician assigned to this case can do this.");
  }
}
