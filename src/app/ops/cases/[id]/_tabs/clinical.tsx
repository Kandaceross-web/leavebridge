import { ActionForm, ChoiceGroup, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { assessmentNoteHistory, caseDeterminations } from "@/server/services/clinical";
import { caseAppointments } from "@/server/services/scheduling";
import { caseClinicalReviews } from "@/server/services/ops-queries";
import { getSetting } from "@/server/settings";
import { OutcomeStarters } from "./outcome-starters";
import { DETERMINATION_DECISIONS } from "@/domain/constants";
import { assessmentNoteAction, clinicalReviewAction, determinationAction } from "../actions";
import { DECISION_LABEL, isAssigned, LimitedPanel, REVIEW_OUTCOME_LABEL, tryClinical, type TabProps } from "../_shared";

const DETERMINATION_STATUSES = ["clinical_review", "provider_review", "appointment_scheduled", "completed"];

export async function ClinicalTab(props: TabProps) {
  const { ws, actor } = props;
  if (ws.access !== "clinical") return <LimitedPanel {...props} />;
  const data = await tryClinical(
    run(actor, async (ctx) => ({
      reviews: await caseClinicalReviews(ctx, ws.row.id),
      notes: await assessmentNoteHistory(ctx, ws.row.id),
      determinations: await caseDeterminations(ctx, ws.row.id, "clinical"),
      appointments: await caseAppointments(ctx, ws.row.id),
      starters: await getSetting(ctx.tx, "outcomeStarters"),
    })),
  );
  if (!data) return <LimitedPanel {...props} />;
  const assigned = isAssigned(ws, actor);
  const canReview = assigned && ws.row.status === "clinical_review";
  const canDetermine = assigned && DETERMINATION_STATUSES.includes(ws.row.status);
  const [latestNote, ...olderNotes] = data.notes;

  return (
    <div className="stack stack-lg">
      {!assigned ? (
        <Banner tone="info" icon="info">
          Only the assigned clinician can record a review, assessment note or determination on this case.
        </Banner>
      ) : null}

      <section className="card stack" aria-labelledby="cr-h">
        <h2 id="cr-h">Clinical review</h2>
        {data.reviews.length ? (
          <ul className="list-rows">
            {data.reviews.map((r) => (
              <li key={r.id}>
                <div className="grow stack stack-sm">
                  <span className="row">
                    <b>{REVIEW_OUTCOME_LABEL[r.outcome] ?? r.outcome}</b>
                    <span className="muted small">
                      {r.clinician} · <DateTime value={r.createdAt} />
                    </span>
                  </span>
                  {r.notes ? <span className="small break" style={{ whiteSpace: "pre-wrap" }}>{r.notes}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No review recorded yet.</p>
        )}
        {canReview ? (
          <ActionForm action={clinicalReviewAction.bind(null, ws.row.id)}>
            <ChoiceGroup
              name="outcome"
              legend="Review outcome"
              required
              options={[
                { value: "session_required", label: "Session required", description: "The patient is asked to book a telehealth assessment." },
                { value: "info_required", label: "Information required", description: "Sends your request to the patient and pauses the case." },
                { value: "ready_for_determination", label: "Ready for determination", description: "Moves the case to provider review." },
              ]}
            />
            <TextArea name="notes" label="Review notes (clinical, not shown to the patient)" rows={4} maxLength={4000} />
            <TextArea name="requestMessage" label="Request to the patient" hint="Required for “Information required”. Shown in the patient portal." rows={3} maxLength={2000} />
            <SubmitButton>Record review</SubmitButton>
          </ActionForm>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="an-h">
        <h2 id="an-h">Assessment notes</h2>
        <p className="muted small">Notes are append-only. Saving creates a new version; earlier versions stay in the history.</p>
        {latestNote ? (
          <div className="card-quiet stack stack-sm">
            <span className="fine">
              Latest version · <DateTime value={latestNote.createdAt} />
            </span>
            <p className="break" style={{ whiteSpace: "pre-wrap" }}>
              {latestNote.body}
            </p>
          </div>
        ) : (
          <p className="muted small">No assessment notes yet.</p>
        )}
        {olderNotes.length ? (
          <details>
            <summary>Earlier versions ({olderNotes.length})</summary>
            <ol className="list-rows mt-1">
              {olderNotes.map((n) => (
                <li key={n.id} className="stack stack-sm" style={{ display: "grid" }}>
                  <span className="fine">
                    <DateTime value={n.createdAt} />
                  </span>
                  <span className="small break" style={{ whiteSpace: "pre-wrap" }}>
                    {n.body}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        {assigned ? (
          <ActionForm action={assessmentNoteAction.bind(null, ws.row.id)}>
            <TextArea name="body" label={latestNote ? "New version" : "Assessment note"} defaultValue={latestNote?.body} required rows={8} maxLength={20000} />
            {data.appointments.length ? (
              <SelectField
                name="appointmentId"
                label="Related appointment"
                placeholder="None"
                options={data.appointments.map(({ a }) => ({ value: a.id, label: `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(a.startsAt)} · ${a.status.replace(/_/g, " ")}` }))}
              />
            ) : null}
            <SubmitButton variant="secondary">Save note version</SubmitButton>
          </ActionForm>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="det-h">
        <h2 id="det-h">Determination</h2>
        {data.determinations.length ? (
          <ul className="list-rows">
            {data.determinations.map((d, i) => (
              <li key={d.id}>
                <div className="grow stack stack-sm">
                  <span className="row">
                    <b>{DECISION_LABEL[d.decision]}</b>
                    {i === 0 ? <Badge tone="info">Current</Badge> : <Badge tone="neutral">Superseded</Badge>}
                  </span>
                  <span className="muted small">
                    {d.clinician} · <DateTime value={d.createdAt} />
                  </span>
                  <span className="small break">
                    <b>Rationale:</b> {d.rationale}
                  </span>
                  <span className="small break">
                    <b>Findings:</b> {d.findings}
                  </span>
                  <span className="small break">
                    <b>Patient message:</b> {d.patientMessage}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No determination recorded.</p>
        )}
        {canDetermine ? (
          <div className="card-flat stack">
            <h3>{data.determinations.length ? "Record a revised determination" : "Record your determination"}</h3>
            <Banner tone="sage" icon="shield">
              Your independent clinical determination. Software does not make or suggest this decision. Recording it asks you to confirm your password.
            </Banner>
            <ActionForm action={determinationAction.bind(null, ws.row.id)} className="form form-wide">
              <ChoiceGroup name="decision" legend="Determination" required options={DETERMINATION_DECISIONS.map((d) => ({ value: d, label: DECISION_LABEL[d] }))} />
              <TextArea name="rationale" label="Clinical rationale" hint="Required, at least 20 characters. Not shown to the patient." required rows={5} maxLength={8000} />
              <TextArea name="findings" label="Relevant findings" hint="Required, at least 10 characters. Not shown to the patient." required rows={4} maxLength={8000} />
              <TextArea name="patientMessage" label="Message to the patient" hint="Shown in the patient portal with the decision." required rows={5} maxLength={4000} />
              <OutcomeStarters starters={DETERMINATION_DECISIONS.map((d) => ({ label: DECISION_LABEL[d], text: data.starters[d] }))} />
              <TextArea name="requestMessage" label="Information requested from the patient" hint="Required only for “Additional information is required”." rows={3} maxLength={2000} />
              <SubmitButton pendingText="Recording…">Record determination</SubmitButton>
            </ActionForm>
          </div>
        ) : assigned ? (
          <p className="muted small">A determination can be recorded during clinical review, after the appointment or during provider review.</p>
        ) : null}
        {!data.determinations.length && !canDetermine && !assigned ? <Empty title="Waiting on the assigned clinician" /> : null}
      </section>
    </div>
  );
}
