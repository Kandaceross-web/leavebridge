import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ButtonLink, Icon, Money } from "@/components/ui";
import { Illustration, SiteHero, type ArtName } from "@/components/illustration";
import { launchPriceCents, siteSettings } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The seven steps of a LeaveBridge Health assessment, from a short screening to secure delivery of any documents a licensed clinician completes.",
};

export default async function HowItWorksPage() {
  const [{ pricing, turnaround, crisis }, price] = await Promise.all([
    siteSettings(),
    launchPriceCents(),
  ]);
  const steps: { art: ArtName; title: ReactNode; body: ReactNode; more: ReactNode; clinical?: boolean }[] = [
    {
      art: "steps/1-check",
      title: "Answer a few questions",
      body: "About two minutes. No account or payment.",
      more: "We confirm you are 18 or older, located in a state we serve, and looking for the kind of help we provide.",
    },
    {
      art: "steps/2-account",
      title: "Verify your ID and location",
      body: "Upload a photo ID and confirm where you are.",
      more: "Clinicians can only provide care in states where they are licensed, so where you are physically located matters.",
    },
    {
      art: "steps/3-pay",
      title: <>Pay {price !== null ? <Money cents={price} /> : "the fee"} securely</>,
      body: "One flat fee for the assessment, not a result.",
      more: (
        <>
          {pricing.paymentTiming} <Link href="/pricing">Pricing and refunds</Link>
        </>
      ),
    },
    {
      art: "steps/4-intake",
      title: "Complete your intake",
      body: "Your history, two short questionnaires, your forms.",
      more: "Describe how symptoms affect work and upload any employer or leave-administrator forms. You can save and come back.",
    },
    {
      art: "steps/5-review",
      title: "A clinician reviews your case",
      body: "They may ask questions or book a video visit.",
      more: "A clinician licensed in your state reads everything you submitted.",
      clinical: true,
    },
    {
      art: "steps/6-decision",
      title: "An independent decision",
      body: "The clinician decides, and explains why.",
      more: "Using their own professional judgment, the clinician decides whether leave documentation is clinically supported. The outcome may be that it is not.",
      clinical: true,
    },
    {
      art: "steps/7-deliver",
      title: "Secure delivery",
      body: "Signed documents in your portal. You share them.",
      more: "You decide who receives your documents. We do not send anything to your employer on our own.",
    },
  ];
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="How it works"
        title="Seven steps, one secure portal"
        lede="From a two-minute check to documents in your hands."
        art="hero"
        artAlt="Illustration of a person on a sofa having a video visit with a clinician on a tablet."
      />

      <ol className="flow flow-cols-4" aria-label="Steps in the assessment">
        {steps.map((s, i) => (
          <li key={i} className={s.clinical ? "clin" : undefined}>
            <span className="num" aria-hidden="true">
              {i + 1}
            </span>
            <Illustration name={s.art} alt="" />
            <h2 className="h3-size">
              {s.title}
              {s.clinical ? <span className="visually-hidden"> (clinician-only step)</span> : null}
            </h2>
            <p>{s.body}</p>
            {s.clinical ? (
              <span className="clin-tag">
                <Icon name="badge" /> Clinician only
              </span>
            ) : null}
            <details className="more">
              <summary>More detail</summary>
              <div>
                <p>{s.more}</p>
              </div>
            </details>
          </li>
        ))}
      </ol>

      <div className="grid g3">
        <div className="feature">
          <span className="bubble bubble-teal">
            <Icon name="badge" size={24} />
          </span>
          <h2 className="h3-size">Clinical steps are clinician-only</h2>
          <p>No software makes clinical decisions. Payment never decides the outcome.</p>
        </div>
        <div className="feature">
          <span className="bubble bubble-sun">
            <Icon name="clock" size={24} />
          </span>
          <h2 className="h3-size">How long it takes</h2>
          <p>
            {turnaround.showPublicly
              ? turnaround.publicMessage
              : "Timelines depend on your case and are shown in your portal."}{" "}
            Have a deadline? Tell us at screening so the clinical team can see it.
          </p>
        </div>
        <div className="feature">
          <span className="bubble">
            <Icon name="lock" size={24} />
          </span>
          <h2 className="h3-size">You control sharing</h2>
          <p>
            Nothing goes to an employer, insurer or leave administrator without your written
            authorization.
          </p>
        </div>
      </div>

      <section className="crisis-card" aria-labelledby="emergency-title">
        <div className="media">
          <Icon name="alert" size={22} />
          <h2 id="emergency-title" className="h3-size">
            Not for emergencies
          </h2>
        </div>
        <p>{crisis.body}</p>
        <ul className="list-plain stack stack-sm">
          {crisis.resources.map((r) => (
            <li key={r.label}>
              {r.href ? <a href={r.href}>{r.label}</a> : <b>{r.label}</b>}{" "}
              <span className="muted">— {r.detail}</span>
            </li>
          ))}
        </ul>
        <p className="small">
          <Link href="/crisis">All crisis resources</Link>
        </p>
      </section>

      <section className="cta-band" aria-labelledby="next-title">
        <div>
          <h2 id="next-title">Ready to see if we can help?</h2>
          <p className="lede">The screening questions take about two minutes.</p>
          <div className="btn-row">
            <ButtonLink href={appHref("/start?entry=how-it-works")}>Check if we can help</ButtonLink>
            <ButtonLink href="/faq" variant="quiet">
              Common questions
            </ButtonLink>
          </div>
        </div>
        <Illustration name="next-step" alt="" />
      </section>
    </div>
  );
}
