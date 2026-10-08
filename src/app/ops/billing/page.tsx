import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, DateTime, Empty, Money, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { billingPayments } from "@/server/services/ops-queries";
import type { RefundTrigger } from "@/domain/payments/refunds";
import { TRIGGER_LABEL } from "../cases/[id]/_tabs/payments";
import { approveRefundAction } from "./actions";

export const metadata: Metadata = { title: "Payments & refunds" };

const PAY_TONE: Record<string, "neutral" | "progress" | "action" | "alert" | "info"> = {
  paid: "progress",
  pending: "neutral",
  failed: "alert",
  refunded: "info",
  partially_refunded: "action",
  cancelled: "neutral",
};

export default async function BillingPage() {
  const { actor } = await requireStaffSession(["billing", "admin"]);
  const { payments, pending } = await run(actor, (ctx) => billingPayments(ctx));
  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Oversight" title="Payments & refunds" lede="Recent payments by case reference. Refunds are requested from the case’s Payments tab." />

      <section aria-labelledby="pend-h" className="stack">
        <h2 id="pend-h">Refunds awaiting a second approver</h2>
        {pending.length ? (
          <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Case</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Of payment</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Requested by</th>
                  <th scope="col">Requested</th>
                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/ops/cases/${r.caseId}?tab=payments`} className="mono">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="num">
                      <Money cents={r.amountCents} currency={r.currency} />
                    </td>
                    <td className="num">
                      <Money cents={r.amountPaid} currency={r.currency} />
                    </td>
                    <td>{TRIGGER_LABEL[r.reasonCode as RefundTrigger] ?? r.reasonCode}</td>
                    <td className="break">{r.requesterEmail ?? "—"}</td>
                    <td className="nowrap">
                      <DateTime value={r.createdAt} />
                    </td>
                    <td>
                      {r.requestedBy === actor.userId ? (
                        <span className="fine">You requested this; another approver is needed.</span>
                      ) : (
                        <ActionForm action={approveRefundAction.bind(null, r.caseId, r.id)} className="">
                          <SubmitButton size="sm" variant="secondary">
                            Approve
                          </SubmitButton>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing awaiting approval" />
        )}
      </section>

      <section aria-labelledby="pay-h" className="stack">
        <h2 id="pay-h">Recent payments</h2>
        {payments.length ? (
          <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Case</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Refunded</th>
                  <th scope="col">Refund status</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const latest = p.refunds[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/ops/cases/${p.caseId}?tab=payments`} className="mono">
                          {p.reference}
                        </Link>
                      </td>
                      <td className="num">
                        <Money cents={p.amountCents} currency={p.currency} />
                      </td>
                      <td>
                        <Badge tone={PAY_TONE[p.status] ?? "neutral"}>{p.status.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="num">{p.refundedCents ? <Money cents={p.refundedCents} currency={p.currency} /> : "—"}</td>
                      <td>{latest ? `${latest.status}${latest.withinPolicy ? "" : " (above policy)"}` : "—"}</td>
                      <td className="nowrap">
                        <DateTime value={p.paidAt} />
                      </td>
                      <td className="nowrap">
                        <DateTime value={p.createdAt} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No payments yet" />
        )}
      </section>
    </div>
  );
}
