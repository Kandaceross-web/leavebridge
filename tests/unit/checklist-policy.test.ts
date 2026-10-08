import { describe, expect, it } from "vitest";
import { buildChecklist, gate, type ChecklistFacts } from "@/domain/cases/checklist";
import { caseAccess, requireAssignedClinician, requireStepUp } from "@/domain/policy";
import type { Actor } from "@/domain/actor";

const facts = (patch: Partial<ChecklistFacts> = {}): ChecklistFacts => ({
  screeningReviewPending: false, serviceSelected: true, identityRequired: true, identityStatus: "pending", locationConfirmed: true,
  paymentConsentsSigned: true, paid: false, intakeConsentsSigned: false, intakeSubmitted: false, measuresEnabled: true,
  measuresRemaining: 2, employerFormRequired: false, employerFormUploaded: false, openRequests: 0, submitted: false, ...patch,
});

describe("patient checklist and gates", () => {
  it("puts payment before intake", () => {
    expect(gate(facts(), "payment").ok).toBe(true);
    expect(gate(facts(), "intake")).toEqual({ ok: false, reason: "Payment is needed before intake." });
    expect(buildChecklist(facts()).find((s) => s.state === "current")?.key).toBe("payment");
  });
  it("blocks payment while a NEEDS_REVIEW screening is pending clinician clearance", () => {
    expect(gate(facts({ screeningReviewPending: true }), "payment").ok).toBe(false);
  });
  it("blocks submission until intake, measures and required forms are complete", () => {
    const paid = facts({ paid: true, intakeConsentsSigned: true });
    expect(gate(paid, "submit").ok).toBe(false);
    expect(gate({ ...paid, intakeSubmitted: true, measuresRemaining: 0 }, "submit").ok).toBe(true);
    expect(gate({ ...paid, intakeSubmitted: true, measuresRemaining: 0, employerFormRequired: true }, "submit").ok).toBe(false);
  });
  it("hides measures when disabled", () => {
    expect(buildChecklist(facts({ measuresEnabled: false })).some((s) => s.key === "measures")).toBe(false);
  });
});

const staff = (roles: Actor extends infer A ? (A extends { kind: "staff"; roles: infer R } ? R : never) : never, clinicianId: string | null = null): Actor => ({ kind: "staff", userId: "u", roles, clinicianId, mfa: true, stepUpAt: new Date() });
const c = { patientId: "p1", assignedClinicianId: "c1", jurisdictionCode: "TX", status: "clinical_review" };

describe("case access policy", () => {
  it("patients see only their own cases", () => {
    expect(caseAccess({ kind: "patient", userId: "u", patientId: "p1", mfa: false, stepUpAt: null }, c)).toBe("owner");
    expect(caseAccess({ kind: "patient", userId: "u", patientId: "p2", mfa: false, stepUpAt: null }, c)).toBe("none");
    expect(caseAccess({ kind: "anonymous" }, c)).toBe("none");
  });
  it("only the assigned clinician (or a director) has clinical access", () => {
    expect(caseAccess(staff(["clinician"], "c1"), c)).toBe("clinical");
    expect(caseAccess(staff(["clinician"], "c2"), c)).toBe("operational");
    expect(caseAccess(staff(["clinical_director"], "c9"), c)).toBe("clinical");
  });
  it("unassigned new cases are visible clinically only within the clinician's states", () => {
    const fresh = { ...c, assignedClinicianId: null, status: "submitted" };
    expect(caseAccess(staff(["clinician"], "c2"), fresh, { authorizedJurisdictions: ["TX"] })).toBe("clinical");
    expect(caseAccess(staff(["clinician"], "c2"), fresh, { authorizedJurisdictions: ["FL"] })).toBe("operational");
  });
  it("operations roles never get clinical access without a grant", () => {
    for (const r of ["admin", "support", "billing", "compliance"] as const) expect(caseAccess(staff([r]), c)).toBe("operational");
    expect(caseAccess(staff(["compliance"]), c, { hasActiveGrant: true })).toBe("clinical");
    expect(caseAccess(staff(["billing"]), c, { hasActiveGrant: true })).toBe("operational");
  });
  it("requires the assigned clinician and a fresh step-up for signing actions", () => {
    expect(() => requireAssignedClinician(staff(["clinician"], "c2"), "c1")).toThrow();
    expect(() => requireAssignedClinician(staff(["admin"]), "c1")).toThrow();
    expect(() => requireAssignedClinician(staff(["clinician"], "c1"), "c1")).not.toThrow();
    const stale: Actor = { kind: "staff", userId: "u", roles: ["clinician"], clinicianId: "c1", mfa: true, stepUpAt: new Date(Date.now() - 30 * 60_000) };
    expect(() => requireStepUp(stale, 10)).toThrow();
  });
});
