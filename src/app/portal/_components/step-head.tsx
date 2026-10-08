import Link from "next/link";
import type { ReactNode } from "react";
import type { ChecklistStep, StepKey } from "@/domain/cases/checklist";
import { caseHref } from "../_lib/steps";

/** Heading for a journey step: where you are in the checklist and a way back to the case. */
export function StepHead({
  caseId,
  reference,
  steps,
  step,
  title,
  lede,
}: {
  caseId: string;
  reference: string;
  steps: ChecklistStep[];
  step?: StepKey;
  title: ReactNode;
  lede?: ReactNode;
}) {
  const idx = step ? steps.findIndex((s) => s.key === step) : -1;
  return (
    <header className="page-head">
      <p className="small">
        <Link href={caseHref(caseId)}>
          <span aria-hidden="true">← </span>Back to your case
        </Link>
      </p>
      <p className="eyebrow">
        {idx >= 0 ? `Step ${idx + 1} of ${steps.length} · ` : null}
        Case {reference}
      </p>
      <h1>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}
