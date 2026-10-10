import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, Icon, Money } from "@/components/ui";
import { Illustration } from "@/components/illustration";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, servicesLd } from "@/server/web/structured-data";
import { activeStates, enabledServices, isProduction, siteSettings } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

// Copy on this page follows the language people use when they search for this help
// (docs/research/2026-10-demand-and-competitors.md): "FMLA paperwork", "no regular doctor",
// "deadline", "will my employer find out". It describes the process and never promises an outcome.
// Claims about who may certify FMLA leave and what employers see are LEGAL_REVIEW_REQUIRED.
// Kept short on purpose (owner feedback, 2026-10): detail lives on /how-it-works, /pricing and /faq.

export const metadata: Metadata = {
  title: { absolute: "LeaveBridge Health · Mental health leave and FMLA paperwork assessments" },
  description:
    "A licensed mental-health clinician assesses you by secure telehealth and decides independently whether leave documentation is supported. Flat self-pay price, no subscription.",
  alternates: { canonical: "/" },
};

const STAGES = [
  { art: "steps/1-check", title: "Check", body: "Two minutes. No account needed." },
  { art: "steps/3-pay", title: "Sign up and pay", body: "Verify your ID and location, then pay once." },
  { art: "steps/4-intake", title: "Intake", body: "Your story, two short questionnaires, your forms." },
  { art: "steps/5-review", title: "Clinician assessment", body: "Review, and a video visit if needed.", clinical: true },
  { art: "steps/7-deliver", title: "Secure delivery", body: "Signed documents in your portal. You share them." },
] as const;

