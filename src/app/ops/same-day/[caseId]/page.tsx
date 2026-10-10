import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, ChoiceGroup, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, DateTime, KeyValue, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { ISSUED_KIND_LABEL } from "@/server/services/issued-documents";
import { sameDayCaseForStaff } from "@/server/services/same-day";
import { ALL_FUNCTIONING_QUESTIONS } from "@/domain/same-day/rules";
import { STATUS_STAFF_LABEL } from "@/domain/cases/state-machine";
import { hasRole } from "@/domain/policy";
import { isDomainError } from "@/domain/errors";
import { decideHeldAction, resolveRefundAction, revokeAction } from "../actions";

export const metadata: Metadata = { title: "Same-day screening" };

const SCREENING_STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  in_progress: "In progress",
  held_for_review: "Held for clinician review",
  issued: "Record issued",
  closed: "Closed without a record",
};

function answerText(key: string, value: unknown): string {
  const q = ALL_FUNCTIONING_QUESTIONS.find((x) => x.key === key);
  if (!q) return String(value);
  if (q.kind === "number") return String(value);
  const label = (v: string) => q.options?.find((o) => o.value === v)?.label ?? v;
  return Array.isArray(value) ? value.map(String).map(label).join("; ") : label(String(value));
}

export default async function SameDayCasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const { actor } = await requireStaffSession();
  const data = await run(actor, (ctx) => sameDayCaseForStaff(ctx, caseId)).catch((e) => {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  });
  const { row, access, screening, summary, functioning, docs, letter } = data;
  const clinical = access === "clinical";
  const canDecide = clinical && hasRole(actor, ["clinician", "clinical_director"]) && screening.status === "held_for_review";
  const canRevoke = hasRole(actor, ["clinician", "clinical_director", "admin"]);
  const canResolveRefund = hasRole(actor, ["admin", "billing"]) && screening.refundReview === "flagged";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 960 }}>
      <PageHead eyebrow="Same-day screening" title={row.reference} lede={`${STATUS_STAFF_LABEL[row.status]} · ${SCREENING_STATUS[screening.status] ?? screening.status}`} />
      <p className="small">
        <Link href="/ops/same-day">All same-day screenings</Link> · <Link href={`/ops/cases/${row.id}`}>Full case record</Link>
      </p>

      <section className="card stack" aria-labelledby="facts-h">
        <h2 id="facts-h">Screening</h2>
        <KeyValue
          items={[
            ["State", row.jurisdictionCode ?? "—"],
            ["Questionnaires", screening.instruments.length ? screening.instruments.map((i) => i.toUpperCase()).join(", ") : "Not chosen yet"],
            ["Finished", screening.completedAt ? <DateTime key="c" value={screening.completedAt} /> : "—"],
            ...(clinical && screening.holdLabels.length ? ([["Held because", screening.holdLabels.join("; ")]] as [string, string][]) : []),
            ["Refund review", screening.refundReview === "flagged" ? "Decision needed" : screening.refundReview === "resolved" ? "Decided" : "—"],
            ...(letter ? ([["Letter request", <Link key="l" href={`/ops/same-day/letters/${letter.id}`}>{letter.status}</Link>]] as [string, ReactNode][]) : []),
          ]}
        />
        {!clinical ? <p className="fine">Answers and scores are visible to clinicians with access to this patient&rsquo;s state.</p> : null}
      </section>

      {canDecide ? (
        <section className="card stack" aria-labelledby="decide-h">
          <h2 id="decide-h">Clinician decision</h2>
          <Banner tone="safety" icon="alert">
            Follow your clinical safety protocol and contact the patient before deciding. Issuing releases the automated record unchanged; it does not add a clinical opinion.
          </Banner>
          <ActionForm action={decideHeldAction.bind(null, row.id)}>
            <ChoiceGroup
              name="decision"
              legend="Decision"
              required
              options={[
                { value: "issue", label: "Issue the screening record", description: "The patient is notified that it is ready." },
                { value: "close", label: "Close without issuing a record", description: "The patient is told to check their portal. Explain why in a message." },
              ]}
            />
            <TextArea name="note" label="Follow-up taken and reason" hint="Saved encrypted. It also closes the open safety events for this screening." required rows={4} maxLength={4000} />
            <SubmitButton pendingText="Saving…">Record decision</SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      {clinical && summary ? (
        <section className="card-flat stack" aria-labelledby="sum-h">
          <h2 id="sum-h">Automated summary</h2>
          {summary.sections.map((s) => (
            <div key={s.heading} className="stack stack-sm">
              <h3>{s.heading}</h3>
              {s.lines.map((l) => (
                <p key={l} className="small">
                  {l}
                </p>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {clinical && functioning ? (
        <section className="card-flat stack stack-sm" aria-labelledby="ans-h">
          <h2 id="ans-h">Answers as given</h2>
          <KeyValue items={Object.entries(functioning).map(([k, v]) => [ALL_FUNCTIONING_QUESTIONS.find((q) => q.key === k)?.label ?? k, answerText(k, v)])} />
        </section>
      ) : null}

      <section className="stack stack-sm" aria-labelledby="docs-h">
        <h2 id="docs-h">Issued documents</h2>
        {docs.length ? (
          <ul className="list-plain">
            {docs.map((d) => (
              <li key={d.id} className="card-flat stack stack-sm">
                <div className="row row-between">
                  <div className="stack stack-sm">
                    <b>{ISSUED_KIND_LABEL[d.kind]}</b>
                    <span className="small muted">
                      <span className="mono">{d.publicId}</span> · issued <DateTime value={d.issuedAt} />
                    </span>
                  </div>
                  {d.status === "valid" ? <Badge tone="done">Valid</Badge> : <Badge tone="alert">Revoked</Badge>}
                </div>
                {d.status === "revoked" && d.revokedAt ? (
                  <p className="small muted">
                    Revoked <DateTime value={d.revokedAt} />
                  </p>
                ) : null}
                {d.status === "valid" && canRevoke ? (
                  <details>
                    <summary className="btn btn-secondary btn-sm">Revoke</summary>
                    <div className="mt-2">
                      <ActionForm action={revokeAction.bind(null, d.id, row.id)}>
                        <TextArea name="reason" label="Reason (kept private; never shown publicly)" required rows={3} maxLength={2000} />
                        <Checkbox name="confirm" required>
                          I understand revocation is permanent and the verification page will show this document as revoked.
                        </Checkbox>
                        <SubmitButton variant="secondary" pendingText="Revoking…">
                          Revoke document
                        </SubmitButton>
                      </ActionForm>
                      <p className="fine">You will be asked to confirm your password.</p>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nothing issued for this screening.</p>
        )}
      </section>

      {canResolveRefund ? (
        <section className="card-flat stack stack-sm" aria-labelledby="refund-h">
          <h2 id="refund-h">Refund decision</h2>
          <p className="small">This screening was held for review. Its payment was not refunded automatically. Make the decision in <Link href="/ops/billing">Payments &amp; refunds</Link>, then mark it decided.</p>
          <ActionForm action={resolveRefundAction.bind(null, row.id)}>
            <SubmitButton variant="secondary">Mark refund decision made</SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
