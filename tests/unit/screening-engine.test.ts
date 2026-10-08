import { describe, expect, it } from "vitest";
import { emergencyTriggered, evaluate, rulesetSchema, validateStep, type Answers } from "@/domain/screening/engine";
import { SCREENING_V1 } from "@/config/screening";

const env = { activeStates: new Set(["TX", "FL"]), today: new Date("2026-10-08T12:00:00Z") };
const base: Answers = {
  age_18: "yes", current_state: "TX", appointment_state: "TX", safety_now: "no", reason: ["symptoms_affect_work"],
  own_condition: "yes", employer_type: "private", employment_length: "gte_12m", hours_worked: "24_plus", current_provider: "no",
  leave_type: "continuous", hr_contacted: "yes", has_form: "yes", provider_type_accepted: "any_licensed", deadline: undefined, previous_leave: "new",
};

describe("screening ruleset v1", () => {
  it("parses against the schema", () => {
    expect(rulesetSchema.safeParse(SCREENING_V1).success).toBe(true);
  });
  it("returns AVAILABLE for a routine adult in an active state", () => {
    expect(evaluate(SCREENING_V1, base, env)).toMatchObject({ outcome: "AVAILABLE" });
  });
  it("routes an immediate safety concern to EMERGENCY, regardless of other answers", () => {
    const a = { ...base, safety_now: "yes", age_18: "no", current_state: "NY" };
    expect(evaluate(SCREENING_V1, a, env).outcome).toBe("EMERGENCY");
    expect(emergencyTriggered(SCREENING_V1, a, env)?.reasonCode).toBe("SAFETY_IMMEDIATE");
  });
  it("uses the most severe outcome when several rules match", () => {
    const r = evaluate(SCREENING_V1, { ...base, age_18: "no", provider_type_accepted: "restricted" }, env);
    expect(r.outcome).toBe("NOT_AVAILABLE");
  });
  it.each([
    [{ age_18: "no" }, "UNDER_18"],
    [{ current_state: "NY" }, "STATE_NOT_ACTIVE"],
    [{ appointment_state: "NY" }, "APPOINTMENT_STATE_NOT_ACTIVE"],
    [{ own_condition: "family" }, "NOT_OWN_CONDITION"],
  ])("NOT_AVAILABLE for %o", (patch, code) => {
    const r = evaluate(SCREENING_V1, { ...base, ...patch }, env);
    expect(r.outcome).toBe("NOT_AVAILABLE");
    expect(r.reasonCodes).toContain(code);
  });
  it.each([
    [{ safety_now: "unsure" }, "SAFETY_UNSURE"],
    [{ appointment_state: "FL" }, "LOCATION_CHANGE"],
    [{ provider_type_accepted: "restricted" }, "PROVIDER_TYPE_RESTRICTED"],
    [{ deadline: "2026-10-10" }, "DEADLINE_IMMINENT"],
    [{ previous_leave: "recert" }, "RECERT_REQUEST"],
  ])("NEEDS_REVIEW for %o", (patch, code) => {
    const r = evaluate(SCREENING_V1, { ...base, ...patch }, env);
    expect(r.outcome).toBe("NEEDS_REVIEW");
    expect(r.reasonCodes).toContain(code);
  });
  it("does not use FMLA employment answers to decide eligibility", () => {
    const r = evaluate(SCREENING_V1, { ...base, employment_length: "lt_12m", hours_worked: "lt_24" }, env);
    expect(r.outcome).toBe("AVAILABLE");
  });
  it("validates required answers and rejects unknown options", () => {
    const { errors } = validateStep(SCREENING_V1, "location", { age_18: "maybe", current_state: "TX" }, {}, env);
    expect(Object.keys(errors).sort()).toEqual(["age_18", "appointment_state"]);
  });
});
