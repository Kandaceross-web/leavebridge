import { describe, expect, it } from "vitest";
import { canServe, type AuthorizationRecord } from "@/domain/jurisdiction/can-serve";

const on = new Date("2026-10-08T15:00:00Z");
const clinician = { id: "c1", status: "active" as const, malpracticeExpiresOn: "2027-01-01" };
const tx = { code: "TX", isActive: true, telehealthAuthorized: true };
const auth = (patch: Partial<AuthorizationRecord> = {}): AuthorizationRecord => ({
  id: "a1", clinicianId: "c1", serviceId: "s1", jurisdictionCode: "TX", status: "active", effectiveOn: "2026-01-01", endsOn: null, basis: "license",
  credential: { id: "l1", status: "active", expiresOn: "2027-06-01", effectiveOn: "2024-01-01" }, ...patch,
});
const run = (over: Partial<Parameters<typeof canServe>[0]> = {}) => canServe({ jurisdiction: tx, clinician, serviceId: "s1", authorizations: [auth()], on, ...over });
const reasons = (r: ReturnType<typeof canServe>) => (r.ok ? [] : r.reasons);

describe("canServe", () => {
  it("allows a fully credentialed, authorized clinician in an active state", () => {
    expect(run()).toEqual({ ok: true, authorizationId: "a1" });
  });
  it("denies when no authorization exists (never inferred from a license)", () => {
    expect(reasons(run({ authorizations: [] }))).toContain("no_authorization");
  });
  it("denies inactive or non-telehealth jurisdictions", () => {
    expect(reasons(run({ jurisdiction: { ...tx, isActive: false } }))).toContain("jurisdiction_inactive");
    expect(reasons(run({ jurisdiction: { ...tx, telehealthAuthorized: false } }))).toContain("telehealth_not_authorized");
    expect(reasons(run({ jurisdiction: null }))).toContain("jurisdiction_inactive");
  });
  it("denies an expired license and an expired malpractice policy", () => {
    expect(reasons(run({ authorizations: [auth({ credential: { id: "l1", status: "active", expiresOn: "2026-10-07", effectiveOn: null } })] }))).toContain("credential_expired");
    expect(reasons(run({ clinician: { ...clinician, malpracticeExpiresOn: "2026-10-01" } }))).toContain("malpractice_missing_or_expired");
  });
  it("can skip only the license expiry date (STR-02: booking and visit join)", () => {
    const expired = auth({ credential: { id: "l1", status: "active", expiresOn: "2026-10-07", effectiveOn: null } });
    expect(run({ authorizations: [expired], checkLicenseExpiry: false }).ok).toBe(true);
    expect(reasons(run({ authorizations: [expired], checkLicenseExpiry: false, jurisdiction: null }))).toContain("jurisdiction_inactive");
    expect(reasons(run({ authorizations: [auth({ credential: { id: "l1", status: "inactive", expiresOn: "2026-10-07", effectiveOn: null } })], checkLicenseExpiry: false }))).toContain("credential_inactive");
  });
  it("denies suspended credentials, ended authorizations and future-dated privileges", () => {
    expect(reasons(run({ authorizations: [auth({ credential: { id: "l1", status: "suspended", expiresOn: "2027-01-01", effectiveOn: null } })] }))).toContain("credential_inactive");
    expect(reasons(run({ authorizations: [auth({ endsOn: "2026-10-01" })] }))).toContain("authorization_not_in_effect");
    expect(reasons(run({ authorizations: [auth({ basis: "compact_privilege", credential: { id: "p1", status: "active", expiresOn: "2027-01-01", effectiveOn: "2026-11-01" } })] }))).toContain("authorization_not_in_effect");
  });
  it("accepts an active compact privilege", () => {
    const fl = { code: "FL", isActive: true, telehealthAuthorized: true };
    const r = canServe({ jurisdiction: fl, clinician, serviceId: "s1", on, authorizations: [auth({ id: "a2", jurisdictionCode: "FL", basis: "compact_privilege", credential: { id: "p1", status: "active", expiresOn: "2027-01-01", effectiveOn: "2026-01-01" } })] });
    expect(r).toEqual({ ok: true, authorizationId: "a2" });
  });
  it("evaluates on the appointment date, not today", () => {
    expect(run({ on: new Date("2027-07-01T15:00:00Z") }).ok).toBe(false);
  });
  it("denies an inactive clinician", () => {
    expect(reasons(run({ clinician: { ...clinician, status: "inactive" } }))).toContain("clinician_inactive");
  });
});
