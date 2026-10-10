import { describe, expect, it } from "vitest";
import { npiCheckDigitOk, SETTING_DEFS } from "@/config/settings";
import { buildEstimate, canonicalEstimate, estimateSections, missingEstimateFields, needsNewEstimate, serviceCodeFor, type EstimateInput } from "@/domain/payments/good-faith-estimate";

const setting = SETTING_DEFS.goodFaithEstimate.default;

// Fictional values only.
const input = (over: Partial<EstimateInput> = {}): EstimateInput => ({
  issuedAt: new Date("2026-10-09T15:00:00Z"),
  reference: "LB-TEST01",
  patient: { name: "Test Patient", dateOfBirth: "1988-04-12" },
  service: { id: "svc-1", name: "Mental health leave assessment", summary: "A fictional summary." },
  price: { id: "price-1", amountCents: 27999, currency: "usd" },
  scheduledFor: null,
  provider: { name: "LeaveBridge Health", location: "By telehealth to you in Mississippi" },
  setting: { ...setting, providerNpi: "0000000000", providerTin: "00-0000000", serviceCode: "00000" },
  ...over,
});

describe("Good Faith Estimate setting", () => {
  it("ships with the owner's NPI and the other owner fields empty, tagged for an owner decision (LEG-08)", () => {
    expect(setting.providerNpi).toBe("1962023812");
    expect(setting.providerTin).toBe("");
    expect(setting.serviceCode).toBe("90791");
    expect(SETTING_DEFS.goodFaithEstimate.reviewTag).toBe("OWNER_DECISION_REQUIRED");
    expect(SETTING_DEFS.goodFaithEstimate.reviewNote).toMatch(/LEG-08/);
    expect(missingEstimateFields(setting)).toEqual(["providerTin"]);
  });

  it("validates identifier formats but accepts the empty defaults", () => {
    const schema = SETTING_DEFS.goodFaithEstimate.schema;
    expect(schema.safeParse(setting).success).toBe(true);
    expect(schema.safeParse({ ...setting, providerNpi: "12345" }).success).toBe(false);
    expect(schema.safeParse({ ...setting, providerTin: "12-34" }).success).toBe(false);
    expect(schema.safeParse({ ...setting, serviceCode: "9" }).success).toBe(false);
  });

  it("states the diagnosis-code position neutrally and carries the four required disclaimers", () => {
    expect(setting.diagnosisCodes).toBe("Not applicable: this assessment is not billed to insurance");
    const text = setting.disclaimers.join(" ");
    expect(text).toMatch(/only an estimate/i);
    expect(text).toMatch(/scheduled separately/i);
    expect(text).toMatch(/\$400 or more/);
    expect(text).toMatch(/cms\.gov\/nosurprises/);
    expect(text).toMatch(/will not affect the quality of the care/i);
    expect(text).toMatch(/not a contract/i);
    expect(setting.disputeUrl).toBe("https://www.cms.gov/nosurprises");
  });
});

describe("building an estimate", () => {
  it("itemizes only the service being purchased at its current price", () => {
    const c = buildEstimate(input());
    expect(c.items).toEqual([{ description: "Mental health leave assessment", serviceCode: "00000", quantity: 1, chargeCents: 27999 }]);
    expect(c.totalCents).toBe(27999);
    expect(c.patient).toEqual({ name: "Test Patient", dateOfBirth: "1988-04-12" });
    expect(c.provider).toEqual({ name: "LeaveBridge Health", npi: "0000000000", tin: "00-0000000", location: "By telehealth to you in Mississippi" });
    expect(c.primaryService.scheduledFor).toBeNull();
  });

  it("shows money, dates and missing owner fields in plain language", () => {
    const s = estimateSections(buildEstimate(input({ setting: { ...setting, providerNpi: "", serviceCode: "" } })));
    expect(s.total).toBe("$279.99");
    expect(s.items[0]!.serviceCode).toBe("Not yet provided");
    expect(s.patient.find((l) => l.label === "Date of birth")!.value).toBe("April 12, 1988");
    expect(s.provider.find((l) => l.label.includes("NPI"))!.value).toBe("Not yet provided");
    expect(s.service.find((l) => l.label === "Scheduled date")!.value).toMatch(/not scheduled/i);
    expect(s.diagnosisCodes).toMatch(/^Not applicable/);
  });

  it("serializes canonically, so the hash does not depend on key order", () => {
    const c = buildEstimate(input());
    const shuffled = JSON.parse(JSON.stringify({ ...c, provider: { location: c.provider.location, tin: c.provider.tin, npi: c.provider.npi, name: c.provider.name } }));
    expect(canonicalEstimate(shuffled)).toBe(canonicalEstimate(c));
    expect(canonicalEstimate(buildEstimate(input({ price: { id: "price-1", amountCents: 27998, currency: "usd" } })))).not.toBe(canonicalEstimate(c));
  });
});

describe("re-issuing", () => {
  const current = { serviceId: "svc-1", amountCents: 27999, currency: "usd" };
  it("issues the first estimate and reuses it while service and amount are unchanged", () => {
    expect(needsNewEstimate(null, current)).toBe(true);
    expect(needsNewEstimate({ ...current }, current)).toBe(false);
  });
  it("issues a new one when the service or the amount changes", () => {
    expect(needsNewEstimate({ ...current, amountCents: 25000 }, current)).toBe(true);
    expect(needsNewEstimate({ ...current, serviceId: "svc-2" }, current)).toBe(true);
  });
});

describe("NPI check digit", () => {
  it("accepts a valid NPI and rejects a one-digit typo", () => {
    expect(npiCheckDigitOk("1234567893")).toBe(true);
    expect(npiCheckDigitOk("1234567894")).toBe(false);
  });
});

describe("service codes chosen by the owner", () => {
  it("uses 90791 for the assessment and 96127 for the automated screening", () => {
    expect(serviceCodeFor(setting, "mental-health-leave-assessment")).toBe("90791");
    expect(serviceCodeFor(setting, "same-day-mental-health-assessment")).toBe("96127");
  });
});
