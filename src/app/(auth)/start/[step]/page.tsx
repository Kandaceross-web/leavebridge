import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { currentScreening, screeningState, evalEnv } from "@/server/services/screening";
import { visibleQuestions } from "@/domain/screening/engine";
import { ScreeningStepForm } from "./step-form";

export const metadata: Metadata = { title: "Check if we can help" };

export default async function ScreeningStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const data = await withActor({ kind: "anonymous" }, async (ctx) => {
    const row = await currentScreening(ctx);
    if (!row) return null;
    const { ruleset, answers } = await screeningState(ctx, row);
    const env = await evalEnv(ctx.tx);
    return { row, ruleset, answers, env };
  });
  if (!data) redirect("/start?expired=1");
  if (data.row.status !== "in_progress") redirect("/start/result");
  const steps = data.ruleset.def.steps;
  const idx = steps.findIndex((s) => s.key === step);
  if (idx < 0) notFound();
  if (idx > data.row.stepIndex) redirect(`/start/${steps[data.row.stepIndex]!.key}`);
  const s = steps[idx]!;
  const questions = visibleQuestions(data.ruleset.def, step, data.answers, data.env).map((q) => ({ ...q, value: data.answers[q.key] }));
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack stack-sm">
        <p className="eyebrow">
          Question set {idx + 1} of {steps.length}
        </p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={idx} aria-label="Screening progress">
          <i style={{ width: `${Math.round((idx / steps.length) * 100)}%` }} />
        </div>
        <h1>{s.title}</h1>
        {s.description ? <p className="lede">{s.description}</p> : null}
      </header>
      <ScreeningStepForm step={step} questions={questions} backHref={idx > 0 ? `/start/${steps[idx - 1]!.key}` : "/start"} isLast={idx === steps.length - 1} />
    </div>
  );
}
