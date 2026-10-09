import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Lockup } from "@/components/ui";
import { NavLink } from "@/components/nav";
import { DevBanner } from "@/components/dev-banner";
import { legalPages, siteSettings, statePages } from "@/server/web/public";
import { env } from "@/server/env";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/services", label: "Leave services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/employers", label: "Employers" },
  { href: "/faq", label: "FAQ" },
  { href: "/resources", label: "Guides" },
  { href: "/contact", label: "Contact" },
];

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [{ brand, crisis }, legal, states] = await Promise.all([siteSettings(), legalPages(), statePages()]);
  // Optional privacy-preserving analytics, marketing pages only (LEG-14). Never rendered in the portal, ops or screening.
  const analyticsSrc = env.SITE_ANALYTICS_SRC;
  const nonce = analyticsSrc ? ((await headers()).get("x-nonce") ?? undefined) : undefined;
  return (
    <>
      {analyticsSrc ? <script src={analyticsSrc} nonce={nonce} defer /> : null}
      <DevBanner />
      <header className="site-header">
        <div className="container bar">
          <Lockup />
          <nav className="site-nav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.href} href={n.href}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="end">
            <Link href="/sign-in" className="btn btn-quiet hide-mobile">
              Sign in
            </Link>
            <Link href="/start?entry=header" className="btn btn-primary btn-sm">
              Get started
            </Link>
            <details className="menu-toggle">
              <summary aria-label="Open menu">Menu</summary>
              <nav className="mobile-nav" aria-label="Mobile">
                {NAV.map((n) => (
                  <NavLink key={n.href} href={n.href}>
                    {n.label}
                  </NavLink>
                ))}
                <NavLink href="/sign-in">Sign in</NavLink>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      <div className="crisis-strip">
        <div className="container">
          <b>Not an emergency service.</b> {crisis.resources.filter((r) => r.href).map((r, i) => (
            <span key={r.label}>
              {i > 0 ? " · " : ""}
              <a href={r.href}>{r.label}</a>
            </span>
          ))}{" "}
          · <Link href="/crisis">More crisis resources</Link>
        </div>
      </div>
      <footer className="site-footer">
        <div className="container">
          <div className="cols">
            <div className="stack stack-sm">
              <Lockup reverse />
              <p>{brand.tagline}</p>
            </div>
            <div>
              <h2>Patients</h2>
              <ul>
                <li><Link href="/how-it-works">How it works</Link></li>
                <li><Link href="/services">Leave services</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/availability">Where we serve</Link></li>
                {states.map((st) => (
                  <li key={st.slug}><Link href={`/states/${st.slug}`}>{st.state.name}</Link></li>
                ))}
                <li><Link href="/start?entry=footer">Check availability</Link></li>
                <li><Link href="/sign-in">Patient portal</Link></li>
              </ul>
            </div>
            <div>
              <h2>Company</h2>
              <ul>
                <li><Link href="/about">About and clinical team</Link></li>
                <li><Link href="/employers">Employer services</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
                <li><Link href="/resources">Guides</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h2>Policies</h2>
              <ul>
                {legal.map((l) => (
                  <li key={l.key}>
                    <Link href={`/legal/${l.key.replace(/^legal\./, "")}`}>{l.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="legal">
            <p>
              LeaveBridge Health provides independent clinical assessments. Clinicians make their own professional determinations. We do not decide FMLA eligibility or
              approve leave; those decisions belong to your employer or leave administrator.
            </p>
            <p>
              Support: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> · {brand.supportHours}
            </p>
            <p>© {new Date().getFullYear()} {brand.name}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
