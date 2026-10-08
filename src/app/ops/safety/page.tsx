import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, Checkbox, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, DateTime, Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { safetyQueue } from "@/server/services/ops-queries";
import { STATUS_STAFF_LABEL } from "@/domain/cases/state-machine";
import type { CaseStatus } from "@/domain/constants";
import { acknowledgeSafetyAction, releaseHoldAction } from "./actions";

export const metadata: Metadata = { title: "Safety follow-up" };

const SOURCE_LABEL: Record<string, string> = { intake: "Intake", measure: "Questionnaire", message: "Message", screening: "Screening" };

export default async function SafetyPage() {
  const { actor } = await requireStaffSession();
  const q = await run(actor, (ctx) => safetyQueue(ctx));
  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Operations" title="Safety follow-up" lede="Open safety events from intake, questionnaires and messages, and cases on safety hold." />
      <Banner tone="safety" icon="alert">
        Follow your clinical safety protocol. Details of what was reported are visible to clinicians with access to the case.
      </Banner>

      {q.screeningCount ? (
        <section className="card-quiet stack stack-sm" aria-labelledby="scr-h">
          <h2 id="scr-h" style={{ fontSize: 20 }}>
            Screening emergencies
          </h2>
          <p className="small">
            <b>{q.screeningCount}</b> anonymous screening {q.screeningCount === 1 ? "response was" : "responses were"} routed to crisis resources. They are not linked to a person or case and need no action here.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="ev-h" className="stack">
        <h2 id="ev-h">Open events</h2>
        {q.events.length ? (
          <ul className="list-plain">
            {q.events.map((e) => (
              <li key={e.id} className="card-flat stack">
                <div className="row row-between">
                  <div className="stack stack-sm">
                    <Link href={`/ops/cases/${e.caseId}`}>
                      <b className="mono">{e.reference}</b> · {e.patient}
                    </Link>
                    <span className="muted small">
                      Raised <DateTime value={e.createdAt} />
                      {e.source ? ` · source: ${SOURCE_LABEL[e.source] ?? e.source}` : ""}
                      {e.rule ? (
                        <>
                          {" "}
                          · rule <span className="tag">{e.rule}</span>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <div className="row">
                    <Badge tone="alert">Open</Badge>
                    {e.status ? <Badge tone="neutral">{STATUS_STAFF_LABEL[e.status as CaseStatus]}</Badge> : null}
                  </div>
                </div>
                {e.canAct ? (
                  <details>
                    <summary className="btn btn-secondary btn-sm">Record follow-up</summary>
                    <div className="mt-2">
                      <ActionForm action={acknowledgeSafetyAction.bind(null, e.id, e.caseId)}>
                        <TextArea name="note" label="Follow-up taken" hint="Saved encrypted with the event." required rows={3} maxLength={4000} />
                        <Checkbox name="hold" defaultChecked={e.status === "safety_hold"}>
                          Place the case on safety hold (pauses the case until a clinician releases it)
                        </Checkbox>
                        <SubmitButton>Acknowledge event</SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ) : (
                  <p className="fine">The assigned clinician or a clinical director records follow-up.</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No open safety events" />
        )}
      </section>

      <section aria-labelledby="hold-h" className="stack">
        <h2 id="hold-h">Cases on safety hold</h2>
        {q.held.length ? (
          <ul className="list-plain">
            {q.held.map((h) => (
              <li key={h.id} className="card-flat stack">
                <div className="row row-between">
                  <Link href={`/ops/cases/${h.id}`}>
                    <b className="mono">{h.reference}</b> · {h.patient}
                  </Link>
                  <span className="muted small">
                    Last activity <DateTime value={h.updatedAt} />
                  </span>
                </div>
                {h.canAct ? (
                  <details>
                    <summary className="btn btn-secondary btn-sm">Release hold</summary>
                    <div className="mt-2">
                      <ActionForm action={releaseHoldAction.bind(null, h.id)}>
                        <TextArea name="note" label="Why the hold can be released" required rows={3} maxLength={2000} />
                        <SubmitButton variant="secondary">Release hold</SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No cases on safety hold" />
        )}
      </section>
    </div>
  );
}
