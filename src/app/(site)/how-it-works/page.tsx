import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Banner, ButtonLink, Icon, Money, PageHead } from "@/components/ui";
import { launchPriceCents, siteSettings } from "@/server/web/public";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The seven steps of a LeaveBridge Health assessment, from a short screening to secure delivery of any documents a licensed clinician completes.",
};

export default async function HowItWorksPage() {
  const [{ pricing, turnaround, crisis }, price] = await Promise.all([siteSettings(), launchPriceCents()]);
  const steps: { title: ReactNode; body: ReactNode; clinical?: boolean }[] = [
    {
      title: "Answer a few screening questions",
      body: "A short set of questions confirms you are 18 or older, located in a state we serve, and looking for the kind of help we provide. No account or payment is needed to check.",
    },
    {
      title: "Create your account, verify your identity and confirm your location",
      body: "You upload a photo ID and confirm where you are physically located. Clinicians can only provide care in states where they are licensed, so your location matters.",
    },
    {
      title: <>Pay {price !== null ? <Money cents={price} /> : "the assessment fee"} securely</>,
      body: <>{pricing.paymentTiming} Payment covers the professional assessment, not a particular result. <Link href="/pricing">Pricing and refunds</Link></>,
    },
    {
      title: "Complete your secure intake",
      body: "You describe your history and how symptoms are affecting work, complete two short standardized questionnaires, and upload any employer or leave-administrator forms. You can save and come back.",
    },
    {
      title: "A licensed clinician reviews your case",
      body: "A clinician licensed in your state reads everything you submitted. They may ask you for more information or schedule a secure video assessment.",
      clinical: true,
    },
    {
      title: "The clinician makes an independent determination",
      body: "Using their own professional judgment, the clinician decides whether leave documentation is clinically supported, and explains the outcome in your portal. The outcome may be that documentation is not supported.",
      clinical: true,
    },
    {
      title: "Signed documents are delivered securely",
      body: "If the clinician completes documentation, the signed documents appear in your portal for you to download. You decide who receives them; we do not send anything to your employer on our own.",
    },
  ];
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="How it works"
        title="Seven steps, one secure portal"
        lede="From a two-minute screening to secure delivery, here is what happens and who does what."
      />

      <div className="two-col">
        <ol className="steps" aria-label="Steps in the assessment">
          {steps.map((s, i) => (
            <li key={i} className={s.clinical ? "clin" : undefined}>
              <b>
                {s.title}
                {s.clinical ? <span className="visually-hidden"> (clinician-only step)</span> : null}
              </b>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>

        <div className="stack">
          <Banner tone="sage" icon="info">
            <b>Clinical steps are clinician-only.</b> Steps 5 and 6 (shaded) are carried out by a licensed clinician alone. No software makes clinical decisions,
            and payment never determines the outcome.
          </Banner>
          <div className="card-flat stack stack-sm">
            <h2>How long it takes</h2>
            <p className="muted">
              {turnaround.showPublicly ? turnaround.publicMessage : "Timelines depend on your case and are shown in your portal."}
            </p>
            <p className="small muted">If you have a documentation deadline, tell us during screening so the clinical team can see it.</p>
          </div>
          <div className="card-flat stack stack-sm">
            <h2>You control sharing</h2>
            <p className="muted">
              Your records stay in your private portal. Nothing is released to an employer, insurer or leave administrator without your written authorization.
            </p>
          </div>
        </div>
      </div>

      <section className="card stack" aria-labelledby="emergency-title">
        <div className={`row ${styles.tight}`}>
          <Icon name="alert" size={20} />
          <h2 id="emergency-title" className="mt-0">
            Emergencies are never handled through this process
          </h2>
        </div>
        <p className="muted">{crisis.body}</p>
        <ul className="list-plain stack stack-sm">
          {crisis.resources.map((r) => (
            <li key={r.label}>
              {r.href ? <a href={r.href}>{r.label}</a> : <b>{r.label}</b>} <span className="muted">— {r.detail}</span>
            </li>
          ))}
        </ul>
        <p className="small">
          <Link href="/crisis">All crisis resources</Link>
        </p>
      </section>

      <section className={`stack text-center ${styles.centered}`} aria-labelledby="next-title">
        <h2 id="next-title">Ready to see if we can help?</h2>
        <p className="lede">Answering the screening questions takes about two minutes.</p>
        <div className={`btn-row ${styles.centerRow}`}>
          <ButtonLink href="/start?entry=how-it-works">Check if we can help</ButtonLink>
          <ButtonLink href="/faq" variant="quiet">
            Common questions
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
