import { describe, expect, it } from "vitest";
import { GAD7, PHQ9, scoreInstrument } from "@/domain/instruments";
import { lintTemplate, renderTemplate } from "@/domain/notifications/templates";
import { defaultTriggerFor, policyRefundCents } from "@/domain/payments/refunds";
import { TEMPLATES } from "@/config/catalog";

const all = (inst: typeof PHQ9, v: number) => Object.fromEntries(inst.items.map((i) => [i.key, v]));

describe("validated measures", () => {
  it("has the published item counts", () => {
    expect(PHQ9.items).toHaveLength(9);
    expect(GAD7.items).toHaveLength(7);
  });
  it("sums item scores and finds the band", () => {
    const r = scoreInstrument(PHQ9, all(PHQ9, 3));
    expect(r.ok && r.result.total).toBe(27);
    const g = scoreInstrument(GAD7, all(GAD7, 0));
    expect(g.ok && g.result.total).toBe(0);
  });
  it("reports missing or invalid items rather than guessing", () => {
    const r = scoreInstrument(PHQ9, { ...all(PHQ9, 1), [PHQ9.items[0]!.key]: 7 });
    expect(r.ok).toBe(false);
  });
  it("flags PHQ-9 item 9 for clinician follow-up at any nonzero response", () => {
    const raw = { ...all(PHQ9, 0), phq9_9: 1 };
    const r = scoreInstrument(PHQ9, raw);
    expect(r.ok && r.result.safetyFlag).toBe(true);
  });
});

describe("notification templates", () => {
  it("every seeded template passes the PHI lint", () => {
    for (const t of TEMPLATES) expect(lintTemplate(`${t.subject ?? ""} ${t.body}`)).toEqual([]);
  });
  it("rejects unknown variables and clinical words", () => {
    expect(lintTemplate("Hi {{diagnosis}}")).not.toEqual([]);
    expect(lintTemplate("Your FMLA certification was approved")).not.toEqual([]);
  });
  it("renders only allow-listed variables", () => {
    expect(renderTemplate("Hi {{first_name}} {{case_notes}}", { first_name: "Ava" })).toBe("Hi Ava ");
  });
});

describe("refund policy", () => {
  const rules = [
    { trigger: "before_intake_submitted" as const, refundPercent: 100, note: "" },
    { trigger: "after_determination" as const, refundPercent: 0, note: "" },
  ];
  it("caps at the remaining refundable amount", () => {
    expect(policyRefundCents(rules, "before_intake_submitted", 27500, 0)).toBe(27500);
    expect(policyRefundCents(rules, "before_intake_submitted", 27500, 10000)).toBe(17500);
    expect(policyRefundCents(rules, "after_determination", 27500, 0)).toBe(0);
    expect(policyRefundCents(rules, "no_show", 27500, 0)).toBe(0);
  });
  it("infers a default trigger from case status", () => {
    expect(defaultTriggerFor("intake_incomplete")).toBe("before_intake_submitted");
    expect(defaultTriggerFor("safety_hold")).toBe("emergency_routed");
    expect(defaultTriggerFor("delivered")).toBe("after_determination");
  });
});
