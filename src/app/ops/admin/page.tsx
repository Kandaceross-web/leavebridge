import Link from "next/link";
import type { Metadata } from "next";
import { requireStaffSession, run } from "@/server/auth/guards";
import { openReviewTags } from "@/server/services/admin-queries";
import { hasRole } from "@/domain/policy";
import { Banner, PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Configuration" };

const SECTIONS = [
  { href: "/ops/admin/jurisdictions", label: "States", detail: "Where the service is offered and each state's activation checklist.", roles: ["admin", "compliance"] },
  { href: "/ops/admin/clinicians", label: "Clinicians & licenses", detail: "Licenses, compact privileges and service authorizations.", roles: ["admin", "compliance", "clinical_director"] },
  { href: "/ops/admin/services", label: "Services & pricing", detail: "Which leave services are offered and what they cost.", roles: ["admin"] },
  { href: "/ops/admin/consents", label: "Consents", detail: "Versioned consent documents.", roles: ["admin", "compliance"] },
  { href: "/ops/admin/content", label: "Content & FAQ", detail: "FAQ answers and legal pages.", roles: ["admin", "compliance", "clinical_director"] },
  { href: "/ops/admin/templates", label: "Notification templates", detail: "Email and SMS wording, without clinical details.", roles: ["admin", "compliance"] },
  { href: "/ops/admin/questionnaires", label: "Screening & measures", detail: "Screening rules and validated questionnaires.", roles: ["admin", "clinical_director"] },
  { href: "/ops/admin/settings", label: "Business rules", detail: "Refunds, turnaround, scheduling, security and retention settings.", roles: ["admin"] },
  { href: "/ops/admin/staff", label: "Staff & roles", detail: "Staff accounts and their roles.", roles: ["admin"] },
  { href: "/ops/admin/organizations", label: "Employers & referrals", detail: "Referral links and de-identified counts.", roles: ["admin"] },
  { href: "/ops/admin/acquisition", label: "Acquisition", detail: "Which channels, campaigns and pages lead to screenings and paid assessments.", roles: ["admin"] },
  { href: "/ops/admin/access", label: "Access grants", detail: "Time-limited break-glass access, with reasons.", roles: ["admin", "compliance", "clinical_director"] },
  { href: "/ops/admin/reviews", label: "Compliance reviews", detail: "Recorded reviews and every open review tag.", roles: ["admin", "compliance"] },
] as const;

export default async function AdminHome() {
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canSeeTags = hasRole(actor, ["admin", "compliance"]);
  const open = canSeeTags ? await run(actor, (ctx) => openReviewTags(ctx)) : [];
  const sections = SECTIONS.filter((s) => hasRole(actor, s.roles));
  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Operations" title="Configuration" lede="Business rules, content and credentials. Every change is audited." />
      {canSeeTags && open.length ? (
        <Banner tone="warn" icon="alert">
          {open.length} published or enabled items still carry a review tag and will block a production release.{" "}
          <Link href="/ops/admin/reviews">See open review tags</Link>
        </Banner>
      ) : null}
      <ul className="grid g2 list-plain">
        {sections.map((s) => (
          <li key={s.href} className="card-flat stack stack-sm">
            <h2>
              <Link href={s.href}>{s.label}</Link>
            </h2>
            <p className="small muted">{s.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
