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
  /** A state license, or a Counseling Compact privilege to practice based on the home-state license. */
  kind: "license" | "compact_privilege";
}

/** "Licensed Professional Counselor … (LPC-S)" for a license; a privilege's title already names the profession. */
export const credentialTitle = (l: PublicLicense) =>
  l.kind === "compact_privilege" ? l.title : `${l.title} (${l.abbreviation})`;

/** "license no. 2581" or "privilege no. LPC-GA-3372". */
export const credentialNumber = (l: PublicLicense) =>
  `${l.kind === "compact_privilege" ? "privilege" : "license"} no. ${l.number}`;

export const PUBLIC_PROVIDER = {
  name: "Kandace S. Ross",
  postNominals: "LPC-S, NCC",
  licenses: [
    {
      state: "Mississippi",
      title: "Licensed Professional Counselor, Board Qualified Supervisor",
      abbreviation: "LPC-S",
      number: "2581",
      kind: "license",
    },
    {
      state: "Tennessee",
      title: "Licensed Professional Counselor, Mental Health Service Provider, Approved Supervisor",
      abbreviation: "LPC-MHSP (Approved Supervisor)",
      number: "7583",
      kind: "license",
    },
    // Added 2026-10-10 from the owner's CompactConnect record: active 10/10/2026, expires 4/30/2027, home state Tennessee.
    {
      state: "Georgia",
      title:
        "Counseling Compact privilege to practice as a Licensed Professional Counselor, home state Tennessee",
      abbreviation: "LPC",
      number: "LPC-GA-3372",
      kind: "compact_privilege",
    },
  ] satisfies PublicLicense[],
  certifications: ["National Certified Counselor (NCC)"],
  /** Not a physician: say so wherever the provider is described. */
  profession: "Licensed professional counselor",
} as const;
