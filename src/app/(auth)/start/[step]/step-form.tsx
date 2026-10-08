"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ChoiceGroup,
  FormMessages,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/forms";
import type { ActionState } from "@/server/web/action-state";
import { saveStepAction } from "../actions";

interface Q {
  key: string;
  kind: "single" | "multi" | "state" | "date" | "text";
  label: string;
  help?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  value?: string | string[];
}

export function ScreeningStepForm({
  step,
  questions,
  backHref,
  isLast,
}: {
  step: string;
  questions: Q[];
  backHref: string;
  isLast: boolean;
}) {
  const [state, action] = useActionState(saveStepAction, {} as ActionState);
  const err = (k: string) => state.fieldErrors?.[k];
  return (
    <form action={action} className="form card" noValidate key={state.at}>
      <FormMessages state={state} />
      <input type="hidden" name="step" value={step} />
      {questions.map((q) => {
        const v = state.values ? state.values[q.key] : q.value;
        if (q.kind === "state")
          return (
            <SelectField
              key={q.key}
              name={q.key}
              label={q.label}
              hint={q.help}
              required={q.required}
              options={q.options ?? []}
              defaultValue={typeof v === "string" ? v : ""}
              placeholder="Choose a state"
              error={err(q.key)}
            />
          );
        if (q.kind === "date")
          return (
            <TextField
              key={q.key}
              name={q.key}
              type="date"
              label={q.label}
              hint={q.help}
              required={q.required}
              defaultValue={typeof v === "string" ? v : ""}
              error={err(q.key)}
            />
          );
        if (q.kind === "text")
          return (
            <TextField
              key={q.key}
              name={q.key}
              label={q.label}
              hint={q.help}
              required={q.required}
              defaultValue={typeof v === "string" ? v : ""}
              error={err(q.key)}
            />
          );
        return (
          <ChoiceGroup
            key={q.key}
            name={q.key}
            legend={q.label}
            hint={q.help}
            type={q.kind === "multi" ? "checkbox" : "radio"}
            required={q.required}
            options={q.options ?? []}
            defaultValue={v}
            error={err(q.key)}
          />
        );
      })}
      <div className="btn-row row-between">
        <Link href={backHref} className="btn btn-quiet">
          Back
        </Link>
        <SubmitButton pendingText="Saving…">{isLast ? "See results" : "Continue"}</SubmitButton>
      </div>
    </form>
  );
}
