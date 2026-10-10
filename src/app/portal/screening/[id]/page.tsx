import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, ChoiceGroup, SubmitButton } from "@/components/forms";
import { Badge, Banner, ButtonLink, DateTime, Icon, KeyValue, Money } from "@/components/ui";
import { getSetting } from "@/server/settings";
import { myPatientProfile } from "@/server/services/portal-queries";
import { db } from "@/server/db/client";
import { patientStatusFor } from "@/domain/cases/state-machine";
import { RECORD_STATEMENT, RECORD_TITLE, SAME_DAY_SERVICE_NAME } from "@/config/same-day";
import { ownedScreening, screeningHref } from "../_lib/load";
import { chooseInstrumentsAction, completeAction, requestFollowUpAction, resendVerificationAction } from "./actions";

export const metadata: Metadata = { title: "Your screening" };

const LETTER_STATUS: Record<string, { label: string; tone: "progress" | "done" | "neutral" }> = {
  requested: { label: "With a clinician", tone: "progress" },
  approved: { label: "Issued", tone: "done" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export default async function ScreeningHome({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { view, emailVerified, extra } = await ownedScreening(id, async (ctx) => ({
    letterSetting: await getSetting(ctx.tx, "workExcuseLetter"),
    profile: await myPatientProfile(ctx),
  }));
  const { row, screening, paid, checkoutBlocker, measures, functioningDone, summary, record, letter } = view;
  const tz = extra.profile.timeZone;
  const status = patientStatusFor(row.kind, row.status);
  const href = screeningHref(row.id);
  const allMeasuresDone = measures.length > 0 && measures.every((m) => m.done);
  const crisis = screening.status === "held_for_review" ? await getSetting(db, "crisis") : null;

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="eyebrow">
          {SAME_DAY_SERVICE_NAME} · {row.reference}
        </p>
        <div className="row row-between" style={{ alignItems: "flex-end" }}>
          <h1>Your screening</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="lede">{status.explainer}</p>
      </header>

      {sp.welcome ? (
        <Banner tone="sage" icon="check">
          Your account is ready. We sent you an email to confirm your address.
        </Banner>
      ) : null}

      {/* ---- Before payment ---- */}
      {row.status === "started" ? (
        <section className="card stack" aria-labelledby="pay-h">
          <h2 id="pay-h">Before you start</h2>
          {!emailVerified ? (
            <div className="stack stack-sm">
              <Banner tone="info" icon="info">
                Please confirm your email address. Open the link we sent you. Your screening record is announced by email, so this comes first.
              </Banner>
              <ActionForm action={resendVerificationAction.bind(null, row.id)}>
                <SubmitButton variant="secondary" pendingText="Sending…">
                  Send a new link
                </SubmitButton>
              </ActionForm>
            </div>
          ) : checkoutBlocker ? (
            <Banner tone="info" icon="clock">
              {checkoutBlocker}
            </Banner>
          ) : (
            <div className="stack stack-sm">
              <p>Next, review what the screening is and pay securely. Your questionnaires open right after payment.</p>
              <div className="btn-row">
                <ButtonLink href={`${href}/pay`}>Review and pay</ButtonLink>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* ---- Questionnaires ---- */}
      {screening.status === "in_progress" ? (
        <section className="card stack" aria-labelledby="q-h">
          <h2 id="q-h">Your questionnaires</h2>
          {paid && !measures.length ? (
            <Banner tone="sage" icon="check">
              Payment received. Thank you. Choose your questionnaires to begin.
            </Banner>
          ) : null}
          {!measures.length ? (
            <ActionForm action={chooseInstrumentsAction.bind(null, row.id)}>
              <ChoiceGroup
                name="instruments"
                type="checkbox"
                legend="Which questionnaires would you like to complete?"
                hint="Each takes about two minutes. You can choose one or both."
                required
                options={[
                  { value: "phq9", label: "PHQ-9", description: "Nine questions about mood over the past two weeks." },
                  { value: "gad7", label: "GAD-7", description: "Seven questions about worry and anxiety over the past two weeks." },
                ]}
              />
              <SubmitButton pendingText="Saving…">Continue</SubmitButton>
            </ActionForm>
          ) : (
            <ol className="list-rows">
              {measures.map((m) => (
                <li key={m.key}>
                  <Icon name={m.done ? "check" : "file"} />
                  <div className="grow">
                    <b>{m.name}</b>
                  </div>
                  {m.done ? <Badge tone="done">Done</Badge> : <Link href={`${href}/questionnaire/${m.key}`}>Start {m.shortName}</Link>}
                </li>
              ))}
              <li>
                <Icon name={functioningDone ? "check" : "file"} />
                <div className="grow">
                  <b>Symptoms, work and missed time</b>
                </div>
                {functioningDone ? (
                  <Link href={`${href}/work`} className="small">
                    Review answers
                  </Link>
                ) : (
                  <Link href={`${href}/work`}>Answer</Link>
                )}
              </li>
            </ol>
          )}
          {allMeasuresDone && functioningDone ? (
            <ActionForm action={completeAction.bind(null, row.id)}>
              <p>Everything is answered. When you finish, your answers are scored and your screening record is prepared.</p>
              <SubmitButton pendingText="Preparing your record…">Finish and get my record</SubmitButton>
            </ActionForm>
          ) : null}
          <p className="fine">If you are in danger right now, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. Answers are not monitored in real time.</p>
        </section>
      ) : null}

      {/* ---- Held for clinician review ---- */}
      {screening.status === "held_for_review" && crisis ? (
        <section className="stack" aria-labelledby="held-h">
          <div className="banner banner-safety" role="alert">
            <div className="stack stack-sm">
              <p>
                <b>{crisis.headline}</b>
              </p>
              <p>{crisis.body}</p>
              <ul className="list-plain">
                {crisis.resources.map((r) => (
                  <li key={r.label}>
                    {r.href ? <a href={r.href}>{r.label}</a> : <b>{r.label}</b>}
                    {r.detail ? <span> · {r.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="card stack stack-sm">
            <h2 id="held-h">A clinician will look at your answers</h2>
            <p>
              Some of your answers mean a licensed clinician should review them before your screening record is issued. A clinician will review them on the next business day. No one is
              watching answers in real time, at night or on weekends, so please use the resources above if you need help now.
            </p>
            <p className="small muted">You do not need to do anything else here. We will email you when there is an update.</p>
          </div>
        </section>
      ) : null}

      {screening.status === "closed" ? (
        <Banner tone="info" icon="info">
          A clinician reviewed this screening and closed it without issuing a record. Please check <Link href="/portal/messages">your messages</Link> or <Link href="/portal/notifications">notifications</Link> for details. If you need help now, call or text <a href="tel:988">988</a>.
        </Banner>
      ) : null}

      {/* ---- Issued ---- */}
      {record ? (
        <section className="card stack" aria-labelledby="rec-h">
          <div className="card-head">
            <h2 id="rec-h">{RECORD_TITLE}</h2>
            {record.status === "valid" ? <Badge tone="done">Issued</Badge> : <Badge tone="alert">Revoked</Badge>}
          </div>
          {sp.finished ? (
            <Banner tone="sage" icon="check">
              Your screening record is ready.
            </Banner>
          ) : null}
          <KeyValue
            items={[
              ["Document number", <span key="n" className="mono">{record.publicId}</span>],
              ["Issued", <DateTime key="d" value={record.issuedAt} timeZone={tz} />],
            ]}
          />
          {record.status === "valid" ? (
            <div className="btn-row">
              <a className="btn btn-primary" href={`/api/files/${record.fileId}`} download>
                Download PDF
              </a>
              <ButtonLink href={`/verify/${record.publicId}`} variant="quiet">
                Check verification page
              </ButtonLink>
            </div>
          ) : (
            <Banner tone="warn" icon="info">
              This record was revoked and can no longer be downloaded. Please check your notifications for details.
            </Banner>
          )}
          <p className="small muted">{RECORD_STATEMENT}</p>
          {summary ? (
            <details>
              <summary className="btn btn-secondary btn-sm">Read your summary</summary>
              <div className="stack mt-2">
                {summary.sections.map((s) => (
                  <div key={s.heading} className="stack stack-sm">
                    <h3>{s.heading}</h3>
                    {s.lines.map((l) => (
                      <p key={l}>{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      {/* ---- Work excuse letter ---- */}
      {record?.status === "valid" && screening.status === "issued" && extra.letterSetting.enabled ? (
        <section className="card-flat stack stack-sm" aria-labelledby="letter-h">
          <div className="card-head">
            <h2 id="letter-h">Work excuse letter</h2>
            {letter ? <Badge tone={LETTER_STATUS[letter.status]!.tone}>{LETTER_STATUS[letter.status]!.label}</Badge> : null}
          </div>
          {!letter ? (
            <>
              <p>
                Your screening record is not a work excuse. You can ask a licensed clinician to review your screening and consider a work excuse letter. The clinician decides whether to
                issue one, and may change or decline it. Each screening can have one letter request.
              </p>
              <div className="btn-row">
                <ButtonLink href={`${href}/letter`} variant="secondary">
                  Request a letter
                </ButtonLink>
              </div>
            </>
          ) : letter.status === "requested" ? (
            <p>
              A clinician is reviewing your request from <DateTime value={letter.createdAt} timeZone={tz} />. We will email you when there is an update.
            </p>
          ) : letter.status === "approved" && letter.issued ? (
            <div className="stack stack-sm">
              <KeyValue
                items={[
                  ["Document number", <span key="n" className="mono">{letter.issued.publicId}</span>],
                  ["Issued", <DateTime key="d" value={letter.issued.issuedAt} timeZone={tz} />],
                ]}
              />
              {letter.issued.status === "valid" ? (
                <div className="btn-row">
                  <a className="btn btn-primary" href={`/api/files/${letter.issued.fileId}`} download>
                    Download letter
                  </a>
                </div>
              ) : (
                <Banner tone="warn" icon="info">
                  This letter was revoked and can no longer be downloaded.
                </Banner>
              )}
            </div>
          ) : letter.status === "declined" ? (
            <div className="stack stack-sm">
              <p>The clinician did not issue a letter for this screening.</p>
              {letter.declineMessage ? <blockquote className="card-quiet">{letter.declineMessage}</blockquote> : null}
              {letter.recommendAssessment ? (
                <p>
                  The clinician recommends a full clinician-led assessment. <Link href="/services">See our services</Link>.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---- Optional follow-up: a full clinician-led assessment (offered to everyone, never score-triggered) ---- */}
      {record?.status === "valid" && screening.status === "issued" ? (
        <section className="card-flat stack stack-sm" aria-labelledby="follow-h">
          <h2 id="follow-h">Would you like a full assessment?</h2>
          {screening.followUpRequestedAt ? (
            <p>
              Thank you. You asked us to reach out on <DateTime value={screening.followUpRequestedAt} timeZone={tz} dateOnly />. We will contact you to
              arrange your assessment. There is nothing more you need to do.
            </p>
          ) : (
            <>
              <p>
                This screening is a starting point. If you would like a licensed clinician to look more closely at how you are doing, including leave
                documentation when it is clinically appropriate, we can reach out to schedule a full assessment. Nothing is booked or charged until you
                decide.
              </p>
              <ActionForm action={requestFollowUpAction.bind(null, row.id)}>
                <SubmitButton variant="secondary" pendingText="Sending…">
                  Yes, please contact me
                </SubmitButton>
              </ActionForm>
            </>
          )}
        </section>
      ) : null}

      {paid ? (
        <p className="small muted">
          Paid <Money cents={paid.amountCents} currency={paid.currency} /> on <DateTime value={paid.paidAt} timeZone={tz} dateOnly />.
        </p>
      ) : null}
    </div>
  );
}
