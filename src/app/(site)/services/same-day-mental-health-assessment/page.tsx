import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banner, ButtonLink, Icon, Money, PageHead, ReviewTag } from "@/components/ui";
import { isProduction, sameDayService } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";
import { RECORD_STATEMENT, RECORD_TITLE, SAME_DAY_REVIEW, SAME_DAY_SERVICE_NAME } from "@/config/same-day";

export const metadata: Metadata = {
  title: SAME_DAY_SERVICE_NAME,
  description:
    "An automated mental health screening you can complete any time: the PHQ-9, the GAD-7 or both, questions about work, and a digitally signed screening record. Not a clinician examination or work excuse.",
};

const STEPS = [
  { title: "Check we can help", body: "Two quick question sets about where you are and your safety." },
  { title: "Create your account", body: "Then confirm your email address." },
  { title: "Pay securely", body: "You see a written estimate first." },
  { title: "Answer the questionnaires", body: "The PHQ-9, the GAD-7 or both, plus questions about symptoms, work and missed time." },
  { title: "Get your record", body: "Your answers are scored automatically and your signed record is ready in your portal. We email you a link to sign in." },
];

export default async function SameDayServicePage() {
  const service = await sameDayService();
  if (!service) notFound();
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="Screening service"
        title={SAME_DAY_SERVICE_NAME}
        lede="A standard mental health screening you can complete online at any time, with a digitally signed record of the results."
      />

      <div className="grid g2">
        <section className="svc" aria-labelledby="price-h">
          <p className="eyebrow">{SAME_DAY_SERVICE_NAME}</p>
          <p className="price" id="price-h">
            {service.priceCents !== null ? <Money cents={service.priceCents} /> : "—"}
            <small>self-pay</small>
          </p>
          <ul className="list-check">
            <li>
              <Icon name="check" />
              <span>The PHQ-9, the GAD-7, or both, scored automatically</span>
            </li>
            <li>
              <Icon name="check" />
              <span>Questions about symptoms, work and missed time</span>
            </li>
            <li>
              <Icon name="check" />
              <span>An {RECORD_TITLE} with a document number, a QR code and a digital signature anyone can check</span>
            </li>
          </ul>
          <ButtonLink href={appHref("/start?product=same-day&entry=same-day")}>Start the screening</ButtonLink>
        </section>

        <section className="card-flat stack stack-sm" aria-labelledby="not-h">
          <div className="row row-between">
            <h2 id="not-h">What it is not</h2>
            {!isProduction ? <ReviewTag tag={SAME_DAY_REVIEW.legal} /> : null}
          </div>
          <p>{RECORD_STATEMENT}</p>
          <p className="small muted">
            Paying does not mean you will receive any letter, diagnosis, certification or leave. Your employer or leave administrator decides about leave.
          </p>
        </section>
      </div>

      <section className="stack" aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="grid g3 list-plain">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card-flat stack stack-sm">
              <p className="eyebrow">Step {i + 1}</p>
              <h3>{s.title}</h3>
              <p className="small muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid g2" aria-label="Letters and safety">
        <div className="stack stack-sm">
          <h2>Need a work excuse letter?</h2>
          <p className="muted">
            After your record is issued you can ask for a work excuse letter. A licensed clinician reviews your screening and your request and decides whether to issue one. They may change
            it or decline. For FMLA forms or a longer absence, a <Link href="/services">clinician-led leave assessment</Link> is the right service.
          </p>
        </div>
        <div className="stack stack-sm">
          <h2>If you are in crisis</h2>
          <Banner tone="info" icon="info">
            This service is not for emergencies. If an answer about safety holds your screening, a clinician reviews it on the next business day, not in real time. If you are in danger, call 911 or call or text 988. See <Link href="/crisis">crisis resources</Link>.
          </Banner>
          <p className="small muted">Some answers, such as thoughts of self-harm, mean a clinician looks at your screening before the record is issued.</p>
        </div>
      </section>

      <p className="small muted">
        Anyone you share your record with can confirm it is genuine on our verification page, which never shows health information.
      </p>
    </div>
  );
}
