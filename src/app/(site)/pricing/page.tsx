import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, Icon, Money } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import styles from "../site.module.css";
import { enabledServices, isProduction, launchPriceCents, sameDayService, siteSettings } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "Pricing and refunds",
  description:
    "What the self-pay assessment fee covers, what it does not, when you pay, and how refunds work.",
};

const TRIGGER_LABELS: Record<string, string> = {
  before_intake_submitted: "You cancel before submitting your intake",
  after_intake_before_review: "You cancel after submitting intake, before clinician review",
  clinician_out_of_scope: "The clinician decides this service is not appropriate for you",
  emergency_routed: "Your case is paused for safety reasons",
  no_show: "You miss a scheduled video appointment without notice",
  late_cancel: "You cancel a video appointment late",
  after_determination: "After the clinician has made a determination",
};

export default async function PricingPage() {
  const [{ pricing, refundPolicy }, price, services, sameDay] = await Promise.all([
    siteSettings(),
    launchPriceCents(),
    enabledServices(),
    sameDayService(),
  ]);
  const primary = services[0];
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="Pricing"
        title="One clear, self-pay price"
        lede="You pay for a professional assessment. The fee is the same whatever the outcome."
        art="pricing"
      />

      <div className="grid g2">
        <section className="price-card" aria-labelledby="price-title">
          <p className="eyebrow">{primary?.name ?? "Mental Health Leave Assessment"}</p>
          <p className="price" id="price-title">
            {price !== null ? <Money cents={price} /> : "—"}
            <small>self-pay</small>
          </p>
          <h2 className="h3-size">What the fee covers</h2>
          <ul className="list-check">
            {pricing.includes.map((item) => (
              <li key={item}>
                <Icon name="check" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div>
            <ButtonLink href={appHref("/start?entry=pricing")}>Check if we can help</ButtonLink>
          </div>
        </section>

        <div className="stack">
          <section className="feature" aria-labelledby="excl-title">
            <h2 id="excl-title" className="h3-size">
              What it doesn&rsquo;t cover or guarantee
            </h2>
            <ul className="list-check">
              {pricing.excludes.map((item) => (
                <li key={item}>
                  <Icon name="x" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="feature media" aria-labelledby="when-title">
            <span className="bubble bubble-sun">
              <Icon name="calendar" size={24} />
            </span>
            <div className="stack stack-sm">
              <h2 id="when-title" className="h3-size">
                When you pay
              </h2>
              <p>{pricing.paymentTiming}</p>
            </div>
          </section>
          <section className="feature media" aria-labelledby="ins-title">
            <span className="bubble bubble-teal">
              <Icon name="shield" size={24} />
            </span>
            <div className="stack stack-sm">
              <h2 id="ins-title" className="h3-size">
                Self-pay only
              </h2>
              <p>We don&rsquo;t bill insurance, and can&rsquo;t say whether your plan will reimburse the fee.</p>
            </div>
          </section>
        </div>
      </div>

      {sameDay ? (
        <section className="card-flat stack stack-sm" aria-labelledby="same-day-price">
          <h2 id="same-day-price">{sameDay.name}</h2>
          <p className="muted">
            {sameDay.priceCents !== null ? <Money cents={sameDay.priceCents} /> : "—"} self-pay, paid before the questionnaires open. An automated screening record, not a clinician
            examination or work excuse. <Link href="/services/same-day-mental-health-assessment">What it includes</Link>
          </p>
        </section>
      ) : null}

      <section className="stack" aria-labelledby="refund-title">
        <h2 id="refund-title">Cancellations and refunds</h2>
        {!isProduction ? (
          <Banner tone="warn" icon="alert">
            <b>Pending legal review.</b> This refund policy is a draft and is not final until it has
            been reviewed.
          </Banner>
        ) : null}
        <p className="muted">{refundPolicy.summary}</p>
        <div
          className="tbl-wrap"
          tabIndex={0}
          role="region"
          aria-label="Table, scrolls sideways on small screens"
        >
          <table className={`t ${styles.refunds}`}>
            <caption className="visually-hidden">Refund amount by situation</caption>
            <thead>
              <tr>
                <th scope="col">Situation</th>
                <th scope="col">Refund</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {refundPolicy.rules.map((r) => (
                <tr key={r.trigger}>
                  <th scope="row">{TRIGGER_LABELS[r.trigger] ?? r.trigger}</th>
                  <td className="nowrap">{r.refundPercent}%</td>
                  <td className="muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Late cancellation means less than {refundPolicy.lateCancelHours} hours before a video
          appointment. You see the full policy before you pay. Questions about a charge?{" "}
          <Link href="/contact">Contact billing support</Link>.
        </p>
      </section>
    </div>
  );
}
