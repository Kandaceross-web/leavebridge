"use client";

import { useRef } from "react";

/**
 * Optional starting points for the patient message (CLN-10). Clicking one copies its text into the message box for the
 * clinician to rewrite; recording is refused while any bracketed part is left in.
 */
export function OutcomeStarters({ starters }: { starters: { label: string; text: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const use = (text: string) => {
    const box = ref.current?.closest("form")?.querySelector<HTMLTextAreaElement>('textarea[name="patientMessage"]');
    if (!box) return;
    box.value = text;
    box.focus();
  };
  return (
    <div ref={ref} className="stack stack-sm">
      <p className="small muted">Optional starting points. Pick one, then rewrite it in your own words and replace the bracketed parts.</p>
      <div className="cluster">
        {starters.map((s) => (
          <button key={s.label} type="button" className="btn btn-quiet btn-sm" onClick={() => use(s.text)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
