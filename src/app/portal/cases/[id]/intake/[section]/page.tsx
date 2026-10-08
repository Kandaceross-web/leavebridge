import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActionForm, ChoiceGroup, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Banner } from "@/components/ui";
import { caseFacts } from "@/server/services/cases";
import { getIntake } from "@/server/services/intake";
import { JURISDICTIONS } from "@/config/catalog";
import type { IntakeQuestion } from "@/config/intake";
import { gate } from "@/domain/cases/checklist";
import { ownedCase } from "../../../../_lib/load";
import { caseHref } from "../../../../_lib/steps";
import { StepHead } from "../../../../_components/step-head";
import { SafetyGate, ShowIf } from "../../../../_components/client";
import { crisisContent } from "../../../../_components/crisis";
import { saveSection } from "../actions";

export const metadata: Metadata = { title: "Secure intake" };

const STATE_OPTIONS = JURISDICTIONS.map(([value, label]) => ({ value, label }));

function Question({ q, value }: { q: IntakeQuestion; value: string | string[] | undefined }) {
  const str = typeof value === "string" ? value : undefined;
  switch (q.kind) {
    case "textarea":
      return <TextArea name={q.key} label={q.label} hint={q.help} required={q.required} maxLength={q.maxLength} rows={5} defaultValue={str} />;
    case "text":
      return <TextField name={q.key} label={q.label} hint={q.help} required={q.required} maxLength={q.maxLength} defaultValue={str} />;
    case "date":
      return <TextField name={q.key} type="date" label={q.label} hint={q.help} required={q.required} defaultValue={str} />;
    case "state":
      return <SelectField name={q.key} label={q.label} hint={q.help} required={q.required} options={STATE_OPTIONS} placeholder="Choose a state" defaultValue={str ?? ""} />;
    case "multi":
      return <ChoiceGroup name={q.key} legend={q.label} hint={q.help ?? "Choose all that apply."} type="checkbox" required={q.required} options={q.options ?? []} defaultValue={value} />;
    default:
      return <ChoiceGroup name={q.key} legend={q.label} hint={q.help} required={q.required} options={q.options ?? []} defaultValue={str} />;
  }
}

export default async function IntakeSectionPage({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    intake: await getIntake(ctx, r.id, "owner"),
    gate: gate(await caseFacts(ctx, r), "intake"),
  }));
  const { intake } = extra;
  const sections = intake.template.def.sections;
  const idx = sections.findIndex((s) => s.key === section);
  if (idx < 0) notFound();
  if (intake.status === "submitted" || !extra.gate.ok) redirect(`${caseHref(row.id)}/intake`);
  const s = sections[idx]!;
  const next = sections[idx + 1];
  const nextHref = next ? `${caseHref(row.id)}/intake/${next.key}` : `${caseHref(row.id)}/intake#review`;
  const crisis = await crisisContent();
  const answers = intake.answers;

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead caseId={row.id} reference={row.reference} steps={steps} step="intake" title={s.title} lede={s.description} />
      <div className="stack stack-sm">
        <p className="small">
          Section {idx + 1} of {sections.length} · <Link href={`${caseHref(row.id)}/intake`}>All sections</Link>
        </p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={sections.length} aria-valuenow={idx} aria-label="Intake progress">
          <i style={{ width: `${Math.round((idx / sections.length) * 100)}%` }} />
        </div>
      </div>
      {s.key === "safety" ? (
        <Banner tone="info" icon="info">
          If you are in danger right now, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. This form is not monitored in real time.
        </Banner>
      ) : null}
      <ActionForm action={saveSection.bind(null, row.id, s.key, nextHref)} className="form card">
        <SafetyGate crisis={crisis} nextHref={nextHref} nextLabel={next ? `Continue to ${next.title}` : "Continue to review"}>
          <p className="fine">
            Questions marked <span className="req">*</span> are required. Share what you are comfortable sharing.
          </p>
          {s.questions.map((q) =>
            q.showIf ? (
              <ShowIf key={q.key} field={q.showIf.q} equals={q.showIf.eq} initial={answers[q.showIf.q] === q.showIf.eq}>
                <Question q={q} value={answers[q.key]} />
              </ShowIf>
            ) : (
              <Question key={q.key} q={q} value={answers[q.key]} />
            ),
          )}
          <div className="btn-row row-between">
            {idx > 0 ? (
              <Link href={`${caseHref(row.id)}/intake/${sections[idx - 1]!.key}`} className="btn btn-quiet">
                Previous section
              </Link>
            ) : (
              <Link href={`${caseHref(row.id)}/intake`} className="btn btn-quiet">
                All sections
              </Link>
            )}
            <SubmitButton pendingText="Saving…">{next ? "Save and continue" : "Save and review"}</SubmitButton>
          </div>
        </SafetyGate>
      </ActionForm>
    </div>
  );
}
