/**
 * Public provider listing: who provides care, as approved by the owner for publication (2026-10-10; LPC-S and Board Qualified Supervisor added by the owner the same day).
 * Shown discreetly on the homepage ("Clinical credentials") and on /about, and nowhere as branding.
 * This is published reference information, not a fixture: the development database holds only fictional
 * clinicians, and the public site must never show them. Keep in step with the verified license records in ops.
 */
export interface PublicLicense {
  state: string;
  title: string;
  abbreviation: string;
  number: string;
}

export const PUBLIC_PROVIDER = {
  name: "Kandace S. Ross",
  postNominals: "LPC-S, NCC",
  licenses: [
    { state: "Mississippi", title: "Licensed Professional Counselor, Board Qualified Supervisor", abbreviation: "LPC-S", number: "2581" },
    { state: "Tennessee", title: "Licensed Professional Counselor, Mental Health Service Provider, Approved Supervisor", abbreviation: "LPC-MHSP (Approved Supervisor)", number: "7581" },
  ] satisfies PublicLicense[],
  certifications: ["National Certified Counselor (NCC)"],
  /** Not a physician: say so wherever the provider is described. */
  profession: "Licensed professional counselor",
} as const;
