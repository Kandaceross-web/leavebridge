"use client";

import { useState } from "react";
import {
  BASICS_OPTIONS,
  BASICS_QUESTIONS,
  BASICS_RESULTS,
  basicsResult,
  type BasicsAnswer,
} from "@/config/basics-check";

/**
 * FMLA basics check. Asks only about the job (employer size, months worked, hours worked), never
 * about health, and runs entirely in the browser: answers are not sent, stored, or tracked.
 * The result is general information; the employer decides FMLA eligibility.
 */
export function FmlaBasicsCheck() {
  const [answers, setAnswers] = useState<Record<string, BasicsAnswer>>({});
  const done = BASICS_QUESTIONS.every((q) => answers[q.id]);
  const result = done ? BASICS_RESULTS[basicsResult(Object.values(answers))] : null;
  return (
    <div className="stack stack-lg" data-basics-check>
      {BASICS_QUESTIONS.map((q) => (
        <fieldset key={q.id}>
          <legend>{q.legend}</legend>
          <p className="small muted">{q.hint}</p>
          <div className="choices-inline">
            {BASICS_OPTIONS.map((o) => (
              <label key={o.value} className="choice">
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  checked={answers[q.id] === o.value}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                />
                <b>{o.label}</b>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div aria-live="polite" data-basics-result>
        {result ? (
          <div className={`card ${result.card} stack stack-sm`}>
            <h2>{result.title}</h2>
            <p>{result.body}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
