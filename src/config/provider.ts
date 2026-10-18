/**
 * Public provider listing: who provides care, as approved by the owner for publication (2026-10-10; LPC-S and Board Qualified Supervisor added by the owner the same day).
 * Shown as three cards near the bottom of the homepage, in full on /credentials, and in the footer; never as branding.
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
  /** Homepage card (owner's credentials redesign, 2026-10-10): designation lines and the number line. */
  card: { lines: string[]; number: string | null };
  /** Full credentials panel and /credentials page: the exact designation, home state for a privilege, and number. */
  detail: { lines: string[]; homeState?: string; number: string };
}

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
      card: { lines: ["Licensed Professional Counselor", "Board Qualified Supervisor"], number: "LPC-S | License #2581" },
      detail: { lines: ["Licensed Professional Counselor", "Board Qualified Supervisor"], number: "License #2581" },
    },
    {
      state: "Tennessee",
      title: "Licensed Professional Counselor, Mental Health Service Provider, Approved Supervisor",
      abbreviation: "LPC-MHSP (Approved Supervisor)",
      number: "7583",
      kind: "license",
      card: {
        lines: ["Licensed Professional Counselor", "Mental Health Service Provider", "Approved Supervisor"],
        number: "LPC-MHSP | License #7583",
      },
      detail: {
        lines: ["Licensed Professional Counselor — Mental Health Service Provider", "Approved Supervisor"],
        number: "License #7583",
      },
    },
    // Added 2026-10-10 from the owner's CompactConnect record: active 10/10/2026, expires 4/30/2027, home state Tennessee.
    {
      state: "Georgia",
      title:
        "Counseling Compact privilege to practice as a Licensed Professional Counselor, home state Tennessee",
      abbreviation: "LPC",
      number: "LPC-GA-3372",
      kind: "compact_privilege",
      // Owner, 2026-10-10: privilege cards read only the privilege number (e.g. "LPC-GA-3372"); the full panel gives the basis.
      card: { lines: ["LPC-GA-3372"], number: null },
      detail: {
        lines: ["Licensed Professional Counselor practicing under a Counseling Compact privilege"],
        homeState: "Tennessee",
        number: "Privilege #LPC-GA-3372",
      },
    },
    // Added 2026-10-18 from the owner's CompactConnect record: active 10/18/2026, expires 4/30/2027, home state Tennessee.
    {
      state: "Minnesota",
      title:
        "Counseling Compact privilege to practice as a Licensed Professional Counselor, home state Tennessee",
      abbreviation: "LPC",
      number: "LPC-MN-3470",
      kind: "compact_privilege",
      card: { lines: ["LPC-MN-3470"], number: null },
      detail: {
        lines: ["Licensed Professional Counselor practicing under a Counseling Compact privilege"],
        homeState: "Tennessee",
        number: "Privilege #LPC-MN-3470",
      },
    },
    // Added 2026-10-18 from the owner's CompactConnect record: active 10/18/2026, expires 4/30/2027, home state Tennessee.
    {
      state: "Ohio",
      title:
        "Counseling Compact privilege to practice as a Licensed Professional Counselor, home state Tennessee",
      abbreviation: "LPC",
      number: "LPC-OH-3471",
      kind: "compact_privilege",
      card: { lines: ["LPC-OH-3471"], number: null },
      detail: {
        lines: ["Licensed Professional Counselor practicing under a Counseling Compact privilege"],
        homeState: "Tennessee",
        number: "Privilege #LPC-OH-3471",
      },
    },
  ] satisfies PublicLicense[],
  certifications: ["National Certified Counselor (NCC)"],
  /** Not a physician: say so wherever the provider is described. */
  profession: "Licensed professional counselor",
} as const;
