import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner, ButtonLink, Icon, Money } from "@/components/ui";
import { sameDayService } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";
import { RECORD_TITLE } from "@/config/same-day";

// Owner spec V1 (2026-10-10), Part 6. The headline, subheadline, steps and price section are the owner's copy.
// "What you receive" states the real workflow (Part 6, "Required service logic"): the screening is scored by
// software; a work or school excuse letter is issued only if a licensed clinician reviews the request and approves it.

const TITLE = "Work & School Excuse Evaluations | LeaveBridge Health";
const DESCRIPTION =
  "Request an online evaluation for mental health-related work or school absence documentation. Confidential intake and clear next steps.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/work-school-excuses" },
  openGraph: { title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  [
    "Tell Us About Your Absence",
    "Complete a confidential intake describing your symptoms, the date of your absence, and the documentation you’re requesting.",
  ],
  [
    "Complete Your Assessment",
    "Answer the required mental health screening questions and provide any additional information needed for evaluation.",
  ],
  [
    "Receive Your Outcome",
    "Receive your screening results and information about the documentation decision. When clinically supported and authorized, your documentation will be made available securely.",
  ],
] as const;

export default async function WorkSchoolExcusesPage() {
  const service = await sameDayService();
  if (!service) notFound();
  const price = service.priceCents !== null ? <Money cents={service.priceCents} /> : "—";
  const start = appHref("/start?product=same-day&entry=work-excuses");
  return (
    <>
      <section className="svc-hero" aria-labelledby="page-title">
        <div className="container svc-hero-grid">
          <div className="stack">
            <h1 id="page-title">Missed Work or School? Your Mental Health Matters, Too.</h1>
            <p className="lede">Not every difficult day comes with a fever.</p>
            <p>
              Anxiety, stress, depression, and emotional exhaustion can affect your ability to work
              or attend school.
            </p>
            <p>
              LeaveBridge Health provides a confidential online process for requesting an evaluation
              for mental health-related absence documentation.
            </p>
          </div>
          <div className="svc-price-chip">
            <p className="svc-price">{price}</p>
            <ButtonLink href={start}>Request an Excuse Evaluation</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="care-title">
        <div className="container-narrow stack">
          <h2 id="care-title">Sometimes, You Need Time to Take Care of Yourself.</h2>
          <p>
            Mental health concerns can affect concentration, energy, emotional well-being, and
            everyday functioning.
          </p>
          <p>
            If you’ve missed work or school because of your mental health, an appropriate
            professional evaluation can help determine whether supporting documentation is
            clinically warranted.
          </p>
          <p>Our goal is to make the request process clear, confidential, and convenient.</p>
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <h2 id="how-title">How It Works</h2>
          </div>
          <ol className="steps2">
            {STEPS.map(([title, body], i) => (
              <li key={title}>
                <span className="num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>
                  <span className="visually-hidden">Step {i + 1}: </span>
                  {title}
                </h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" aria-labelledby="receive-title">
        <div className="container split">
          <div className="stack">
            <h2 id="receive-title">What You Receive</h2>
            <p className="muted">
              Each part of the service is different. Here is what each one is.
            </p>
          </div>
          <ul className="creds">
            <li>
              <span>Questionnaire</span>
              <span>
                You complete standard screening questionnaires (PHQ-9, GAD-7 or both) and questions
                about your symptoms, work and missed time.
              </span>
            </li>
            <li>
              <span>Screening results</span>
              <span>
                Your answers are scored by software and you receive a digitally signed{" "}
                {RECORD_TITLE}. It is not a clinician examination, a diagnosis or an excuse.
              </span>
            </li>
            <li>
              <span>Clinician review</span>
              <span>
                You may then request a work or school excuse letter. A licensed clinician reviews
                your screening and your request individually, without a video visit, and may
                approve, change or decline it.
              </span>
            </li>
            <li>
              <span>Documentation</span>
              <span>
                If the clinician approves, a signed letter with a verifiable document number is made
                available in your secure portal. Anyone you share it with can check it is genuine
                and unchanged.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="price-title">
        <div className="container">
          <div className="price-panel">
            <h2 id="price-title">One Simple Price</h2>
            <p className="svc-price">{price}</p>
            <p>No insurance required.</p>
            <ul className="svc-list">
              <li>
                <Icon name="check" />
                <span>
                  No appointment is needed, and there is no additional charge to request a letter.
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>For adults 18 and older who are located in a state we serve.</span>
              </li>
            </ul>
            <ButtonLink href={start}>Begin Your Evaluation</ButtonLink>
            <p className="svc-disclosure">
              Work or school absence documentation is issued only when supported by an appropriate
              clinical evaluation. Completion of a questionnaire does not guarantee an excuse.{" "}
              <Link href="/legal/financial-policy">Refund policy</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="crisis-title">
        <div className="container-narrow stack">
          <h2 id="crisis-title">If You Are in Crisis</h2>
          <Banner tone="info" icon="info">
            This service is not for emergencies. If an answer about safety holds your screening, a
            clinician reviews it on the next business day, not in real time. If you are in danger,
            call 911 or call or text 988. See <Link href="/crisis">crisis resources</Link>.
          </Banner>
          <p className="small muted">
            Need FMLA paperwork or a longer absence? The{" "}
            <Link href="/fmla-evaluations">Mental Health Leave &amp; FMLA Evaluation</Link> is the
            right service.
          </p>
        </div>
      </section>
    </>
  );
}
