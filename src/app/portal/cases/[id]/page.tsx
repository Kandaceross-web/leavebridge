import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Checkbox, FileField, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, ButtonLink, DateTime, Empty, Icon, KeyValue, Timeline } from "@/components/ui";
import { statusHistory } from "@/server/services/cases";
import { caseDeterminations, openRequests } from "@/server/services/clinical";
import { caseDocuments } from "@/server/services/documents";
import { caseAppointments } from "@/server/services/scheduling";
import { myPatientProfile, serviceSummary } from "@/server/services/portal-queries";
import { PATIENT_STATUS, PATIENT_TIMELINE, timelinePosition } from "@/domain/cases/state-machine";
import { ownedCase } from "../../_lib/load";
import { DECISION_LABEL, LEAVE_TYPE_LABEL, PRE_SUBMISSION, REQUEST_KIND_LABEL, stepHref } from "../../_lib/steps";
import { cancelCase, respondToRequest } from "./actions";

export const metadata: Metadata = { title: "Your case" };

export default async function CaseHome({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    profile: await myPatientProfile(ctx),
    service: await serviceSummary(ctx, r.serviceId),
    requests: await openRequests(ctx, r.id),
    determinations: await caseDeterminations(ctx, r.id, "patient"),
    documents: await caseDocuments(ctx, r.id, "patient"),
    appointments: await caseAppointments(ctx, r.id),
    history: await statusHistory(ctx, r.id),
  }));
  const { profile, service, requests, determinations, documents, appointments, history } = extra;
  const tz = profile.timeZone;
  const status = PATIENT_STATUS[row.status];
  const pos = timelinePosition(row.status);
  const terminal = row.status === "cancelled";
  const timeline = PATIENT_TIMELINE.map((m, i) => ({
    label: m.label,
    state: (terminal ? "todo" : i < pos || (i === pos && row.status === "closed") ? "done" : i === pos ? "now" : "todo") as "done" | "now" | "todo",
    detail: i === pos && !terminal && status.label !== m.label ? status.label : undefined,
  }));
  const preSubmission = PRE_SUBMISSION.includes(row.status);
  const open = requests.filter((r) => r.status === "open");
  const latestDecision = determinations[0] ?? null;
  const activeAppt = appointments.find((a) => a.a.status === "booked") ?? null;

  return (
    <div className="stack stack-lg">
      <header className="page-head">
        <p className="small">
          <Link href="/portal">
            <span aria-hidden="true">← </span>Portal home
          </Link>
        </p>
        <p className="eyebrow">Case {row.reference}</p>
        <div className="row row-between" style={{ alignItems: "flex-end" }}>
          <h1>{service?.name ?? "Your request"}</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="lede">{status.explainer}</p>
      </header>

      {sp.welcome ? (
        <Banner tone="sage" icon="check">
          Your account is ready. Follow the steps below to complete your request. Your progress saves as you go.
        </Banner>
      ) : null}
      {sp.paid ? (
        <Banner tone="sage" icon="check">
          Payment received. Thank you. Next, review and sign the consents so your secure intake can open.
        </Banner>
      ) : null}
      {row.screeningReview === "pending" ? (
        <Banner tone="info" icon="clock">
          A clinician is reviewing a few of your screening answers before payment opens. You can choose your service and verify your identity in the meantime. We will notify you when you can continue.
        </Banner>
      ) : null}
      {row.screeningReview === "declined" ? (
        <Banner tone="warn" icon="info">
          After reviewing your screening answers, a clinician determined this service may not be the right fit. Please check your messages for details and next steps.
        </Banner>
      ) : null}

      {open.length ? (
        <section id="requests" className="card stack" aria-labelledby="requests-heading">
          <h2 id="requests-heading">Your care team needs something from you</h2>
          {open.map((r) => (
            <div key={r.id} className="card-quiet stack stack-sm">
              <div className="row row-between">
                <b>{REQUEST_KIND_LABEL[r.kind]}</b>
                <span className="small muted">
                  Requested <DateTime value={r.createdAt} timeZone={tz} />
                </span>
              </div>
              <p className="break" style={{ whiteSpace: "pre-wrap" }}>
                {r.message}
              </p>
              <ActionForm action={respondToRequest.bind(null, row.id, r.id)}>
                <TextArea
                  name="response"
                  label={r.kind === "information" ? "Your response" : "Note for your care team (optional)"}
                  required={r.kind === "information"}
                  rows={4}
                  maxLength={4000}
                />
                {r.kind !== "information" ? (
                  <FileField name="file" label="Upload the requested document" hint="PDF, JPG, PNG or HEIC. Files are checked for safety before they are stored." required />
                ) : null}
                <SubmitButton pendingText="Sending…">Send response</SubmitButton>
              </ActionForm>
            </div>
          ))}
        </section>
      ) : null}

      {latestDecision ? (
        <section className="card stack stack-sm" aria-labelledby="decision-heading">
          <h2 id="decision-heading">Your clinician&rsquo;s assessment</h2>
          <p>
            <b>{DECISION_LABEL[latestDecision.decision] ?? "Your clinician recorded their assessment"}</b>
          </p>
          <p className="break" style={{ whiteSpace: "pre-wrap" }}>
            {latestDecision.patientMessage}
          </p>
          <p className="small muted">
            {latestDecision.clinician} · <DateTime value={latestDecision.createdAt} timeZone={tz} />
          </p>
          <p className="fine">
            Your clinician&rsquo;s assessment is a clinical opinion. Decisions about leave, eligibility and benefits are made by your employer, insurer or leave administrator.
          </p>
        </section>
      ) : null}

      <div className="two-col">
        <div className="stack stack-lg">
          {preSubmission ? (
            <section className="stack" aria-labelledby="steps-heading">
              <h2 id="steps-heading">Your steps</h2>
              <ol className="checklist">
                {steps.map((s, i) => (
                  <li key={s.key} className={s.state === "waiting" ? "done" : s.state}>
                    <span className="step-dot" aria-hidden="true">
                      {s.state === "done" || s.state === "waiting" ? "✓" : i + 1}
                    </span>
                    <div className="grow">
                      {s.state === "locked" ? <b>{s.label}</b> : <Link href={stepHref(row.id, s.key)}>{s.label}</Link>}
                      <small>{s.description}</small>
                    </div>
                    {s.state === "done" ? <Badge tone="done">Done</Badge> : null}
                    {s.state === "waiting" ? <Badge tone="progress">In review</Badge> : null}
                    {s.state === "current" ? <Badge tone="action">Next</Badge> : null}
                    {s.state === "locked" ? (
                      <span className="small muted">
                        <Icon name="lock" /> Locked
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {row.status === "appointment_needed" || activeAppt ? (
            <section className="card-flat stack stack-sm" aria-labelledby="appt-heading">
              <h2 id="appt-heading">Telehealth appointment</h2>
              {activeAppt ? (
                <>
                  <p>
                    <DateTime value={activeAppt.a.startsAt} timeZone={tz} /> with {activeAppt.clinicianName}, {activeAppt.credentials}
                  </p>
                  <p>
                    <ButtonLink href={`/portal/cases/${row.id}/appointment`} variant="secondary">
                      Appointment details and join
                    </ButtonLink>
                  </p>
                </>
              ) : (
                <>
                  <p className="muted">Your clinician would like to meet with you by secure video.</p>
                  <p>
                    <ButtonLink href={`/portal/cases/${row.id}/appointment`}>Choose a time</ButtonLink>
                  </p>
                </>
              )}
            </section>
          ) : null}

          <section className="stack stack-sm" aria-labelledby="docs-heading">
            <h2 id="docs-heading">Documents from your clinician</h2>
            {documents.length ? (
              <ul className="list-rows">
                {documents.map((d) => (
                  <li key={d.id}>
                    <Icon name="file" />
                    <div className="grow">
                      <b>{d.title}</b>
                      <p className="small muted">
                        Delivered <DateTime value={d.updatedAt} timeZone={tz} />
                      </p>
                    </div>
                    {d.signedFileId ? (
                      <a className="btn btn-secondary btn-sm" href={`/api/files/${d.signedFileId}`} download>
                        Download PDF
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Signed documents appear here once your clinician completes and delivers them.</p>
            )}
            <p className="small">
              <Link href={`/portal/cases/${row.id}/releases`}>Release authorizations</Link> · <Link href={`/portal/cases/${row.id}/documents`}>Your uploads</Link> ·{" "}
              <Link href={`/portal/cases/${row.id}/messages`}>Messages</Link>
            </p>
          </section>
        </div>

        <aside className="stack stack-lg" aria-label="Case details">
          <section className="card-flat stack" aria-labelledby="progress-heading">
            <h2 id="progress-heading">Progress</h2>
            {terminal ? <p className="muted small">This request was cancelled.</p> : null}
            <Timeline items={timeline} />
          </section>
          <section className="card-flat stack stack-sm" aria-labelledby="details-heading">
            <h2 id="details-heading">Details</h2>
            <KeyValue
              items={[
                ["Reference", <span className="mono" key="r">{row.reference}</span>],
                ["Service", service?.name ?? "Not chosen yet"],
                ["Leave type requested", row.requestedLeaveType ? LEAVE_TYPE_LABEL[row.requestedLeaveType] : "—"],
                ["Deadline", row.documentationDeadline ? <DateTime key="d" value={row.documentationDeadline} dateOnly /> : "—"],
                ["Started", <DateTime key="s" value={row.createdAt} timeZone={tz} dateOnly />],
              ]}
            />
          </section>
          <section className="card-flat stack stack-sm" aria-labelledby="history-heading">
            <h2 id="history-heading">Status history</h2>
            {history.length ? (
              <ul className="list-plain small">
                {history.map((h) => (
                  <li key={h.id}>
                    <b>{PATIENT_STATUS[h.toStatus].label}</b>
                    <br />
                    <span className="muted">
                      <DateTime value={h.createdAt} timeZone={tz} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No changes yet" />
            )}
          </section>
          {preSubmission ? (
            <section className="card-flat stack stack-sm" aria-labelledby="cancel-heading">
              <h2 id="cancel-heading">Cancel this request</h2>
              <details>
                <summary className="btn btn-quiet btn-sm">I want to cancel</summary>
                <div className="stack stack-sm" style={{ marginTop: 12 }}>
                  <p className="small muted">
                    You can cancel before you submit for clinical review. Any refund follows the cancellation and refund rules you accepted before paying.
                  </p>
                  <ActionForm action={cancelCase.bind(null, row.id)}>
                    <Checkbox name="confirm" value="yes" required>
                      I understand this cancels my request and cannot be undone.
                    </Checkbox>
                    <SubmitButton variant="danger" pendingText="Cancelling…">
                      Cancel request
                    </SubmitButton>
                  </ActionForm>
                </div>
              </details>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
