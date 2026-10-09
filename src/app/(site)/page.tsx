import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, Icon, Money } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, servicesLd } from "@/server/web/structured-data";
import { activeStates, enabledServices, isProduction, siteSettings } from "@/server/web/public";
import styles from "./site.module.css";

// Copy on this page follows the language people use when they search for this help
// (docs/research/2026-10-demand-and-competitors.md): "FMLA paperwork", "no regular doctor",
// "deadline", "will my employer find out". It describes the process and never promises an outcome.
// Claims about who may certify FMLA leave and what employers see are LEGAL_REVIEW_REQUIRED.

export const metadata: Metadata = {
  title: { absolute: "LeaveBridge Health · Mental health leave and FMLA paperwork assessments" },
  description: "A licensed mental-health clinician assesses you by secure telehealth and decides independently whether leave documentation is supported. Flat self-pay price, no subscription.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [{ brand, pricing, turnaround, crisis }, states, services] = await Promise.all([siteSettings(), activeStates(), enabledServices()]);
  const primary = services[0];
  const price = primary?.priceCents ?? null;
  const priced = services.filter((s) => s.priceCents !== null);
  const stateNames = states.map((s) => s.name).join(" and ");
  return (
    <>
      <JsonLd data={[organizationLd(brand.name, states), ...servicesLd(services, states)]} />
      <div className="hero-band">
        <section className="container hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">FMLA and mental health leave paperwork</p>
            <h1 id="hero-title" className="mt-1">
              When your mental health needs time off, get a real assessment, not a rubber stamp.
            </h1>
            <p className="sub">
              A licensed mental-health clinician reviews your situation, meets with you by secure video when needed, and decides independently whether leave
              documentation is clinically supported. One flat self-pay price, no subscription.
            </p>
            <div className="btn-row">
              <ButtonLink href="/start?entry=home-hero">Check if we can help</ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                How it works
              </ButtonLink>
            </div>
            <div className="trust">
              <span>
                <Icon name="badge" /> Licensed clinicians{stateNames ? ` in ${stateNames}` : ""}
              </span>
              <span>
                <Icon name="lock" /> Encrypted, private portal
              </span>
              <span>
                <Icon name="video" /> Secure telehealth
              </span>
            </div>
          </div>
          <aside className="svc" aria-labelledby="price-title">
            <p className="eyebrow">{primary?.name ?? "Mental Health Leave Assessment"}</p>
            <p className="price" id="price-title">
              {price !== null ? <Money cents={price} /> : "—"}
              <small>self-pay</small>
            </p>
            <ul className="list-check">
              {pricing.includes.map((item) => (
                <li key={item}>
                  <Icon name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="fine">
              Payment covers the professional assessment. It does not guarantee a diagnosis, documentation, or approval of leave by your employer.{" "}
              <Link href="/pricing">What&rsquo;s included</Link>
            </p>
          </aside>
        </section>
      </div>

      <section className="section section-sun" aria-labelledby="familiar-title">
        <div className="container stack stack-lg">
          <div className="stack stack-sm">
            <p className="eyebrow">Sound familiar?</p>
            <h2 id="familiar-title">You need paperwork, and the usual routes aren&rsquo;t working</h2>
          </div>
          <div className="grid g3">
            <div className="card card-accent stack stack-sm">
              <h3>&ldquo;HR gave me a form and a deadline.&rdquo;</h3>
              <p className="muted">Tell us your deadline during screening so the clinical team can see it. We can&rsquo;t promise a date, and we&rsquo;ll be honest if it&rsquo;s tight.</p>
            </div>
            <div className="card card-accent stack stack-sm">
              <h3>&ldquo;I don&rsquo;t have a regular doctor.&rdquo;</h3>
              <p className="muted">You don&rsquo;t need a referral or an existing provider. A licensed clinician assesses you from the start.</p>
            </div>
            <div className="card card-accent stack stack-sm">
              <h3>&ldquo;My therapist says they can&rsquo;t fill it out.&rdquo;</h3>
              <p className="muted">Many therapy services don&rsquo;t complete employer forms. Completing them after a proper assessment is all we do.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="who-title">
        <div className="container grid g2">
          <div className="stack">
            <h2 id="who-title">Who this is for</h2>
            <p className="lede">
              Adults 18 and older whose anxiety, depression, burnout, or other mental-health symptoms are making work difficult, and who may need medical documentation
              for continuous leave, intermittent leave, or a reduced schedule.
            </p>
            <p className="muted">
              You must be physically located in a state where our clinicians are licensed when you receive care.{" "}
              {states.length ? (
                <>
                  We currently serve {states.map((s) => s.name).join(", ")}. <Link href="/availability">Where we serve</Link>
                </>
              ) : (
                <Link href="/availability">See where we serve</Link>
              )}
            </p>
          </div>
          <div className="card-flat card-lavender stack">
            <h3>This service is not</h3>
            <ul className="list-check">
              {["Emergency or crisis care", "Ongoing therapy or medication management", "A decision about FMLA eligibility or leave approval", "A guarantee of any outcome"].map((t) => (
                <li key={t}>
                  <Icon name="x" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="small">
              Not for emergencies. If you are in crisis:{" "}
              {crisis.resources
                .filter((r) => r.href)
                .map((r, i) => (
                  <span key={r.label}>
                    {i > 0 ? " · " : ""}
                    <a href={r.href}>{r.label}</a>
                  </span>
                ))}
              . <Link href="/crisis">More crisis resources</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section section-mint" aria-labelledby="how-title">
        <div className="container stack-lg stack">
          <div className="stack stack-sm">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">Seven steps, one secure portal</h2>
          </div>
          <div className="grid g2">
            <ol className="steps">
              <li>
                <b>Answer a few questions</b>
                <span>Two minutes to confirm we can help and that you are in a state we serve.</span>
              </li>
              <li>
                <b>Create your account and verify your identity</b>
                <span>Upload a photo ID and confirm where you are located.</span>
              </li>
              <li>
                <b>Pay {price !== null ? <Money cents={price} /> : "the assessment fee"} securely</b>
                <span>{pricing.paymentTiming}</span>
              </li>
              <li>
                <b>Complete your secure intake</b>
                <span>Your history, how symptoms affect work, two short questionnaires, and any employer forms.</span>
              </li>
              <li className="clin">
                <b>A licensed clinician reviews your case</b>
                <span>They may ask for more information or schedule a video assessment.</span>
              </li>
              <li className="clin">
                <b>Independent clinical determination</b>
                <span>The clinician decides whether documentation is clinically supported, and explains the outcome.</span>
              </li>
              <li>
                <b>Secure delivery</b>
                <span>Signed documents appear in your portal. You decide who receives them.</span>
              </li>
            </ol>
            <div className="stack">
              <div className="banner banner-sage">
                <Icon name="info" />
                <div>
                  <b>Your clinician&rsquo;s judgment is independent.</b> Steps 5 and 6 are made by a licensed clinician alone. No software makes clinical decisions,
                  and payment never determines the outcome.
                </div>
              </div>
              <div className="card-flat stack stack-sm">
                <h3>How fast</h3>
                {turnaround.showPublicly ? <p className="muted">{turnaround.publicMessage}</p> : <p className="muted">Timelines depend on your case and are shown in your portal.</p>}
                <p className="small muted">If you have a documentation deadline, tell us during screening so the clinical team can see it.</p>
              </div>
              <ButtonLink href="/how-it-works" variant="secondary">
                Read the full process
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="trust-title">
        <div className="container stack stack-lg">
          <h2 id="trust-title">Two things to know before you start</h2>
          {!isProduction ? (
            <Banner tone="warn" icon="alert">
              <b>Pending legal review.</b> The statements in this section describe how employers and FMLA rules may treat documentation and are not final until reviewed.
            </Banner>
          ) : null}
          <div className="grid g2">
            <div className="card card-mint stack stack-sm">
              <h3>What your employer sees</h3>
              <p>
                You decide who receives your documents. Employer forms generally ask about the condition&rsquo;s effect on your work and the time needed, and you can
                read everything in your portal before you share it.
              </p>
              <p className="small muted">We never contact your employer unless you ask us to, and we don&rsquo;t bill insurance.</p>
            </div>
            <div className="card card-sun stack stack-sm">
              <h3>Who completes your forms</h3>
              <p>
                Forms are completed by a licensed mental-health clinician. FMLA rules list which provider types may certify leave, and some employers and benefit
                plans accept only certain ones.
              </p>
              <p className="small">
                <b>Check with your HR team or leave administrator that they accept your clinician&rsquo;s license type before you pay.</b>{" "}
                <Link href="/faq">Read more in our FAQ</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-lavender" aria-labelledby="cost-title">
        <div className="container stack stack-lg">
          <div className="stack stack-sm">
            <p className="eyebrow">Clear prices</p>
            <h2 id="cost-title">One flat price. No subscription, no surprise charges.</h2>
          </div>
          {priced.length ? (
            <div className="grid g3">
              {priced.map((s) => (
                <div key={s.slug} className="card stack stack-sm">
                  <h3>{s.name}</h3>
                  <p className="price">
                    <Money cents={s.priceCents ?? 0} />
                  </p>
                  <p className="small muted">{s.summary}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid g2">
            <div className="stack">
              <h3>What the assessment covers</h3>
              <ul className="list-check">
                {pricing.includes.map((item) => (
                  <li key={item}>
                    <Icon name="check" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="stack">
              <h3>What it doesn&rsquo;t guarantee</h3>
              <ul className="list-check">
                {pricing.excludes.map((item) => (
                  <li key={item}>
                    <Icon name="x" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="small muted">
                Self-pay only; we do not bill insurance. Refunds depend on how far your case has progressed. <Link href="/pricing">Pricing and refunds</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="next-title">
        <div className={`container stack text-center ${styles.centered}`}>
          <h2 id="next-title">Your next step</h2>
          <p className="lede">Answer a few questions to see whether this service is available to you. No account or payment needed to check.</p>
          <div className={`btn-row ${styles.centerRow}`}>
            <ButtonLink href="/start?entry=home-footer">Check if we can help</ButtonLink>
            <ButtonLink href="/resources" variant="quiet">
              Read our guides
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
