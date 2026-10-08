import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, DateTime, Empty, Money } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { casePaymentDetail } from "@/server/services/ops-queries";
import { refundPreview } from "@/server/services/payments";
import { formatCents, policyRefundCents, type RefundTrigger } from "@/domain/payments/refunds";
import { hasRole } from "@/domain/policy";
import { requestRefundAction } from "../actions";
import { approveRefundAction } from "../../../billing/actions";
import type { TabProps } from "../_shared";

export const TRIGGER_LABEL: Record<RefundTrigger, string> = {
  before_intake_submitted: "Cancelled before intake was submitted",
  after_intake_before_review: "After intake, before clinical review",
  clinician_out_of_scope: "Clinician found the service not appropriate",
  emergency_routed: "Paused for safety reasons",
  no_show: "No-show",
  late_cancel: "Late cancellation",
  after_determination: "After the determination",
};

export async function PaymentsTab({ ws, actor }: TabProps) {
  const canRefund = hasRole(actor, ["billing", "admin"]);
  const { payments, previews } = await run(actor, async (ctx) => {
    const detail = await casePaymentDetail(ctx, ws.row.id);
    const previews = canRefund ? await Promise.all(detail.payments.map((p) => refundPreview(ctx, detail.row, p.amountCents, p.refundedCents))) : [];
    return { payments: detail.payments, previews };
  });
  if (!payments.length) return <Empty title="No payments on this case" />;

  return (
    <div className="stack stack-lg">
      {payments.map((p, i) => {
        const preview = previews[i];
        const refundable = ["paid", "partially_refunded"].includes(p.status);
        return (
          <section key={p.id} className="card stack" aria-labelledby={`pay-${p.id}`}>
            <div className="card-head">
              <h2 id={`pay-${p.id}`}>
                <Money cents={p.amountCents} currency={p.currency} />
              </h2>
              <span className="tag">{p.status.replace(/_/g, " ")}</span>
            </div>
            <dl className="kv">
              <dt>Created</dt>
              <dd>
                <DateTime value={p.createdAt} />
              </dd>
              <dt>Paid</dt>
              <dd>
                <DateTime value={p.paidAt} />
              </dd>
              <dt>Refunded</dt>
              <dd>
                <Money cents={p.refundedCents} currency={p.currency} />
              </dd>
              <dt>Processor</dt>
              <dd className="mono small">{p.provider}</dd>
            </dl>
            {p.refunds.length ? (
              <div className="tbl-wrap" style={{ position: "relative" }}>
                <table className="t">
                  <thead>
                    <tr>
                      <th scope="col">Requested</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Reason</th>
                      <th scope="col">Policy</th>
                      <th scope="col">Status</th>
                      <th scope="col">By</th>
                      <th scope="col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.refunds.map((r) => (
                      <tr key={r.id}>
                        <td className="nowrap">
                          <DateTime value={r.createdAt} />
                        </td>
                        <td className="num">
                          <Money cents={r.amountCents} currency={p.currency} />
                        </td>
                        <td>{TRIGGER_LABEL[r.reasonCode as RefundTrigger] ?? r.reasonCode}</td>
                        <td>{r.withinPolicy ? "Within policy" : <Badge tone="action">Above policy</Badge>}</td>
                        <td>{r.status}</td>
                        <td className="break">{r.requesterEmail ?? "—"}</td>
                        <td>
                          {r.status === "requested" && canRefund && r.requestedBy !== actor.userId ? (
                            <ActionForm action={approveRefundAction.bind(null, ws.row.id, r.id)} className="">
                              <SubmitButton size="sm" variant="secondary">
                                Approve
                              </SubmitButton>
                            </ActionForm>
                          ) : r.status === "requested" ? (
                            <span className="fine">Needs a different approver</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {canRefund && refundable && preview ? (
              <details>
                <summary className="btn btn-secondary btn-sm">Request a refund</summary>
                <div className="mt-2 stack">
                  <p className="small muted">
                    Suggested reason for this case&rsquo;s stage: <b>{TRIGGER_LABEL[preview.trigger]}</b> · policy amount <b>{formatCents(preview.policyCents, p.currency)}</b>. Amounts above the policy amount need a second approver. Refunding asks you to confirm your password.
                  </p>
                  <ActionForm action={requestRefundAction.bind(null, ws.row.id, p.id)}>
                    <SelectField
                      name="trigger"
                      label="Reason"
                      required
                      defaultValue={preview.trigger}
                      options={preview.rules.map((rule) => ({
                        value: rule.trigger,
                        label: `${TRIGGER_LABEL[rule.trigger]} · policy ${formatCents(policyRefundCents(preview.rules, rule.trigger, p.amountCents, p.refundedCents), p.currency)}`,
                      }))}
                    />
                    <TextField
                      name="amount"
                      label="Amount (USD)"
                      hint={`Up to ${formatCents(p.amountCents - p.refundedCents, p.currency)} remains refundable.`}
                      required
                      inputMode="text"
                      defaultValue={(preview.policyCents / 100).toFixed(2)}
                    />
                    <SubmitButton variant="secondary">Submit refund</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
