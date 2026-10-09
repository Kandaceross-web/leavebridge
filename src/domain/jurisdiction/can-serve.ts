/**
 * The single authority for "may clinician X provide service Y to a patient located in Z on date D".
 * Called at every entry point: service availability, scheduling, rescheduling, session join and
 * signing. Pure function over plain records so it is exhaustively testable.
 * Never infers authorization: a missing record means "no".
 */

export interface JurisdictionRecord {
  code: string;
  isActive: boolean;
  telehealthAuthorized: boolean;
}

export interface ClinicianRecord {
  id: string;
  status: "onboarding" | "active" | "inactive";
  malpracticeExpiresOn: string | null;
}

export interface CredentialRecord {
  id: string;
  status: "active" | "expired" | "suspended" | "inactive";
  expiresOn: string;
  /** effectiveOn for compact privileges; issuedOn for licenses (may be null). */
  effectiveOn: string | null;
}

export interface AuthorizationRecord {
  id: string;
  clinicianId: string;
  serviceId: string;
  jurisdictionCode: string;
  status: "active" | "suspended" | "ended";
  effectiveOn: string;
  endsOn: string | null;
  basis: "license" | "compact_privilege";
  credential: CredentialRecord | null;
}

export type DenyReason =
  | "jurisdiction_inactive"
  | "telehealth_not_authorized"
  | "clinician_inactive"
  | "malpractice_missing_or_expired"
  | "no_authorization"
  | "authorization_inactive"
  | "authorization_not_in_effect"
  | "credential_missing"
  | "credential_inactive"
  | "credential_expired";

export type CanServeResult = { ok: true; authorizationId: string } | { ok: false; reasons: DenyReason[] };

const day = (d: Date) => d.toISOString().slice(0, 10);

export function canServe(input: {
  jurisdiction: JurisdictionRecord | null;
  clinician: ClinicianRecord;
  serviceId: string;
  authorizations: readonly AuthorizationRecord[];
  on: Date;
  /**
   * false skips the license expiration date (STR-02, owner sign-off 2026-10-09: rechecked only before signing).
   * The license must still exist, be active and match the patient's state.
   */
  checkLicenseExpiry?: boolean;
}): CanServeResult {
  const reasons: DenyReason[] = [];
  const onDay = day(input.on);
  const j = input.jurisdiction;
  if (!j || !j.isActive) reasons.push("jurisdiction_inactive");
  else if (!j.telehealthAuthorized) reasons.push("telehealth_not_authorized");
  if (input.clinician.status !== "active") reasons.push("clinician_inactive");
  if (!input.clinician.malpracticeExpiresOn || input.clinician.malpracticeExpiresOn < onDay) reasons.push("malpractice_missing_or_expired");

  const candidates = input.authorizations.filter(
    (a) => a.clinicianId === input.clinician.id && a.serviceId === input.serviceId && a.jurisdictionCode === j?.code,
  );
  if (candidates.length === 0) {
    reasons.push("no_authorization");
    return { ok: false, reasons };
  }

  const authReasons: DenyReason[][] = [];
  for (const a of candidates) {
    const r: DenyReason[] = [];
    if (a.status !== "active") r.push("authorization_inactive");
    if (a.effectiveOn > onDay || (a.endsOn !== null && a.endsOn < onDay)) r.push("authorization_not_in_effect");
    if (!a.credential) r.push("credential_missing");
    else {
      if (a.credential.status !== "active") r.push("credential_inactive");
      if (input.checkLicenseExpiry !== false && a.credential.expiresOn < onDay) r.push("credential_expired");
      if (a.credential.effectiveOn && a.credential.effectiveOn > onDay) r.push("authorization_not_in_effect");
    }
    if (r.length === 0 && reasons.length === 0) return { ok: true, authorizationId: a.id };
    authReasons.push(r);
  }
  // Report the reasons for the closest candidate (fewest problems).
  const best = authReasons.sort((x, y) => x.length - y.length)[0] ?? [];
  return { ok: false, reasons: [...reasons, ...best] };
}

export const DENY_REASON_LABEL: Record<DenyReason, string> = {
  jurisdiction_inactive: "State is not active",
  telehealth_not_authorized: "Telehealth is not authorized for this state",
  clinician_inactive: "Clinician is not active",
  malpractice_missing_or_expired: "Malpractice coverage is missing or expired",
  no_authorization: "No service authorization for this state",
  authorization_inactive: "Service authorization is suspended or ended",
  authorization_not_in_effect: "Authorization is not in effect on this date",
  credential_missing: "License or privilege record is missing",
  credential_inactive: "License or privilege is not active",
  credential_expired: "License or privilege expires before this date",
};
