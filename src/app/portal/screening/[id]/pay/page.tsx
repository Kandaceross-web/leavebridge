import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, Checkbox, SubmitButton } from "@/components/forms";
import { Banner, ButtonLink, Icon, Money, ReviewTag } from "@/components/ui";
import { env } from "@/server/env";
import { ensureEstimate } from "@/server/services/estimates";
import { serviceSummary } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";
import { SETTING_DEFS } from "@/config/settings";
import {
  PURCHASE_ACKNOWLEDGEMENT,
  SAME_DAY_REVIEW,
  SAME_DAY_SERVICE_NAME,
} from "@/config/same-day";
import { isDomainError } from "@/domain/errors";
import { EstimateBody } from "../../../_components/estimate";
import { ownedScreening, screeningHref } from "../../_lib/load";
import { payAction } from "../actions";

export const metadata: Metadata = { title: "Work & School Excuse Evaluation" };

export default async function SameDayPayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { view, extra } = await ownedScreening(id, async (ctx, v) => {
    let estimate = null;
    let estimateProblem: string | null = null;
    // The written Good Faith Estimate is issued before payment opens (LEG-08), as for every service.
    if (v.row.status === "started" && !v.checkoutBlocker) {
      try {
        estimate = await ensureEstimate(ctx, v.row);
      } catch (e) {
        if (!isDomainError(e) || e.code !== "invalid") throw e;
        estimateProblem = e.message;
      }
    }
    return {
      service: await serviceSummary(ctx, v.row.serviceId),
      refund: await getSetting(ctx.tx, "refundPolicy"),
      estimate,
      estimateProblem,
    };
  });
  const { row, checkoutBlocker } = view;
  if (row.status !== "started") redirect(screeningHref(row.id));
  const { service, refund, estimate, estimateProblem } = extra;
  const showTags = env.APP_ENV !== "production";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="eyebrow">Reference {row.reference}</p>
        <h1>Work &amp; School Excuse Evaluation</h1>
        <p className="lede">
          Price:{" "}
          {service?.priceCents != null ? (
            <Money cents={service.priceCents} currency={service.currency} />
          ) : (
            "—"
          )}
        </p>
        <p>
          Complete the required intake and assessment process for your mental health-related
          documentation request.
        </p>
        <p className="small muted">
          Your payment covers an automated screening and a record of it. It does not guarantee any
          letter, certification, diagnosis or leave approval.
        </p>
      </header>
      <p className="small">
        <Link href={screeningHref(row.id)}>Back to your screening</Link>
      </p>

      {sp.cancelled ? (
        <Banner tone="info" icon="info">
          Payment was not completed. You have not been charged. You can try again when you are
          ready.
        </Banner>
      ) : null}

      {checkoutBlocker ? (
        <Banner tone="info" icon="lock">
          {checkoutBlocker}
        </Banner>
      ) : null}

      <section className="card stack" aria-labelledby="sum-h">
        <h2 id="sum-h">Summary</h2>
        <div className="row row-between">
          <b>{service?.name ?? SAME_DAY_SERVICE_NAME}</b>
          <b>
            {service?.priceCents != null ? (
              <Money cents={service.priceCents} currency={service.currency} />
            ) : (
              "—"
            )}
          </b>
        </div>
        <p className="small muted">
          Self-pay. We do not bill insurance. Payment is taken now, before your questionnaires open.
        </p>
        <ul className="list-check small">
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
            <span>
              A digitally signed Automated Mental Health Screening Record with a verification number
            </span>
          </li>
          <li>
            <Icon name="x" />
            <span>Not a clinician examination, diagnosis, FMLA certification or work excuse</span>
          </li>
        </ul>
        <h3>Clinician review</h3>
        <p className="small">
          Your screening is scored by software. After you receive your record you may request a work
          excuse letter at no additional charge. A licensed clinician reviews each request
          individually and may approve, change or decline it.
        </p>
        <h3>Processing time</h3>
        <p className="small">
          Your screening record is available as soon as you finish. Letter requests are reviewed by
          a clinician; we do not promise a set turnaround.
        </p>
      </section>

      {estimate ? (
        <section className="card stack" aria-labelledby="gfe-h">
          <div className="card-head">
            <h2 id="gfe-h">Good Faith Estimate</h2>
            {showTags ? <ReviewTag tag={SETTING_DEFS.goodFaithEstimate.reviewTag} /> : null}
          </div>
          <p className="small muted">
            Because you are paying for this service yourself, you have the right to a written
            estimate of the expected charges before you pay. It is saved to your record.
          </p>
          <EstimateBody content={estimate.content} hash={estimate.row.contentHash} level={3} />
          <div className="btn-row">
            <a className="btn btn-quiet" href={`/api/estimates/${estimate.row.id}`}>
              Download estimate PDF
            </a>
          </div>
        </section>
      ) : null}

      <section className="card-flat stack stack-sm" aria-labelledby="refund-h">
        <div className="card-head">
          <h2 id="refund-h">Refunds</h2>
          {showTags ? <ReviewTag tag={SETTING_DEFS.refundPolicy.reviewTag} /> : null}
        </div>
        <p className="small">{refund.summary}</p>
        <p className="small muted">
          If a clinician needs to review your answers before the record is issued, the practice
          reviews the payment for that screening and contacts you.
        </p>
      </section>

      {estimateProblem ? (
        <Banner tone="warn" icon="info">
          {estimateProblem}
        </Banner>
      ) : null}

      {!checkoutBlocker && estimate ? (
        <ActionForm action={payAction.bind(null, row.id)} className="form card">
          <input type="hidden" name="estimateId" value={estimate.row.id} />
          <div className="stack stack-sm">
            <div className="card-head">
              <h2>Please confirm</h2>
              {showTags ? <ReviewTag tag={SAME_DAY_REVIEW.legal} /> : null}
            </div>
            <ul className="list-check small">
              {PURCHASE_ACKNOWLEDGEMENT.map((t) => (
                <li key={t}>
                  <Icon name="info" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Checkbox name="acknowledge" value="yes" required>
            I have read and understand these statements.
          </Checkbox>
          <SubmitButton pendingText="Opening secure checkout…">
            Continue to Secure Payment{service?.priceCents != null ? " · " : ""}
            {service?.priceCents != null ? (
              <Money cents={service.priceCents} currency={service.currency} />
            ) : null}
          </SubmitButton>
          <p className="fine">
            <Icon name="lock" /> You will complete payment on our payment processor&rsquo;s secure
            page. It receives only the amount, a general description and your email for a receipt.
          </p>
        </ActionForm>
      ) : null}

      {checkoutBlocker ? (
        <div className="btn-row">
          <ButtonLink href={screeningHref(row.id)} variant="secondary">
            Back to your screening
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
