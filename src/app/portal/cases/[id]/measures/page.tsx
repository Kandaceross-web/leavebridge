import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Banner, ButtonLink } from "@/components/ui";
import { caseFacts } from "@/server/services/cases";
import { measureStatus } from "@/server/services/intake";
import { gate } from "@/domain/cases/checklist";
import { ownedCase } from "../../../_lib/load";
import { caseHref, stepHref } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";

export const metadata: Metadata = { title: "Questionnaires" };

export default async function MeasuresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => {
    const facts = await caseFacts(ctx, r);
    return {
      list: facts.measuresEnabled ? await measureStatus(ctx, r.id) : [],
      gate: gate(facts, "measures"),
    };
  });
  const { list } = extra;
  const remaining = list.filter((m) => !m.completedAt);

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step="measures"
        title="Questionnaires"
        lede="Short standardized questionnaires about the past two weeks. Your answers go to your clinician as part of their review."
      />
      {!extra.gate.ok ? (
        <Banner tone="info" icon="lock">
          {extra.gate.reason} <Link href={caseHref(row.id)}>Back to your steps</Link>
        </Banner>
      ) : null}
      {!list.length ? (
        <Banner tone="info" icon="info">
          No questionnaires are needed for your request.{" "}
          <Link href={stepHref(row.id, "documents")}>Continue to documents</Link>
        </Banner>
      ) : (
        <ol className="checklist">
          {list.map((m, i) => {
            const cls = m.completedAt
              ? "done"
              : m.key === remaining[0]?.key
                ? "current"
                : undefined;
            return (
              <li key={m.key} className={cls}>
                <span className="step-dot" aria-hidden="true">
                  {m.completedAt ? "✓" : i + 1}
                </span>
                <div className="grow">
                  {m.completedAt || !extra.gate.ok ? (
                    <b>{m.name}</b>
                  ) : (
                    <Link href={`${caseHref(row.id)}/measures/${m.key}`}>{m.name}</Link>
                  )}
                  <small>
                    {m.score !== null
                      ? `Your score: ${m.score} out of ${m.maxScore}`
                      : `${m.items} questions · about ${Math.max(1, Math.round(m.items / 4))} min`}
                  </small>
                </div>
                {m.completedAt ? (
                  <Badge tone="done">Complete</Badge>
                ) : (
                  <Badge tone="action">To do</Badge>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {list.some((m) => m.score !== null) ? (
        <p className="small muted">
          Your clinician reads these scores together with everything else you share. A score is not
          a diagnosis and does not decide your request on its own.
        </p>
      ) : null}
      {list.length && extra.gate.ok ? (
        <div className="btn-row">
          {remaining.length ? (
            <ButtonLink href={`${caseHref(row.id)}/measures/${remaining[0]!.key}`}>
              Start {remaining[0]!.name}
            </ButtonLink>
          ) : (
            <ButtonLink href={stepHref(row.id, "documents")}>Continue to documents</ButtonLink>
          )}
        </div>
      ) : null}
    </div>
  );
}
