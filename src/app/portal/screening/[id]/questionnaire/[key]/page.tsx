import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ActionForm, ChoiceGroup, SubmitButton } from "@/components/forms";
import { Banner } from "@/components/ui";
import { getInstrument } from "@/server/services/intake";
import { SAME_DAY_SERVICE_NAME } from "@/config/same-day";
import { SafetyGate } from "../../../../_components/client";
import { crisisContent } from "../../../../_components/crisis";
import { ownedScreening, screeningHref } from "../../../_lib/load";
import { submitQuestionnaireAction } from "../../actions";

export const metadata: Metadata = { title: "Questionnaire" };

export default async function SameDayQuestionnairePage({ params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  const { view, extra } = await ownedScreening(id, (ctx) => getInstrument(ctx, key));
  const inst = extra;
  const { row, screening, measures } = view;
  const href = screeningHref(row.id);
  if (!inst || !measures.some((m) => m.key === key)) notFound();
  if (screening.status !== "in_progress" || measures.find((m) => m.key === key)?.done) redirect(href);
  const crisis = await crisisContent();
  const options = inst.options.map((o) => ({ value: String(o.value), label: o.label }));

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <p className="eyebrow">
          {SAME_DAY_SERVICE_NAME} · {row.reference}
        </p>
        <h1>{inst.name}</h1>
        <p className="lede">{inst.instructions}</p>
      </header>
      <p className="small">
        <Link href={href}>Back to your screening</Link>
      </p>
      <Banner tone="info" icon="info">
        If you are in danger right now, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>. Answers are not monitored in real time.
      </Banner>
      <ActionForm action={submitQuestionnaireAction.bind(null, row.id, inst.key)} className="form card">
        <SafetyGate crisis={crisis} nextHref={href} nextLabel="Back to your screening">
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
