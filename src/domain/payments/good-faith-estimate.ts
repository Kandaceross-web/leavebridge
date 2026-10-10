import { formatCents } from "./refunds";

/**
 * Written Good Faith Estimate for self-pay patients (45 CFR 149.610, LEG-08). Pure functions only:
 * the service layer gathers the facts, this module decides what the estimate says, and the stored
 * record keeps that exact content with a hash so it can be reproduced unchanged for the record.
 */
export interface EstimateSetting {
  providerName: string;
  providerNpi: string;
  providerTin: string;
  serviceCode: string;
  diagnosisCodes: string;
  disclaimers: readonly string[];
  disputeUrl: string;
  /** Per-service code overrides keyed by service slug. */
  serviceCodes?: Readonly<Record<string, string>>;
}

export interface EstimateInput {
  issuedAt: Date;
  reference: string;
  patient: { name: string; dateOfBirth: string | null };
  service: { id: string; name: string; summary: string; slug?: string };
  price: { id: string; amountCents: number; currency: string };
  /** Start of a booked visit, if one exists when the estimate is issued. */
  scheduledFor: Date | null;
  provider: { name: string; location: string };
  setting: EstimateSetting;
}

/** Exactly what the patient sees. Stored encrypted (it holds name and date of birth). */
export interface EstimateContent {
  version: 1;
  issuedAt: string;
  reference: string;
  patient: { name: string; dateOfBirth: string };
  primaryService: { name: string; description: string; scheduledFor: string | null };
  items: { description: string; serviceCode: string; quantity: number; chargeCents: number }[];
  totalCents: number;
  currency: string;
  diagnosisCodes: string;
  provider: { name: string; npi: string; tin: string; location: string };
  disclaimers: string[];
  disputeUrl: string;
}

/** Owner-supplied fields that must be filled before a production release (release check, LEG-08). */
export const ESTIMATE_OWNER_FIELDS = ["providerNpi", "providerTin", "serviceCode"] as const;

export function missingEstimateFields(s: EstimateSetting): (typeof ESTIMATE_OWNER_FIELDS)[number][] {
  return ESTIMATE_OWNER_FIELDS.filter((k) => !s[k].trim());
}

/** The service's own code when one is configured for its slug, otherwise the general code. */
export function serviceCodeFor(setting: EstimateSetting, slug: string | undefined): string {
  const own = slug ? setting.serviceCodes?.[slug]?.trim() : "";
  return own || setting.serviceCode.trim();
}

/** Only the service being purchased is itemized, at its current self-pay price. */
export function buildEstimate(input: EstimateInput): EstimateContent {
  const { setting } = input;
  return {
    version: 1,
    issuedAt: input.issuedAt.toISOString(),
    reference: input.reference,
    patient: { name: input.patient.name, dateOfBirth: input.patient.dateOfBirth ?? "" },
    primaryService: { name: input.service.name, description: input.service.summary, scheduledFor: input.scheduledFor?.toISOString() ?? null },
    items: [{ description: input.service.name, serviceCode: serviceCodeFor(setting, input.service.slug), quantity: 1, chargeCents: input.price.amountCents }],
    totalCents: input.price.amountCents,
    currency: input.price.currency,
    diagnosisCodes: setting.diagnosisCodes,
    provider: { name: input.provider.name, npi: setting.providerNpi.trim(), tin: setting.providerTin.trim(), location: input.provider.location },
    disclaimers: [...setting.disclaimers],
    disputeUrl: setting.disputeUrl,
  };
}

/** Deterministic serialization (sorted keys) that the stored hash covers. */
export function canonicalEstimate(content: EstimateContent): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])]));
    return v;
  };
  return JSON.stringify(norm(content));
}

/** A new estimate is issued only when the service or the amount changes; otherwise the last one stands. */
export function needsNewEstimate(latest: { serviceId: string; amountCents: number; currency: string } | null, current: { serviceId: string; amountCents: number; currency: string }): boolean {
  if (!latest) return true;
  return latest.serviceId !== current.serviceId || latest.amountCents !== current.amountCents || latest.currency !== current.currency;
}

export interface EstimateLine {
  label: string;
  value: string;
}

/**
 * The estimate as labelled plain-text lines, grouped the way the portal page and the PDF copy
 * both show it. Empty owner fields read "Not yet provided" (outside production only; the release
 * check blocks production until they are filled in).
 */
export function estimateSections(c: EstimateContent) {
  const or = (v: string) => v.trim() || "Not yet provided";
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const stamp = (iso: string) => `${new Date(iso).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC`;
  return {
    patient: [
      { label: "Patient", value: c.patient.name },
      { label: "Date of birth", value: c.patient.dateOfBirth ? day(`${c.patient.dateOfBirth}T00:00:00Z`) : "Not provided" },
    ] satisfies EstimateLine[],
    service: [
      { label: "Primary service", value: c.primaryService.name },
      { label: "What it is", value: c.primaryService.description },
      { label: "Scheduled date", value: c.primaryService.scheduledFor ? stamp(c.primaryService.scheduledFor) : "Not scheduled when this estimate was issued" },
    ] satisfies EstimateLine[],
    items: c.items.map((i) => ({ description: i.description, serviceCode: or(i.serviceCode), quantity: String(i.quantity), charge: formatCents(i.chargeCents, c.currency) })),
    total: formatCents(c.totalCents, c.currency),
    diagnosisCodes: c.diagnosisCodes,
    provider: [
      { label: "Provider", value: c.provider.name },
      { label: "National Provider Identifier (NPI)", value: or(c.provider.npi) },
      { label: "Taxpayer Identification Number (TIN)", value: or(c.provider.tin) },
      { label: "Where services are furnished", value: c.provider.location },
    ] satisfies EstimateLine[],
    record: [
      { label: "Estimate issued", value: stamp(c.issuedAt) },
      { label: "Case reference", value: c.reference },
    ] satisfies EstimateLine[],
  };
}
