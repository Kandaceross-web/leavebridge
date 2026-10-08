import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, Icon, Money, PageHead } from "@/components/ui";
import styles from "../site.module.css";
import { enabledServices, isProduction, launchPriceCents, siteSettings } from "@/server/web/public";

export const metadata: Metadata = {
  title: "Pricing and refunds",
  description: "What the self-pay assessment fee covers, what it does not, when you pay, and how refunds work.",
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
  const [{ pricing, refundPolicy }, price, services] = await Promise.all([siteSettings(), launchPriceCents(), enabledServices()]);
  const primary = services[0];
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="Pricing"
        title="One clear, self-pay price"
        lede="You pay for a professional assessment by a licensed clinician. The fee is the same whatever the outcome."
      />

      <div className="grid g2">
        <section className="svc" aria-labelledby="price-title">
          <p className="eyebrow">{primary?.name ?? "Mental Health Leave Assessment"}</p>
          <p className="price" id="price-title">
            {price !== null ? <Money cents={price} /> : "—"}
            <small>self-pay</small>
          </p>
          <h2 className="mt-1">What the fee covers</h2>
          <ul className="list-check">
            {pricing.includes.map((item) => (
              <li key={item}>
                <Icon name="check" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <ButtonLink href="/start">Check if we can help</ButtonLink>
        </section>

        <div className="stack">
          <section className="card-flat stack stack-sm" aria-labelledby="excl-title">
            <h2 id="excl-title">What it does not cover or guarantee</h2>
            <ul className="list-check">
              {pricing.excludes.map((item) => (
                <li key={item}>
                  <Icon name="x" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card-flat stack stack-sm" aria-labelledby="when-title">
            <h2 id="when-title">When you pay</h2>
            <p className="muted">{pricing.paymentTiming}</p>
          </section>
          <section className="card-flat stack stack-sm" aria-labelledby="ins-title">
            <h2 id="ins-title">Self-pay only</h2>
            <p className="muted">
              We do not bill insurance. We cannot tell you whether your insurer or benefits plan will reimburse the fee.
            </p>
          </section>
        </div>
      </div>

      <section className="stack" aria-labelledby="refund-title">
        <h2 id="refund-title">Cancellations and refunds</h2>
        {!isProduction ? (
          <Banner tone="warn" icon="alert">
            <b>Pending legal review.</b> This refund policy is a draft and is not final until it has been reviewed.
          </Banner>
        ) : null}
        <p className="muted">{refundPolicy.summary}</p>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
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
                  <th scope="row">
                    {TRIGGER_LABELS[r.trigger] ?? r.trigger}
                  </th>
                  <td className="nowrap">{r.refundPercent}%</td>
                  <td className="muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          A late cancellation means cancelling a video appointment less than {refundPolicy.lateCancelHours} hours before it starts. The complete policy is shown
          before you pay. Questions about a charge? <Link href="/contact">Contact billing support</Link>.
        </p>
      </section>
    </div>
  );
}
