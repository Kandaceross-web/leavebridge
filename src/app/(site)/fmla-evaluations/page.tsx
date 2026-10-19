import Link from "next/link";
import type { Metadata } from "next";
import { Photo } from "@/components/site";
import { ButtonLink, Icon, Money } from "@/components/ui";
import { enabledServices, siteSettings } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";
import { LEAVE_CATEGORIES } from "@/config/home";

// Owner spec V1 (2026-10-10), Part 7. Headline, sections, categories and final CTA are the owner's copy.

const TITLE = "Mental Health FMLA Evaluations | LeaveBridge Health";
const DESCRIPTION = "Explore professional mental health evaluations for FMLA, intermittent leave, continuous leave, and workplace accommodations.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/fmla-evaluations" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const anchor = (title: string) => title.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "").replace(/^workplace-/, "");

export default async function FmlaEvaluationsPage() {
  const [services, { pricing }] = await Promise.all([enabledServices(), siteSettings()]);
  const leave = services.find((s) => s.slug === "mental-health-leave-assessment") ?? services[0];
  const cents = leave?.priceCents ?? null;
  const price = cents !== null ? <Money cents={cents} /> : "—";
  const start = appHref("/start?entry=fmla");
  return (
    <>
      <section className="svc-hero" aria-labelledby="page-title">
        <div className="container svc-hero-grid">
          <div className="stack">
            <h1 id="page-title">Your Health Matters. Your Career Does, Too.</h1>
            <p className="lede">When mental health challenges begin affecting your ability to work, navigating medical leave shouldn’t add to your stress.</p>
            <p>
              LeaveBridge Health provides confidential mental health evaluations for individuals seeking appropriate documentation related to medical leave and workplace
              accommodations.
            </p>
          </div>
          <div className="svc-price-chip">
            <Photo name="page-leave" className="chip-photo" eager sizes="(max-width: 860px) 100vw, 420px" />
            <p className="svc-price">{price}</p>
            <ButtonLink href={start}>Begin Your Confidential Evaluation</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="support-title">
        <div className="container-narrow stack">
          <h2 id="support-title">Support for Your Next Step.</h2>
          <p>Mental health conditions can affect attendance, concentration, productivity, and daily functioning.</p>
          <p>Our evaluation process is designed to help determine whether your mental health concerns support a request for workplace leave or accommodations.</p>
          <p>Every clinical determination is based on the information obtained during your evaluation.</p>
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="options-title">
        <div className="container">
          <div className="section-head">
            <h2 id="options-title">Explore Your Leave Options</h2>
            <p className="lede">
              Mental health concerns affect everyone differently. Your evaluation helps determine what type of documentation, if any, may be clinically appropriate.
            </p>
          </div>
          <div className="cat-grid">
            {LEAVE_CATEGORIES.map(([title, body]) => (
              <div key={title} id={anchor(title)} className="cat-card">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-3">
            <Link href="/faq#evaluation-requirements">Learn About Evaluation Requirements</Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="includes-title">
        <div className="container split">
          <div className="stack">
            <h2 id="includes-title">What Your Evaluation Includes</h2>
            <p className="muted">Self-pay. No subscription, and we do not bill insurance.</p>
          </div>
          <div className="stack">
            <ul className="svc-list">
              {pricing.includes.map((x) => (
                <li key={x}>
                  <Icon name="check" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <p className="svc-disclosure">
              Clinical findings determine whether documentation can be issued. FMLA eligibility and employer approval are separate determinations.{" "}
              <Link href="/pricing">Pricing and refunds</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="final-band" aria-labelledby="next-title">
        <div className="container final-inner">
          <h2 id="next-title">Take the Next Step With Confidence.</h2>
          <p>Start your confidential mental health leave evaluation online.</p>
          <ButtonLink href={start}>
            Begin Your Evaluation{cents !== null ? <> — <Money cents={cents} /></> : null}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
