import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, ChoiceGroup, SubmitButton, TextField } from "@/components/forms";
import { Banner } from "@/components/ui";
import { decryptJson } from "@/server/crypto";
import { FUNCTIONING_QUESTIONS, SAFETY_QUESTION, SAME_DAY_SERVICE_NAME, type ChoiceQuestion } from "@/config/same-day";
import type { FunctioningAnswers } from "@/domain/same-day/rules";
import { SafetyGate } from "../../../_components/client";
import { crisisContent } from "../../../_components/crisis";
import { ownedScreening, screeningHref } from "../../_lib/load";
import { saveWorkAction } from "../actions";

export const metadata: Metadata = { title: "Symptoms and work" };

function Question({ q, value }: { q: ChoiceQuestion; value: FunctioningAnswers[string] | undefined }) {
  if (q.kind === "number") {
    return (
      <TextField
        name={q.key}
        label={q.label}
        hint={q.help}
        type="number"
        inputMode="numeric"
        min={String(q.min ?? 0)}
        max={String(q.max ?? 31)}
        defaultValue={value === undefined ? undefined : String(value)}
        required
      />
    );
  }
  return (
    <ChoiceGroup
      name={q.key}
      legend={q.label}
      hint={q.help}
      type={q.kind === "multi" ? "checkbox" : "radio"}
      required
      options={q.options ?? []}
      defaultValue={Array.isArray(value) ? value : value === undefined ? undefined : String(value)}
    />
  );
}

export default async function SameDayWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await ownedScreening(id);
  const { row, screening } = view;
  const href = screeningHref(row.id);
  if (screening.status !== "in_progress") redirect(href);
  const saved = decryptJson<FunctioningAnswers>(screening.functioning, {});
  const crisis = await crisisContent();

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="eyebrow">
          {SAME_DAY_SERVICE_NAME} · {row.reference}
        </p>
        <h1>Symptoms, work and missed time</h1>
        <p className="lede">These answers are included in your screening record as you give them. They are not verified.</p>
      </header>
      <p className="small">
        <Link href={href}>Back to your screening</Link>
      </p>
      <ActionForm action={saveWorkAction.bind(null, row.id)} className="form card">
        <SafetyGate crisis={crisis} nextHref={href} nextLabel="Back to your screening">
          {FUNCTIONING_QUESTIONS.map((q) => (
            <Question key={q.key} q={q} value={saved[q.key]} />
          ))}
          <Banner tone="info" icon="info">
            If you are in danger right now, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>.
          </Banner>
          <Question q={SAFETY_QUESTION} value={saved[SAFETY_QUESTION.key]} />
          <SubmitButton pendingText="Saving…">Save answers</SubmitButton>
        </SafetyGate>
      </ActionForm>
    </div>
  );
}
