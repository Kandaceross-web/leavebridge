import { z } from "zod";

/**
 * Validated measures. Definitions carry the instrument text and scoring exactly as published by
 * the instrument authors; nothing here invents scoring or interpretation. Scores are shown to
 * clinicians only, as context for their independent judgment. Production enablement of each
 * instrument is gated by CLN-05.
 */
export const instrumentSchema = z.object({
  key: z.string(),
  name: z.string(),
  shortName: z.string(),
  instructions: z.string(),
  attribution: z.string(),
  options: z.array(z.object({ value: z.number().int(), label: z.string() })),
  items: z.array(z.object({ key: z.string(), text: z.string() })),
  bands: z.array(z.object({ min: z.number(), max: z.number(), label: z.string() })),
  /** Items whose response at or above minValue raises a safety flag for clinician follow-up. */
  safetyItems: z.array(z.object({ item: z.string(), minValue: z.number() })).default([]),
});
export type Instrument = z.infer<typeof instrumentSchema>;

const FREQ = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export const PHQ9: Instrument = {
  key: "phq9",
  name: "Patient Health Questionnaire (PHQ-9)",
  shortName: "PHQ-9",
  instructions: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  attribution:
    "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.",
  options: FREQ,
  items: [
    { key: "phq9_1", text: "Little interest or pleasure in doing things" },
    { key: "phq9_2", text: "Feeling down, depressed, or hopeless" },
    { key: "phq9_3", text: "Trouble falling or staying asleep, or sleeping too much" },
    { key: "phq9_4", text: "Feeling tired or having little energy" },
    { key: "phq9_5", text: "Poor appetite or overeating" },
    { key: "phq9_6", text: "Feeling bad about yourself, or that you are a failure or have let yourself or your family down" },
    { key: "phq9_7", text: "Trouble concentrating on things, such as reading the newspaper or watching television" },
    {
      key: "phq9_8",
      text: "Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual",
    },
    { key: "phq9_9", text: "Thoughts that you would be better off dead, or of hurting yourself in some way" },
  ],
  bands: [
    { min: 0, max: 4, label: "Minimal" },
    { min: 5, max: 9, label: "Mild" },
    { min: 10, max: 14, label: "Moderate" },
    { min: 15, max: 19, label: "Moderately severe" },
    { min: 20, max: 27, label: "Severe" },
  ],
  safetyItems: [{ item: "phq9_9", minValue: 1 }],
};

export const GAD7: Instrument = {
  key: "gad7",
  name: "Generalized Anxiety Disorder scale (GAD-7)",
  shortName: "GAD-7",
  instructions: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  attribution:
    "Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.",
  options: FREQ,
  items: [
    { key: "gad7_1", text: "Feeling nervous, anxious, or on edge" },
    { key: "gad7_2", text: "Not being able to stop or control worrying" },
    { key: "gad7_3", text: "Worrying too much about different things" },
    { key: "gad7_4", text: "Trouble relaxing" },
    { key: "gad7_5", text: "Being so restless that it is hard to sit still" },
    { key: "gad7_6", text: "Becoming easily annoyed or irritable" },
    { key: "gad7_7", text: "Feeling afraid, as if something awful might happen" },
  ],
  bands: [
    { min: 0, max: 4, label: "Minimal" },
    { min: 5, max: 9, label: "Mild" },
    { min: 10, max: 14, label: "Moderate" },
    { min: 15, max: 21, label: "Severe" },
  ],
  safetyItems: [],
};

export interface ScoredMeasure {
  total: number;
  band: string;
  safetyFlag: boolean;
  answers: Record<string, number>;
}

export function scoreInstrument(inst: Instrument, raw: Record<string, unknown>): { ok: true; result: ScoredMeasure } | { ok: false; missing: string[] } {
  const allowed = new Set(inst.options.map((o) => o.value));
  const answers: Record<string, number> = {};
  const missing: string[] = [];
  for (const item of inst.items) {
    const n = Number(raw[item.key]);
    if (raw[item.key] === undefined || raw[item.key] === "" || !Number.isInteger(n) || !allowed.has(n)) missing.push(item.key);
    else answers[item.key] = n;
  }
  if (missing.length) return { ok: false, missing };
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  const band = inst.bands.find((b) => total >= b.min && total <= b.max)?.label ?? "Unscored";
  const safetyFlag = inst.safetyItems.some((s) => (answers[s.item] ?? 0) >= s.minValue);
  return { ok: true, result: { total, band, safetyFlag, answers } };
}

export const DEFAULT_INSTRUMENTS = [PHQ9, GAD7];
