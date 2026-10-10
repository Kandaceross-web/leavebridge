import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Lockup } from "@/components/ui";
import { NavLink } from "@/components/nav";
import { DevBanner } from "@/components/dev-banner";
import { legalPages, siteSettings, statePages } from "@/server/web/public";
import { env } from "@/server/env";
import { appHref } from "@/server/web/app-link";
import { PUBLIC_PROVIDER } from "@/config/provider";

// Owner spec V1 (2026-10-10), Part 3: menu items in this exact order; "Get Started" goes to the service cards.
const NAV = [
  { href: "/work-school-excuses", label: "Work & School Excuses" },
  { href: "/fmla-evaluations", label: "FMLA Evaluations" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [{ brand, crisis }, legal, states] = await Promise.all([
    siteSettings(),
    legalPages(),
    statePages(),
  ]);
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
            <Link href={appHref("/sign-in")} className="signin hide-mobile">
              Patient Sign In
            </Link>
            <Link href="/#services" className="btn btn-primary btn-sm btn-start">
              Get Started
            </Link>
            <details className="menu-toggle">
              <summary aria-label="Menu">
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </svg>
              </summary>
              <nav className="mobile-nav" aria-label="Mobile">
                <NavLink href="/" exact>
                  Home
                </NavLink>
                {NAV.map((n) => (
                  <NavLink key={n.href} href={n.href}>
                    {n.label}
                  </NavLink>
                ))}
                <Link href="/#services" className="btn btn-primary">
                  Get Started
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="main" className="site-main">
        {children}
      </main>
      <div className="crisis-strip">
        <div className="container">
          <b>Not an emergency service.</b> In crisis:{" "}
          {crisis.resources
            .filter((r) => r.href)
            .map((r, i) => (
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
              <p className="blurb">
                Professional mental health evaluations, with convenience and confidentiality at the center of your experience.
              </p>
            </div>
            <div>
              <h2>Services</h2>
              <ul>
                <li>
                  <Link href="/work-school-excuses">Work &amp; School Excuses</Link>
                </li>
                <li>
                  <Link href="/fmla-evaluations">FMLA Evaluations</Link>
                </li>
                <li>
                  <Link href="/fmla-evaluations#accommodations">Workplace Accommodations</Link>
                </li>
                <li>
                  <Link href="/how-it-works">How It Works</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2>Support</h2>
              <ul>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <Link href="/faq">Frequently Asked Questions</Link>
                </li>
                <li>
                  <Link href="/legal/financial-policy">Refund Policy</Link>
                </li>
                <li>
                  <Link href="/accessibility">Accessibility</Link>
                </li>
                <li>
                  <Link href={appHref("/sign-in")}>Patient Sign In</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2>Legal</h2>
              <ul>
                {legal.some((l) => l.key === "legal.privacy") ? (
                  <li>
                    <Link href="/legal/privacy">Privacy Policy</Link>
                  </li>
                ) : null}
                {legal.some((l) => l.key === "legal.terms") ? (
                  <li>
                    <Link href="/legal/terms">Terms of Service</Link>
                  </li>
                ) : null}
                {legal.some((l) => l.key === "legal.notice-of-privacy-practices") ? (
                  <li>
                    <Link href="/legal/notice-of-privacy-practices">Notice of Privacy Practices</Link>
                  </li>
                ) : null}
                {legal.some((l) => l.key === "legal.telehealth") ? (
                  <li>
                    <Link href="/legal/telehealth">Clinical Disclosures</Link>
                  </li>
                ) : null}
                {legal.some((l) => l.key === "legal.records") ? (
                  <li>
                    <Link href="/legal/records">Records Access and Retention</Link>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <div className="legal">
            <p>
              Clinical services are provided by {PUBLIC_PROVIDER.name}, {PUBLIC_PROVIDER.postNominals}:{" "}
              {PUBLIC_PROVIDER.licenses.map((l) => `${l.state} ${l.abbreviation} no. ${l.number}`).join("; ")}. Services are available only to people
              located in {states.map((st) => st.state.name).join(" or ") || "the states we serve"} during care.
            </p>
            <p>
              Clinicians make their own determinations. We do not decide FMLA eligibility or approve leave; your employer or leave administrator does.
            </p>
            <p>
              Support: <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> · {brand.supportHours}
            </p>
            <p>
              © {new Date().getFullYear()} {brand.name}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
