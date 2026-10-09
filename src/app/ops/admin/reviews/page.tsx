import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, DateTime, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listComplianceReviews } from "@/server/services/admin";
import { openReviewTags } from "@/server/services/admin-queries";
import { REVIEW_TAGS } from "@/domain/constants";
import { OUTCOME_OPTIONS, REVIEW_TYPE_OPTIONS, label } from "../_lib/ui";
import { addReviewAction } from "./actions";

export const metadata: Metadata = { title: "Compliance reviews" };

const SUBJECT_TYPES = ["jurisdiction", "consent_version", "content", "screening_ruleset", "vendor", "policy", "setting"] as const;

export default async function ReviewsPage() {
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const { reviews, open } = await run(actor, async (ctx) => ({ reviews: await listComplianceReviews(ctx), open: await openReviewTags(ctx) }));
  const today = new Date().toISOString().slice(0, 10);
  const byTag = REVIEW_TAGS.map((t) => ({ tag: t, n: open.filter((o) => o.reviewTag === t).length })).filter((x) => x.n);
  return (
    <>
      <PageHead
        eyebrow="Oversight"
        title="Compliance reviews"
        lede="A log of legal, clinical, state-rule, security and owner reviews, and everything that still carries an open review tag."
      />

      <section className="card stack" aria-labelledby="open-h">
        <div className="card-head">
          <h2 id="open-h">Open review tags</h2>
          {open.length ? <Badge tone="action">{open.length} open</Badge> : <Badge tone="done">None open</Badge>}
        </div>
        <p className="small muted">
          Production readiness: items below still need sign-off. The owner waived outside review, so the owner signs off each one and the review is logged here. In production, tagged content can&rsquo;t be published and
          tagged services can&rsquo;t be enabled.
        </p>
        {byTag.length ? (
          <div className="row">
            {byTag.map((b) => (
              <span key={b.tag} className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
                <ReviewTag tag={b.tag} />
                <span className="small">{b.n}</span>
              </span>
            ))}
          </div>
        ) : null}
        {open.length ? (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <caption className="visually-hidden">Items with open review tags</caption>
              <thead>
                <tr>
                  <th scope="col">Area</th>
                  <th scope="col">Item</th>
                  <th scope="col">Key</th>
                  <th scope="col">Review tag</th>
                </tr>
              </thead>
              <tbody>
                {open.map((o) => (
                  <tr key={`${o.area}-${o.id}`}>
                    <td className="nowrap">{o.area}</td>
                    <td>
                      <Link href={o.href}>{o.title}</Link>
                    </td>
                    <td className="mono small break">{o.key}</td>
                    <td>
                      <ReviewTag tag={o.reviewTag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="log-h">
        <h2 id="log-h">Review log</h2>
        {reviews.length ? (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Reviewed</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Type</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Next due</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">
                      <DateTime value={r.reviewedOn} dateOnly />
                    </td>
                    <td>
                      {label(r.subjectType)}{" "}
                      {r.subjectType === "jurisdiction" ? (
                        <Link href={`/ops/admin/jurisdictions/${r.subjectId}`} className="tag">
                          {r.subjectId}
                        </Link>
                      ) : (
                        <span className="tag">{r.subjectId}</span>
                      )}
                    </td>
                    <td>{label(r.reviewType)}</td>
                    <td>{r.reviewerName}</td>
                    <td>{r.outcome === "approved" ? <Badge tone="done">Signed off</Badge> : <Badge tone="action">Changes requested</Badge>}</td>
                    <td className="nowrap">
                      <DateTime value={r.nextDueOn} dateOnly />
                      {r.nextDueOn && r.nextDueOn < today ? (
                        <>
                          {" "}
                          <Badge tone="alert">Overdue</Badge>
                        </>
                      ) : null}
                    </td>
                    <td className="small break">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No reviews recorded yet.</p>
        )}
      </section>

      <section className="card stack" aria-labelledby="add-h">
        <h2 id="add-h">Record a review</h2>
        <ActionForm action={addReviewAction}>
          <SelectField name="subjectType" label="Subject type" required placeholder="Choose a subject type" options={SUBJECT_TYPES.map((t) => ({ value: t, label: label(t) }))} />
          <TextField name="subjectId" label="Subject identifier" required maxLength={100} hint="For example a state code (TX), a setting key (refundPolicy), a content key or a vendor name." />
          <SelectField name="reviewType" label="Review type" required options={REVIEW_TYPE_OPTIONS} placeholder="Choose a review type" />
          <TextField name="reviewerName" label="Reviewer name and role" required maxLength={120} />
          <SelectField name="outcome" label="Outcome" required options={OUTCOME_OPTIONS} placeholder="Choose an outcome" />
          <TextField name="reviewedOn" label="Reviewed on" type="date" required defaultValue={today} />
          <TextField name="nextDueOn" label="Next review due" type="date" />
          <TextArea name="notes" label="Notes and evidence location" rows={3} maxLength={4000} />
          <p className="fine">Recording a review does not clear review tags; clear each tag on its own page once the review is complete.</p>
          <div>
            <SubmitButton pendingText="Saving…">Record review</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
