import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActionForm, ChoiceGroup, SubmitButton } from "@/components/forms";
import { Banner } from "@/components/ui";
import { caseFacts } from "@/server/services/cases";
import { getInstrument, measureStatus } from "@/server/services/intake";
import { gate } from "@/domain/cases/checklist";
import { ownedCase } from "../../../../_lib/load";
import { caseHref, stepHref } from "../../../../_lib/steps";
import { StepHead } from "../../../../_components/step-head";
import { SafetyGate } from "../../../../_components/client";
import { crisisContent } from "../../../../_components/crisis";
import { submitMeasureAction } from "../actions";

export const metadata: Metadata = { title: "Questionnaire" };

export default async function MeasurePage({ params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    inst: await getInstrument(ctx, key),
    list: await measureStatus(ctx, r.id),
    gate: gate(await caseFacts(ctx, r), "measures"),
  }));
  const { inst, list } = extra;
  if (!inst) notFound();
  if (!extra.gate.ok || list.find((m) => m.key === key)?.completedAt) redirect(`${caseHref(row.id)}/measures`);
  const nextMeasure = list.find((m) => !m.completedAt && m.key !== key);
  const nextHref = nextMeasure ? `${caseHref(row.id)}/measures/${nextMeasure.key}` : stepHref(row.id, "documents");
  const crisis = await crisisContent();
  const options = inst.options.map((o) => ({ value: String(o.value), label: o.label }));

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead caseId={row.id} reference={row.reference} steps={steps} step="measures" title={inst.name} lede={inst.instructions} />
      <p className="small">
        <Link href={`${caseHref(row.id)}/measures`}>All questionnaires</Link>
      </p>
      {inst.safetyItems.length ? (
        <Banner tone="info" icon="info">
          If you are in danger right now, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. Answers are not monitored in real time.
        </Banner>
      ) : null}
      <ActionForm action={submitMeasureAction.bind(null, row.id, inst.key, nextHref)} className="form card">
        <SafetyGate crisis={crisis} nextHref={nextHref} nextLabel={nextMeasure ? `Continue to ${nextMeasure.name}` : "Continue to documents"}>
          {inst.items.map((item, i) => (
            <ChoiceGroup key={item.key} name={item.key} legend={`${i + 1}. ${item.text}`} required options={options} />
          ))}
          <SubmitButton pendingText="Saving…">Submit answers</SubmitButton>
          <p className="fine">{inst.attribution}</p>
        </SafetyGate>
      </ActionForm>
    </div>
  );
}
