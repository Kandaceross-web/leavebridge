import type { Metadata } from "next";
import Link from "next/link";
import { Empty } from "@/components/ui";
import { latestEstimate } from "@/server/services/estimates";
import { ownedCase } from "../../../_lib/load";
import { caseHref, stepHref } from "../../../_lib/steps";
import { EstimateBody } from "../../../_components/estimate";
import { PrintButton } from "../../../_components/client";

export const metadata: Metadata = { title: "Good Faith Estimate" };

/** Print-friendly copy of the case's current Good Faith Estimate (45 CFR 149.610(e)). */
export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, extra: estimate } = await ownedCase(id, (ctx, r) => latestEstimate(ctx, r.id));

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="small">
          <Link href={stepHref(row.id, "payment")}>
            <span aria-hidden="true">← </span>Back to payment
          </Link>
        </p>
        <h1>Good Faith Estimate</h1>
        <p className="lede">A written estimate of the expected charges for your self-pay assessment. Print it or save it for your records.</p>
      </header>

      {estimate ? (
        <>
          <div className="btn-row">
            <PrintButton>Print or save as PDF</PrintButton>
            <a className="btn btn-quiet" href={`/api/estimates/${estimate.row.id}`}>
              Download PDF
            </a>
          </div>
          <section className="card stack" aria-label="Good Faith Estimate">
            <EstimateBody content={estimate.content} hash={estimate.row.contentHash} level={2} />
          </section>
        </>
      ) : (
        <Empty title="No estimate yet">
          Your estimate is prepared on the <Link href={stepHref(row.id, "payment")}>payment step</Link> once you have chosen a service. <Link href={caseHref(row.id)}>Back to your case</Link>
        </Empty>
      )}
    </div>
  );
}
