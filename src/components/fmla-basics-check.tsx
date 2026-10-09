"use client";

import { useState } from "react";

/**
 * FMLA basics check. Asks only about the job (employer size, months worked, hours worked), never
 * about health, and runs entirely in the browser: answers are not sent, stored, or tracked.
 * The result is general information; the employer decides FMLA eligibility.
 */

type Answer = "yes" | "no" | "unsure";
const QUESTIONS = [
  { id: "size", legend: "Does your employer have 50 or more employees working within 75 miles of your worksite?", hint: "Public agencies and schools are covered by FMLA at any size, but this 50-employee rule still applies to whether you are eligible." },
  { id: "months", legend: "Have you worked for this employer for at least 12 months in total?", hint: "The months don't need to be in a row." },
  { id: "hours", legend: "Have you worked at least 1,250 hours in the last 12 months?", hint: "That's about 24 hours a week. Paid time off doesn't count toward it." },
] as const;

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "I'm not sure" },
];

export function FmlaBasicsCheck() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const done = QUESTIONS.every((q) => answers[q.id]);
  const values = Object.values(answers);
  const result = !done ? null : values.includes("no") ? "unlikely" : values.includes("unsure") ? "unsure" : "likely";
  return (
    <div className="stack stack-lg">
      {QUESTIONS.map((q) => (
        <fieldset key={q.id}>
          <legend>{q.legend}</legend>
          <p className="small muted">{q.hint}</p>
          <div className="choices-inline">
            {OPTIONS.map((o) => (
              <label key={o.value} className="choice">
                <input type="radio" name={q.id} value={o.value} checked={answers[q.id] === o.value} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))} />
                <b>{o.label}</b>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div aria-live="polite">
        {result === "likely" ? (
          <div className="card card-mint stack stack-sm">
            <h2>FMLA may apply to your job</h2>
            <p>Your answers match the basic FMLA eligibility rules. Your employer or leave administrator makes the final decision, and FMLA leave also needs a serious health condition supported by medical certification.</p>
          </div>
        ) : result === "unsure" ? (
          <div className="card card-sun stack stack-sm">
            <h2>Check the details with HR</h2>
            <p>Your HR team or leave administrator can tell you your months and hours of service and whether your worksite meets the 50-employee rule.</p>
          </div>
        ) : result === "unlikely" ? (
          <div className="card card-lavender stack stack-sm">
            <h2>FMLA may not apply, but you may still have options</h2>
            <p>Your employer&rsquo;s own leave policy, short-term disability coverage, or a workplace accommodation may still help. Ask HR what applies to you.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
