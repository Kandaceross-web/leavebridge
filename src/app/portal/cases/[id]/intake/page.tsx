import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Banner, ButtonLink } from "@/components/ui";
import { caseFacts } from "@/server/services/cases";
import { getIntake } from "@/server/services/intake";
import { gate } from "@/domain/cases/checklist";
import { ownedCase } from "../../../_lib/load";
import { caseHref, stepHref } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { submitIntakeAction } from "./actions";

export const metadata: Metadata = { title: "Secure intake" };

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    intake: await getIntake(ctx, r.id, "owner"),
    gate: gate(await caseFacts(ctx, r), "intake"),
  }));
  const { intake } = extra;
  const sections = intake.template.def.sections;
  const done = new Set(intake.completed);
  const doneCount = sections.filter((s) => done.has(s.key)).length;
  const submitted = intake.status === "submitted";
  const firstOpen = sections.find((s) => !done.has(s.key));
  const minutes = sections.filter((s) => !done.has(s.key)).reduce((n, s) => n + s.estimatedMinutes, 0);

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step="intake"
        title="Secure intake"
        lede="Tell the clinician about your history and how symptoms affect work. Each section saves when you continue, so you can stop and come back."
      />
      {!extra.gate.ok && !submitted ? (
        <Banner tone="info" icon="lock">
          {extra.gate.reason} <Link href={caseHref(row.id)}>Back to your steps</Link>
        </Banner>
      ) : null}
      <div className="stack stack-sm">
        <div className="row row-between small">
          <span>
            {doneCount} of {sections.length} sections complete
          </span>
          {!submitted && minutes ? <span className="muted">About {minutes} minutes left</span> : null}
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={sections.length} aria-valuenow={doneCount} aria-label="Intake progress">
          <i style={{ width: `${Math.round((doneCount / sections.length) * 100)}%` }} />
        </div>
      </div>
      {submitted ? (
        <Banner tone="sage" icon="check">
          Your intake was submitted. To add information now, use <Link href={`${caseHref(row.id)}/messages`}>secure messages</Link>.
        </Banner>
      ) : null}
      <ol className="checklist">
        {sections.map((s, i) => {
          const isDone = done.has(s.key);
          const cls = isDone ? "done" : s.key === firstOpen?.key ? "current" : undefined;
          return (
            <li key={s.key} className={cls}>
              <span className="step-dot" aria-hidden="true">
                {isDone ? "✓" : i + 1}
              </span>
              <div className="grow">
                {submitted || !extra.gate.ok ? <b>{s.title}</b> : <Link href={`${caseHref(row.id)}/intake/${s.key}`}>{s.title}</Link>}
                <small>
                  {s.description} · about {s.estimatedMinutes} min
                </small>
              </div>
              {isDone ? <Badge tone="done">Saved</Badge> : <Badge tone="action">To do</Badge>}
            </li>
          );
        })}
      </ol>
      {!submitted && extra.gate.ok ? (
        firstOpen ? (
          <div className="btn-row">
            <ButtonLink href={`${caseHref(row.id)}/intake/${firstOpen.key}`}>{doneCount ? "Continue intake" : "Start intake"}</ButtonLink>
          </div>
        ) : (
          <section id="review" className="card stack" aria-labelledby="review-heading">
            <h2 id="review-heading">Review and submit your intake</h2>
            <p className="muted">
              All sections are saved. You can open any section above to review or change your answers. After you submit, answers can&rsquo;t be edited, but you can add information through secure messages.
            </p>
            <ActionForm action={submitIntakeAction.bind(null, row.id)}>
              <SubmitButton pendingText="Submitting…">Submit intake</SubmitButton>
            </ActionForm>
          </section>
        )
      ) : null}
      {submitted ? (
        <div className="btn-row">
          <ButtonLink href={stepHref(row.id, "measures")}>Continue to questionnaires</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
