import Link from "next/link";
import { ActionForm, ChoiceGroup, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { Badge, DateTime, KeyValue, Money } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { assignableClinicians } from "@/server/services/ops-queries";
import { STATUS_STAFF_LABEL } from "@/domain/cases/state-machine";
import { hasRole } from "@/domain/policy";
import { PriorityBadge, StatusBadge } from "../../_ui";
import { assignAction, cancelRequestAction, closeCaseAction, createRequestAction, reviewIdentityAction, screeningReviewAction } from "../actions";
import { LEAVE_TYPE_LABEL, type TabProps } from "../_shared";

const REQUEST_KIND_LABEL: Record<string, string> = {
  employer_form: "Employer form",
  supporting_document: "Supporting document",
  identity: "Photo ID",
  information: "Clinical information",
};

const SCREENING_REVIEW_LABEL: Record<string, string> = {
  none: "Not required",
  pending: "Awaiting clinician review",
  cleared: "Cleared to continue",
  declined: "Declined",
};

export async function SummaryTab({ ws, actor }: TabProps) {
  const { row } = ws;
  const canAssign = hasRole(actor, ["clinician", "clinical_director", "admin"]) && !["closed", "cancelled"].includes(row.status);
  const options = canAssign ? await run(actor, (ctx) => assignableClinicians(ctx, row.id)) : [];
  const assignOptions = hasRole(actor, ["clinical_director", "admin"]) ? options : options.filter((o) => o.id === actor.clinicianId);
  const canReviewIdentity = hasRole(actor, ["admin", "support", "clinician", "clinical_director"]);
  const canRequest = hasRole(actor, ["clinician", "clinical_director", "admin", "support"]);
  const canScreeningReview = row.screeningReview === "pending" && hasRole(actor, ["clinician", "clinical_director"]);
  const canClose = hasRole(actor, ["clinician", "clinical_director", "admin"]) && ["completed", "delivered"].includes(row.status);
  const paid = ws.payments.find((p) => p.status === "paid" || p.status === "partially_refunded" || p.status === "refunded");
  const openReqs = ws.requests.filter((r) => r.status === "open");

  return (
    <div className="two-col">
        <div className="stack stack-lg">
          <section className="card stack" aria-labelledby="sum-case">
            <h2 id="sum-case">Case</h2>
            <KeyValue
              items={[
                ["Status", <StatusBadge key="s" status={row.status} />],
                ["Priority", row.priority === "urgent" ? <PriorityBadge key="p" priority="urgent" /> : "Normal"],
                ["Screening outcome", ws.screeningOutcome ? <span className="tag">{ws.screeningOutcome}</span> : "—"],
                ["Screening review", SCREENING_REVIEW_LABEL[row.screeningReview] ?? row.screeningReview],
                ["Service", ws.service?.name ?? "—"],
                ["Leave type requested", row.requestedLeaveType ? LEAVE_TYPE_LABEL[row.requestedLeaveType] : "—"],
                ["Employer", ws.employerName ?? "—"],
                ["Documentation deadline", row.documentationDeadline ? <DateTime key="d" value={row.documentationDeadline} dateOnly /> : "—"],
                ["State", row.jurisdictionCode ?? "—"],
                ["Created", <DateTime key="c" value={row.createdAt} />],
                ["Submitted", <DateTime key="sub" value={row.submittedAt} />],
                ["Last activity", <DateTime key="la" value={row.lastActivityAt} />],
              ]}
            />
          </section>

          {canScreeningReview ? (
            <section className="card stack" aria-labelledby="sum-screen">
              <h2 id="sum-screen">Screening review</h2>
              <p className="muted small">This screening needs a clinician to decide whether the patient may continue to payment. Your note is saved as a clinical note.</p>
              <ActionForm action={screeningReviewAction.bind(null, row.id)}>
                <ChoiceGroup
                  name="decision"
                  legend="Decision"
                  required
                  options={[
                    { value: "cleared", label: "Clear to continue" },
                    { value: "declined", label: "Decline (cancels the case)" },
                  ]}
                />
                <TextArea name="note" label="Note" required rows={3} maxLength={2000} />
                <SubmitButton>Record screening review</SubmitButton>
              </ActionForm>
            </section>
          ) : null}

          <section className="card stack" aria-labelledby="sum-req">
            <h2 id="sum-req">Requests to the patient</h2>
            {ws.requests.length ? (
              <ul className="list-rows">
                {ws.requests.map((r) => (
                  <li key={r.id}>
                    <div className="grow stack stack-sm">
                      <span className="row">
                        <b>{REQUEST_KIND_LABEL[r.kind] ?? r.kind}</b>
                        <Badge tone={r.status === "open" ? "action" : r.status === "fulfilled" ? "progress" : "neutral"}>{r.status}</Badge>
                      </span>
                      {r.message ? <span className="small break">{r.message}</span> : <span className="muted small">Request text is visible with clinical access.</span>}
                      {r.response ? <span className="small muted break">Response: {r.response}</span> : null}
                      <span className="fine">
                        <DateTime value={r.createdAt} />
                      </span>
                    </div>
                    {r.status === "open" && canRequest ? (
                      <ActionForm action={cancelRequestAction.bind(null, row.id, r.id)} className="">
                        <SubmitButton variant="quiet" size="sm">
                          Withdraw
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No requests yet.</p>
            )}
            {canRequest && !["closed", "cancelled"].includes(row.status) ? (
              <details>
                <summary className="btn btn-secondary btn-sm">New request</summary>
                <div className="mt-2">
                  <ActionForm action={createRequestAction.bind(null, row.id)}>
                    <SelectField
                      name="kind"
                      label="What do you need?"
                      required
                      placeholder="Choose…"
                      options={[
                        { value: "employer_form", label: "Employer form" },
                        { value: "supporting_document", label: "Supporting document" },
                        { value: "identity", label: "Photo ID" },
                        ...(ws.access === "clinical" ? [{ value: "information", label: "Clinical information (clinical access)" }] : []),
                      ]}
                    />
                    <TextArea name="message" label="Message to the patient" hint="Shown in the patient portal. Keep it specific and plain." required rows={3} maxLength={2000} />
                    <SubmitButton>Send request</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            ) : null}
            {openReqs.length ? <p className="fine">{openReqs.length} open.</p> : null}
          </section>

          <section className="card stack" aria-labelledby="sum-hist">
            <h2 id="sum-hist">Status history</h2>
            {ws.history.length ? (
              <div className="tbl-wrap" style={{ position: "relative" }}>
                <table className="t">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">From</th>
                      <th scope="col">To</th>
                      <th scope="col">By</th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ws.history.map((h) => (
                      <tr key={h.id}>
                        <td className="nowrap">
                          <DateTime value={h.createdAt} />
                        </td>
                        <td>{h.fromStatus ? STATUS_STAFF_LABEL[h.fromStatus] : "—"}</td>
                        <td>{STATUS_STAFF_LABEL[h.toStatus]}</td>
                        <td className="break" style={{ minWidth: 200 }}>{h.actorEmail ?? "System"}</td>
                        <td>{h.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted small">No status changes yet.</p>
            )}
          </section>
        </div>

        <div className="stack stack-lg">
          <section className="card stack" aria-labelledby="sum-clin">
            <h2 id="sum-clin">Clinician</h2>
            <p>{ws.clinician ? `${ws.clinician.name}, ${ws.clinician.credentials}` : <span className="muted">Not assigned</span>}</p>
            {canAssign ? (
              assignOptions.length ? (
                <ActionForm action={assignAction.bind(null, row.id)}>
                  <SelectField
                    name="clinicianId"
                    label={ws.clinician ? "Reassign to" : "Assign to"}
                    hint="Only clinicians who can serve this service in this state today are listed."
                    required
                    placeholder="Choose…"
                    defaultValue={hasRole(actor, ["clinical_director", "admin"]) ? undefined : (actor.clinicianId ?? undefined)}
                    options={assignOptions.map((o) => ({ value: o.id, label: `${o.name}, ${o.credentials}${o.id === actor.clinicianId ? " (you)" : ""}` }))}
                  />
                  <SubmitButton variant="secondary">{ws.clinician ? "Reassign" : "Assign"}</SubmitButton>
                </ActionForm>
              ) : (
                <p className="muted small">{row.serviceId && row.jurisdictionCode ? "No clinician you can assign is authorized for this service and state today." : "Assignment opens once the case has a service and state."}</p>
              )
            ) : null}
          </section>

          <section className="card stack" aria-labelledby="sum-id">
            <h2 id="sum-id">Identity</h2>
            {ws.identity ? (
              <>
                <KeyValue
                  items={[
                    ["Status", <Badge key="s" tone={ws.identity.status === "verified" ? "progress" : ws.identity.status === "rejected" ? "alert" : "action"}>{ws.identity.status}</Badge>],
                    ["Method", ws.identity.method === "document_review" ? "Document review" : "Vendor"],
                    ["Submitted", <DateTime key="c" value={ws.identity.createdAt} />],
                    ["Reviewed", <DateTime key="r" value={ws.identity.reviewedAt} />],
                    ...(ws.identity.reviewNote ? ([["Note", ws.identity.reviewNote]] as [string, string][]) : []),
                  ]}
                />
                {ws.identity.fileId && canReviewIdentity ? (
                  <a href={`/api/files/${ws.identity.fileId}`} target="_blank" rel="noopener noreferrer">
                    View ID document<span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                ) : null}
                {ws.identity.status === "pending" && canReviewIdentity ? (
                  <ActionForm action={reviewIdentityAction.bind(null, row.id, ws.identity.id)}>
                    <ChoiceGroup
                      name="decision"
                      legend="Review"
                      required
                      options={[
                        { value: "verified", label: "Verified", description: "The ID matches the account name and date of birth." },
                        { value: "rejected", label: "Rejected", description: "The patient will be asked to upload again." },
                      ]}
                    />
                    <TextArea name="note" label="Note" hint="Required when rejecting." rows={2} maxLength={500} />
                    <SubmitButton variant="secondary">Save identity review</SubmitButton>
                  </ActionForm>
                ) : null}
              </>
            ) : (
              <p className="muted small">No ID submitted yet.</p>
            )}
          </section>

          <section className="card stack" aria-labelledby="sum-loc">
            <h2 id="sum-loc">Location attestations</h2>
            {ws.locations.length ? (
              <ul className="list-rows">
                {ws.locations.map((l) => (
                  <li key={l.id}>
                    <div className="grow">
                      <b>{l.stateCode}</b> <span className="muted small">{l.context === "verification" ? "at verification" : "at appointment join"}</span>
                      <div className="fine">
                        <DateTime value={l.createdAt} />
                      </div>
                    </div>
                    <Badge tone={l.matchesAuthorization ? "progress" : "alert"}>{l.matchesAuthorization ? "Matches" : "Does not match"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">None yet.</p>
            )}
          </section>

          <section className="card stack" aria-labelledby="sum-pay">
            <h2 id="sum-pay">Payment</h2>
            {paid ? (
              <p>
                <Money cents={paid.amountCents} currency={paid.currency} /> · <span className="tag">{paid.status}</span>
                {paid.refundedCents ? (
                  <span className="muted small">
                    {" "}
                    (<Money cents={paid.refundedCents} currency={paid.currency} /> refunded)
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="muted small">{ws.payments.length ? `Latest payment: ${ws.payments[0]!.status}` : "Not paid yet."}</p>
            )}
            <Link href={`/ops/cases/${row.id}?tab=payments`} className="small">
              Payment details
            </Link>
          </section>

          {canClose ? (
            <section className="card stack" aria-labelledby="sum-close">
              <h2 id="sum-close">Close case</h2>
              <p className="muted small">Closing needs a recorded determination and every document signed and delivered.</p>
              <ActionForm action={closeCaseAction.bind(null, row.id)}>
                <SubmitButton variant="secondary">Close case</SubmitButton>
              </ActionForm>
            </section>
          ) : null}
        </div>
    </div>
  );
}