export default async function HomePage() {
  const [{ brand, pricing, crisis }, states, services] = await Promise.all([
    siteSettings(),
    activeStates(),
    enabledServices(),
  ]);
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
              Mental health leave, <span className="hl">assessed properly</span>.
            </h1>
            <p className="sub">
              A licensed clinician meets you by secure video and decides independently whether leave
              paperwork is supported.
            </p>
            <div className="btn-row">
              <ButtonLink href={appHref("/start?entry=home-hero")}>Check if we can help</ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                How it works
              </ButtonLink>
            </div>
            {price !== null ? (
              <p className="mt-3">
                <span className="price-pill">
                  <b>
                    <Money cents={price} />
                  </b>
                  flat fee · self-pay · no subscription
                </span>
              </p>
            ) : null}
            <p className="fine mt-2">
              Payment does not guarantee a diagnosis, certification, documentation or approval of
              leave. <Link href="/pricing">What&rsquo;s included</Link>
            </p>
            <ul className="chips mt-3" aria-label="Why people trust us">
              <li className="chip">
                <Icon name="badge" /> Licensed clinicians{stateNames ? ` in ${stateNames}` : ""}
              </li>
              <li className="chip">
                <Icon name="lock" /> Private, encrypted portal
              </li>
              <li className="chip">
                <Icon name="video" /> Secure video
              </li>
            </ul>
          </div>
          <div className="hero-art">
            <Illustration
              name="hero"
              alt="Illustration of a person on a sofa having a video visit with a clinician on a tablet."
              preload
            />
          </div>
        </section>
      </div>

      <section className="section section-sun" aria-labelledby="familiar-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Sound familiar?</p>
            <h2 id="familiar-title">The usual routes aren&rsquo;t working</h2>
          </div>
          <div className="grid g3">
            <div className="quote">
              <h3>HR gave me a form and a deadline.</h3>
              <p>Tell us your deadline at screening. We&rsquo;ll be honest if it&rsquo;s tight.</p>
            </div>
            <div className="quote">
              <h3>I don&rsquo;t have a regular doctor.</h3>
              <p>No referral needed. A licensed clinician assesses you from the start.</p>
            </div>
            <div className="quote">
              <h3>My therapist can&rsquo;t fill it out.</h3>
              <p>Many don&rsquo;t. Assessments and forms are all we do.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">Five stages, one secure portal</h2>
          </div>
          <ol className="flow flow-5">
            {STAGES.map((s, i) => (
              <li key={s.title} className={"clinical" in s ? "clin" : undefined}>
                <span className="num" aria-hidden="true">
                  {i + 1}
                </span>
                <Illustration name={s.art} alt="" />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {"clinical" in s ? (
                  <span className="clin-tag">
                    <Icon name="badge" /> Clinician only
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="callout-row mt-4">
            <p className="note">
              <Icon name="info" />
              <span>
                Only a licensed clinician makes clinical decisions. No software does, and payment
                never decides the outcome.
              </span>
            </p>
            <ButtonLink href="/how-it-works" variant="secondary">
              See every step
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section section-mint" aria-labelledby="who-title">
        <div className="container grid g2">
          <div className="feature">
            <span className="bubble bubble-mint">
              <Icon name="users" size={26} />
            </span>
            <h2 id="who-title">Who this is for</h2>
            <ul className="list-check">
              <li>
                <Icon name="check" />
                <span>Adults 18 and older</span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  Anxiety, depression, burnout or other symptoms making work hard
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  Physically in {stateNames || "a state we serve"} during care.{" "}
                  <Link href="/availability">Where we serve</Link>
                </span>
              </li>
            </ul>
          </div>
          <div className="feature">
            <span className="bubble bubble-lav">
              <Icon name="x" size={26} />
            </span>
            <h2>This is not</h2>
            <ul className="list-check">
              {[
                "Emergency or crisis care",
                "Ongoing therapy or medication",
                "A decision on FMLA eligibility or leave approval",
                "A guarantee of any outcome",
              ].map((t) => (
                <li key={t}>
                  <Icon name="x" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="small">
              <b>In crisis?</b>{" "}
              {crisis.resources
                .filter((r) => r.href)
                .map((r, i) => (
                  <span key={r.label}>
                    {i > 0 ? " · " : ""}
                    <a href={r.href}>{r.label}</a>
                  </span>
                ))}{" "}
              · <Link href="/crisis">More crisis resources</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="trust-title">
        <div className="container split">
          <div className="stack stack-lg">
            <h2 id="trust-title">Two things to know first</h2>
            {!isProduction ? (
              <Banner tone="warn" icon="alert">
                <b>Pending legal review.</b> These statements about employers and FMLA rules are not
                final until reviewed.
              </Banner>
            ) : null}
            <div className="media">
              <span className="bubble bubble-teal">
                <Icon name="lock" size={24} />
              </span>
              <div className="stack stack-sm">
                <h3>You choose who sees it</h3>
                <p className="muted">
                  Read everything in your portal before you share it. We never contact your
                  employer unless you ask, and we don&rsquo;t bill insurance.
                </p>
              </div>
            </div>
            <div className="media">
              <span className="bubble bubble-sun">
                <Icon name="file" size={24} />
              </span>
              <div className="stack stack-sm">
                <h3>Check with HR before you pay</h3>
                <p className="muted">
                  FMLA rules limit which providers may certify leave, and some employers accept only
                  certain license types. Ask HR or your leave administrator if they accept a licensed
                  mental-health clinician. <Link href="/faq">Learn more</Link>
                </p>
              </div>
            </div>
          </div>
          <div className="split-art">
            <Illustration name="privacy" alt="" />
          </div>
        </div>
      </section>

      <section className="section section-lavender" aria-labelledby="cost-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Clear prices</p>
            <h2 id="cost-title">One flat price. No subscription.</h2>
          </div>
          <div className="grid g2">
            <div className="price-card">
              <p className="eyebrow">{primary?.name ?? "Mental Health Leave Assessment"}</p>
              <p className="price">
                {price !== null ? <Money cents={price} /> : "—"}
                <small>self-pay</small>
              </p>
              <h3>What the assessment covers</h3>
              <ul className="list-check">
                {pricing.includes.map((item) => (
                  <li key={item}>
                    <Icon name="check" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {priced.some((s) => s !== primary) ? (
                <ul className="price-list" aria-label="Other services">
                  {priced.filter((s) => s !== primary).map((s) => (
                    <li key={s.slug}>
                      <span>{s.name}</span>
                      <b>
                        <Money cents={s.priceCents ?? 0} />
                      </b>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div>
                <ButtonLink href={appHref("/start?entry=home-price")}>
                  Check if we can help
                </ButtonLink>
              </div>
            </div>
            <div className="feature">
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
                Self-pay only; we don&rsquo;t bill insurance. Refunds depend on how far your case
                has gone. <Link href="/pricing">Pricing and refunds</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="next-title">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 id="next-title">Your next step</h2>
              <p className="lede">
                See if we can help in about two minutes. No account or payment needed.
              </p>
              <div className="btn-row">
                <ButtonLink href={appHref("/start?entry=home-footer")}>
                  Check if we can help
                </ButtonLink>
                <ButtonLink href="/resources" variant="quiet">
                  Read our guides
                </ButtonLink>
              </div>
            </div>
            <Illustration name="next-step" alt="" />
          </div>
        </div>
      </section>
    </>
  );
}
