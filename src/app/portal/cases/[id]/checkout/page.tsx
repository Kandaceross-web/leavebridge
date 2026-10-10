import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton } from "@/components/forms";
import { Banner, ButtonLink, DateTime, Icon, Money, ReviewTag } from "@/components/ui";
import { env } from "@/server/env";
import { caseFacts } from "@/server/services/cases";
import { ensureEstimate, latestEstimate } from "@/server/services/estimates";
import { casePayments } from "@/server/services/payments";
import { serviceSummary } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";
import { SETTING_DEFS } from "@/config/settings";
import { gate } from "@/domain/cases/checklist";
import { isDomainError } from "@/domain/errors";
import { ownedCase } from "../../../_lib/load";
import { caseHref, stepHref } from "../../../_lib/steps";
import { EstimateBody } from "../../../_components/estimate";
import { StepHead } from "../../../_components/step-head";
import { beginCheckout } from "./actions";

export const metadata: Metadata = { title: "Payment" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => {
    const payments = await casePayments(ctx, r.id);
    const g = gate(await caseFacts(ctx, r), "payment");
    const isPaid = payments.some((p) => p.status === "paid" || p.status === "partially_refunded");
    // The written Good Faith Estimate is issued before payment opens (LEG-08); afterwards the
    // issued one is shown as it stands. Without an estimate the payment form stays closed.
    let estimate = null;
    let estimateProblem: string | null = null;
    if (!isPaid && g.ok) {
      try {
        estimate = await ensureEstimate(ctx, r);
      } catch (e) {
        if (!isDomainError(e) || e.code !== "invalid") throw e;
        estimateProblem = e.message;
      }
    } else {
      estimate = await latestEstimate(ctx, r.id);
    }
    return {
      service: await serviceSummary(ctx, r.serviceId),
      payments,
      pricing: await getSetting(ctx.tx, "pricing"),
      refund: await getSetting(ctx.tx, "refundPolicy"),
      gate: g,
      estimate,
      estimateProblem,
    };
  });
  const { service, payments, pricing, refund, estimate, estimateProblem } = extra;
  const paid = payments.find((p) => p.status === "paid" || p.status === "partially_refunded");
  const showTags = env.APP_ENV !== "production";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step="payment"
        title="Mental Health Leave & FMLA Evaluation"
        lede="Purchase a comprehensive mental health evaluation to determine whether leave-related clinical documentation is appropriate."
      />
      <p className="lede">
        Price:{" "}
        {service?.priceCents != null ? (
          <Money cents={service.priceCents} currency={service.currency} />
        ) : (
          "—"
        )}
      </p>

      {sp.cancelled ? (
        <Banner tone="info" icon="info">
          Payment was not completed. You have not been charged. You can try again when you are
          ready.
        </Banner>
      ) : null}

      {paid ? (
        <div className="stack">
          <Banner tone="sage" icon="check">
            Payment of <Money cents={paid.amountCents} currency={paid.currency} /> received{" "}
            <DateTime value={paid.paidAt} />. Thank you.
          </Banner>
          <div className="btn-row">
            <ButtonLink href={stepHref(row.id, "consents_intake")}>Continue to consents</ButtonLink>
          </div>
        </div>
      ) : null}

      {!paid && !extra.gate.ok ? (
        <Banner tone="info" icon="lock">
          {extra.gate.reason} <a href={caseHref(row.id)}>Back to your steps</a>
        </Banner>
      ) : null}

      <section className="card stack" aria-labelledby="summary-heading">
        <div className="card-head">
          <h2 id="summary-heading">Summary</h2>
          {showTags ? <ReviewTag tag={SETTING_DEFS.pricing.reviewTag} /> : null}
        </div>
        <div className="row row-between">
          <b>{service?.name ?? "Service not chosen"}</b>
          <b>
            {service?.priceCents != null ? (
              <Money cents={service.priceCents} currency={service.currency} />
            ) : (
              "—"
            )}
          </b>
        </div>
        <p className="small muted">Self-pay. We do not bill insurance. {pricing.paymentTiming}</p>
        <div className="grid g2">
          <div className="stack stack-sm">
            <h3>What the fee covers</h3>
            <ul className="list-check small">
              {pricing.includes.map((t) => (
                <li key={t}>
                  <Icon name="check" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="stack stack-sm">
            <h3>What it does not include</h3>
            <ul className="list-check small">
              {pricing.excludes.map((t) => (
                <li key={t}>
                  <Icon name="x" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {estimate ? (
        <section className="card stack" aria-labelledby="estimate-heading">
          <div className="card-head">
            <h2 id="estimate-heading">Good Faith Estimate</h2>
            {showTags ? <ReviewTag tag={SETTING_DEFS.goodFaithEstimate.reviewTag} /> : null}
          </div>
          <p className="small muted">
            Because you are paying for this service yourself, you have the right to a written
            estimate of the expected charges before you pay. This estimate is saved to your record.
          </p>
          <EstimateBody content={estimate.content} hash={estimate.row.contentHash} level={3} />
          <div className="btn-row">
            <ButtonLink href={`${caseHref(row.id)}/estimate`} variant="secondary">
              Open a printable copy
            </ButtonLink>
            <a className="btn btn-quiet" href={`/api/estimates/${estimate.row.id}`}>
              Download PDF
            </a>
          </div>
        </section>
      ) : null}

      <section className="card-flat stack stack-sm" aria-labelledby="refund-heading">
        <div className="card-head">
          <h2 id="refund-heading">Cancellations and refunds</h2>
          {showTags ? <ReviewTag tag={SETTING_DEFS.refundPolicy.reviewTag} /> : null}
        </div>
        <p className="small">{refund.summary}</p>
        <ul className="list-plain small">
          {refund.rules.map((r) => (
            <li key={r.trigger}>
              <b>{r.refundPercent}% refund</b> · {r.note}
            </li>
          ))}
        </ul>
      </section>

      {estimateProblem ? (
        <Banner tone="warn" icon="info">
          {estimateProblem}
        </Banner>
      ) : null}

      {!paid && extra.gate.ok && estimate ? (
        <ActionForm action={beginCheckout.bind(null, row.id)}>
          <input type="hidden" name="estimateId" value={estimate.row.id} />
          <Banner tone="info" icon="info">
            Payment does not guarantee a diagnosis, documentation, or approval of leave. A licensed
            clinician makes an independent clinical determination, and leave decisions are made by
            your employer or leave administrator. Your employer also decides whether it accepts a
            form from your clinician&rsquo;s license type, so please check with HR before you pay.
          </Banner>
          <Checkbox name="understand" value="yes" required>
            I understand that I am paying for a professional assessment, not a particular outcome,
            and that my employer decides whether to accept the form.
          </Checkbox>
          <SubmitButton pendingText="Opening secure checkout…">
            Continue to Secure Payment{service?.priceCents != null ? " · " : ""}
            {service?.priceCents != null ? (
              <Money cents={service.priceCents} currency={service.currency} />
            ) : null}
          </SubmitButton>
          <p className="fine">
            <Icon name="lock" /> You will complete payment on our payment processor&rsquo;s secure
            page. It receives only the amount and your email for a receipt.
          </p>
        </ActionForm>
      ) : null}
    </div>
  );
}
