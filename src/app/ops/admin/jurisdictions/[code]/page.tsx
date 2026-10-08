import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, Banner, DateTime, KeyValue, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { activationChecklist, listComplianceReviews } from "@/server/services/admin";
import { hasRole } from "@/domain/policy";
import { CheckItem, InlineAction, OUTCOME_OPTIONS, REVIEW_TYPE_OPTIONS, label, orNotFound } from "../../_lib/ui";
import { addJurisdictionReviewAction, setJurisdictionActiveAction, updateJurisdictionAction } from "../actions";

export const metadata: Metadata = { title: "State configuration" };

export default async function JurisdictionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) notFound();
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const canEdit = hasRole(actor, ["admin"]);
  const { check, reviews } = await run(actor, async (ctx) => ({
    check: await orNotFound(activationChecklist(ctx, code)),
    reviews: await listComplianceReviews(ctx, "jurisdiction", code),
  }));
  const j = check.jurisdiction;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <p className="small">
        <Link href="/ops/admin/jurisdictions">← All states</Link>
      </p>
      <PageHead
        eyebrow="State configuration"
        title={
          <>
            {j.name} <span className="tag">{j.code}</span>
          </>
        }
        lede={
          <span className="row">
            {j.isActive ? <Badge tone="done">Active</Badge> : <Badge>Inactive</Badge>}
            <ReviewTag tag="STATE_RULE_REQUIRED" />
            <span className="muted small">State-specific rules must be confirmed by a qualified reviewer before activation.</span>
          </span>
        }
      />

      <section className="card stack" aria-labelledby="checklist-h">
        <div className="card-head">
          <h2 id="checklist-h">Activation checklist</h2>
          {check.ready ? <Badge tone="done">All items pass</Badge> : <Badge tone="action">Not ready</Badge>}
        </div>
        <ul className="list-check">
          {check.items.map((i) => (
            <CheckItem key={i.key} ok={i.ok}>
              {i.label}
            </CheckItem>
          ))}
        </ul>
        <KeyValue
          items={[
            ["Servable clinicians", check.servableClinicians.length ? check.servableClinicians.join(", ") : "None"],
            ["Latest signed-off review", check.review ? <DateTime value={check.review.reviewedOn} dateOnly /> : "None in the last 12 months"],
            ["Activated", j.activatedAt ? <DateTime value={j.activatedAt} /> : "—"],
          ]}
        />
        {canEdit ? (
          j.isActive ? (
            <div className="stack stack-sm">
              <p className="small muted">Deactivating stops new screenings and scheduling for patients located in this state.</p>
              <InlineAction action={setJurisdictionActiveAction.bind(null, code)} fields={{ active: "0" }} variant="danger" pendingText="Deactivating…">
                Deactivate {j.name}
              </InlineAction>
            </div>
          ) : check.ready ? (
            <InlineAction action={setJurisdictionActiveAction.bind(null, code)} fields={{ active: "1" }} variant="primary" pendingText="Activating…">
              Activate {j.name}
            </InlineAction>
          ) : (
            <div className="stack stack-sm">
              <Banner tone="warn" icon="alert">
                Activation is blocked until every checklist item passes:{" "}
                {check.items
                  .filter((i) => !i.ok)
                  .map((i) => i.label.toLowerCase())
                  .join("; ")}
                .
              </Banner>
              <InlineAction action={setJurisdictionActiveAction.bind(null, code)} fields={{ active: "1" }} variant="secondary">
                Try to activate {j.name}
              </InlineAction>
            </div>
          )
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="config-h">
        <h2 id="config-h">Configuration</h2>
        {canEdit ? (
          <ActionForm action={updateJurisdictionAction.bind(null, code)}>
            <Checkbox name="telehealthAuthorized" defaultChecked={j.telehealthAuthorized}>
              Telehealth is authorized for this state (confirmed by state-rule review)
            </Checkbox>
            <TextArea name="requiredDisclosures" label="Required disclosures" rows={4} maxLength={4000} defaultValue={j.requiredDisclosures ?? ""} hint="Shown to patients located in this state. Must come from a reviewed source." />
            <TextArea name="specialRestrictions" label="Special restrictions" rows={4} maxLength={4000} defaultValue={j.specialRestrictions ?? ""} />
            <TextArea name="complianceNotes" label="Internal compliance notes" rows={4} maxLength={4000} defaultValue={j.complianceNotes ?? ""} />
            <TextField name="nextReviewDueOn" label="Next review due" type="date" defaultValue={j.nextReviewDueOn ?? ""} hint="The last review date is set when a signed-off review is recorded below." />
            <div>
              <SubmitButton pendingText="Saving…">Save configuration</SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <KeyValue
            items={[
              ["Telehealth authorized", j.telehealthAuthorized ? "Yes" : "No"],
              ["Required disclosures", j.requiredDisclosures],
              ["Special restrictions", j.specialRestrictions],
              ["Compliance notes", j.complianceNotes],
              ["Last review", <DateTime key="l" value={j.lastReviewOn} dateOnly />],
              ["Next review due", <DateTime key="n" value={j.nextReviewDueOn} dateOnly />],
            ]}
          />
        )}
      </section>

      <section className="card stack" aria-labelledby="reviews-h">
        <h2 id="reviews-h">Compliance reviews</h2>
        {reviews.length ? (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Reviewed</th>
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
                    <td className="break small">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No reviews recorded for this state.</p>
        )}
        <h3>Record a review</h3>
        <ActionForm action={addJurisdictionReviewAction.bind(null, code)}>
          <SelectField name="reviewType" label="Review type" options={REVIEW_TYPE_OPTIONS} defaultValue="state_rule" required />
          <TextField name="reviewerName" label="Reviewer name and role" required maxLength={120} />
          <SelectField name="outcome" label="Outcome" options={OUTCOME_OPTIONS} placeholder="Choose an outcome" required />
          <TextField name="reviewedOn" label="Reviewed on" type="date" required defaultValue={today} />
          <TextField name="nextDueOn" label="Next review due" type="date" />
          <TextArea name="notes" label="Notes and evidence location" rows={3} maxLength={4000} />
          <div>
            <SubmitButton pendingText="Saving…">Record review</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
