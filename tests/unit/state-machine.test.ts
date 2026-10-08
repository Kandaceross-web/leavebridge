import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, OPS_STAGE_OF, PATIENT_STATUS, timelinePosition } from "@/domain/cases/state-machine";
import { CASE_STATUSES } from "@/domain/constants";

describe("case state machine", () => {
  it("follows the agreed journey", () => {
    const path = ["started", "intake_incomplete", "submitted", "clinical_review", "appointment_needed", "appointment_scheduled", "provider_review", "provider_signature", "completed", "delivered", "closed"] as const;
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1]!, path[i]!)).toBe(true);
  });
  it("rejects skipping review or reopening terminal cases", () => {
    expect(canTransition("submitted", "completed")).toBe(false);
    expect(canTransition("started", "provider_signature")).toBe(false);
    expect(canTransition("closed", "clinical_review")).toBe(false);
    expect(canTransition("cancelled", "started")).toBe(false);
    expect(() => assertTransition("submitted", "delivered")).toThrow();
  });
  it("lets any open pre-completion status enter a safety hold", () => {
    for (const s of ["started", "intake_incomplete", "submitted", "clinical_review", "appointment_scheduled", "provider_review"] as const) {
      expect(canTransition(s, "safety_hold")).toBe(true);
    }
  });
  it("never uses outcome words in patient-facing labels", () => {
    for (const s of CASE_STATUSES) {
      const text = `${PATIENT_STATUS[s].label} ${PATIENT_STATUS[s].explainer ?? ""}`;
      expect(text).not.toMatch(/\b(approved|qualif\w*|certified|eligible|guarantee\w*)\b/i);
    }
  });
  it("maps every status to an ops stage or none, and a timeline position", () => {
    for (const s of CASE_STATUSES) {
      expect(s in OPS_STAGE_OF).toBe(true);
      expect(timelinePosition(s)).toBeGreaterThanOrEqual(-1);
    }
    expect(OPS_STAGE_OF.submitted).toBe("new_requests");
  });
});
