import type { ReactNode } from "react";
import { Lockup } from "@/components/ui";
import { NavLink } from "@/components/nav";
import { DevBanner } from "@/components/dev-banner";
import { requireStaffSession } from "@/server/auth/guards";
import { hasRole } from "@/domain/policy";
import type { Actor } from "@/domain/actor";

export const metadata = { title: { default: "Operations", template: "%s · LeaveBridge ops" }, robots: { index: false } };

type StaffActor = Extract<Actor, { kind: "staff" }>;

function navFor(actor: StaffActor) {
  const isAdmin = hasRole(actor, ["admin"]);
  const work = [
    { href: "/ops", label: "Overview", exact: true },
    { href: "/ops/board", label: "Case board" },
    { href: "/ops/cases", label: "Cases" },
    { href: "/ops/schedule", label: "Schedule" },
    { href: "/ops/safety", label: "Safety follow-up" },
  ];
  const admin = [
    ...(isAdmin || hasRole(actor, ["compliance"]) ? [{ href: "/ops/admin/jurisdictions", label: "States" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance", "clinical_director"]) ? [{ href: "/ops/admin/clinicians", label: "Clinicians & licenses" }] : []),
    ...(isAdmin ? [{ href: "/ops/admin/services", label: "Services & pricing" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance"]) ? [{ href: "/ops/admin/consents", label: "Consents" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance", "clinical_director"]) ? [{ href: "/ops/admin/content", label: "Content & FAQ" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance"]) ? [{ href: "/ops/admin/templates", label: "Notification templates" }] : []),
    ...(isAdmin || hasRole(actor, ["clinical_director"]) ? [{ href: "/ops/admin/questionnaires", label: "Screening & measures" }] : []),
    ...(isAdmin ? [{ href: "/ops/admin/settings", label: "Business rules" }] : []),
    ...(isAdmin ? [{ href: "/ops/admin/staff", label: "Staff & roles" }] : []),
    ...(isAdmin ? [{ href: "/ops/admin/organizations", label: "Employers & referrals" }] : []),
    ...(isAdmin ? [{ href: "/ops/admin/acquisition", label: "Acquisition" }] : []),
    ...(isAdmin || hasRole(actor, ["clinical_director"]) ? [{ href: "/ops/admin/waitlist", label: "Waitlist" }] : []),
  ];
  const compliance = [
    ...(isAdmin || hasRole(actor, ["compliance", "clinical_director"]) ? [{ href: "/ops/admin/access", label: "Access grants" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance", "clinical_director"]) ? [{ href: "/ops/admin/security-review", label: "Security review" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance"]) ? [{ href: "/ops/audit", label: "Audit log" }] : []),
    ...(isAdmin || hasRole(actor, ["compliance"]) ? [{ href: "/ops/admin/reviews", label: "Compliance reviews" }] : []),
    ...(hasRole(actor, ["billing", "admin"]) ? [{ href: "/ops/billing", label: "Payments & refunds" }] : []),
  ];
  return { work, admin, compliance };
}

export default async function OpsLayout({ children }: { children: ReactNode }) {
  const { session, actor } = await requireStaffSession();
  const nav = navFor(actor);
  const links = (items: { href: string; label: string; exact?: boolean }[]) =>
    items.map((i) => (
      <NavLink key={i.href} href={i.href} exact={i.exact}>
        {i.label}
      </NavLink>
    ));
  return (
    <>
      <DevBanner />
      <div className="ops-shell">
        <aside className="ops-side" aria-label="Operations navigation">
          <Lockup href="/ops" reverse />
          <nav aria-label="Work">{links(nav.work)}</nav>
          {nav.admin.length ? (
            <>
              <p className="group">Configuration</p>
              <nav aria-label="Configuration">{links(nav.admin)}</nav>
            </>
          ) : null}
          {nav.compliance.length ? (
            <>
              <p className="group">Oversight</p>
              <nav aria-label="Oversight">{links(nav.compliance)}</nav>
            </>
          ) : null}
        </aside>
        <div>
          <details className="ops-mobile-nav">
            <summary>Menu</summary>
            <nav aria-label="Operations (mobile)">{links([...nav.work, ...nav.admin, ...nav.compliance])}</nav>
          </details>
          <main id="main" className="ops-main">
            <div className="ops-top">
              <span className="muted">
                {session.firstName ?? session.email} · {actor.roles.join(", ").replace(/_/g, " ")}
              </span>
              <form action="/sign-out" method="post">
                <button type="submit" className="btn btn-quiet btn-sm">
                  Sign out
                </button>
              </form>
            </div>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
