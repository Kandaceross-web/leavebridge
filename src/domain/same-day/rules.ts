import {
  ANSWER_PHRASE,
  FUNCTIONING_QUESTIONS,
  HOLD_RULES,
  INSTRUMENT_MEASURES,
  isExcuseSetting,
  LETTER_TEXT,
  letterOpening,
  RECORD_STATEMENT,
  SAFETY_QUESTION,
  SAME_DAY_INSTRUMENTS,
  SUMMARY_TEXT,
  type ChoiceQuestion,
  type ExcuseSetting,
  type SameDayInstrument,
} from "@/config/same-day";

/**
 * Pure rules for the Same-Day Mental Health Assessment: answer validation, the safety hold, the
 * rule-based summary and the proposed work excuse letter. Deterministic: the same answers always
 * produce the same text. No AI model and no clinical judgment: scores, published severity ranges
 * and the person's own answers only.
 */

export type FunctioningAnswers = Record<string, string | string[] | number>;

export const ALL_FUNCTIONING_QUESTIONS: ChoiceQuestion[] = [
  ...FUNCTIONING_QUESTIONS,
  SAFETY_QUESTION,
];

export function isSameDayInstrument(v: string): v is SameDayInstrument {
  return (SAME_DAY_INSTRUMENTS as readonly string[]).includes(v);
}

/** Validates the work-functioning form. Every question is required. "None" in a multi-choice excludes the rest. */
export function validateFunctioning(raw: Record<string, string | string[] | undefined>): {
  answers: FunctioningAnswers;
  errors: Record<string, string>;
} {
  const answers: FunctioningAnswers = {};
  const errors: Record<string, string> = {};
  for (const q of ALL_FUNCTIONING_QUESTIONS) {
    const value = raw[q.key];
    const allowed = new Set((q.options ?? []).map((o) => o.value));
    if (q.kind === "multi") {
      const arr = (Array.isArray(value) ? value : value ? [value] : []).filter((v) =>
        allowed.has(v),
      );
      if (!arr.length) errors[q.key] = "Choose at least one option.";
      else if (arr.includes("none") && arr.length > 1)
        errors[q.key] = "Choose “None of these” on its own, or uncheck it.";
      else answers[q.key] = [...new Set(arr)];
    } else if (q.kind === "number") {
      const s = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
      const n = Number(s);
      if (!s || !/^\d{1,2}$/.test(s) || n < (q.min ?? 0) || n > (q.max ?? 31))
        errors[q.key] = `Enter a whole number from ${q.min ?? 0} to ${q.max ?? 31}.`;
      else answers[q.key] = n;
    } else {
      const s = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
      if (!s || !allowed.has(s)) errors[q.key] = "Choose one of the options.";
      else answers[q.key] = s;
    }
  }
  return { answers, errors };
}

export interface ScoredInstrument {
  key: SameDayInstrument;
  shortName: string;
  total: number;
  band: string;
  answers: Record<string, number>;
}

/** Rule codes that hold the record for clinician review. Empty means it may be issued automatically. */
export function holdReasons(input: {
  measures: readonly ScoredInstrument[];
  functioning: FunctioningAnswers | null;
}): string[] {
  const out: string[] = [];
  const phq = input.measures.find((m) => m.key === "phq9");
  if (phq && (phq.answers[HOLD_RULES.phq9Item.item] ?? 0) >= HOLD_RULES.phq9Item.minValue)
    out.push(HOLD_RULES.phq9Item.code);
  const safety = input.functioning?.[SAFETY_QUESTION.key];
  if (
    typeof safety === "string" &&
    (HOLD_RULES.safetyAnswers.values as readonly string[]).includes(safety)
  )
    out.push(HOLD_RULES.safetyAnswers.code);
  return out;
}

export interface SummarySection {
  heading: string;
  lines: string[];
}

export interface ScreeningSummary {
  version: 1;
  completedAt: string;
  scores: { key: SameDayInstrument; shortName: string; total: number; max: number; band: string }[];
  sections: SummarySection[];
}

const phrase = (q: string, v: unknown) =>
  typeof v === "string" ? (ANSWER_PHRASE[q]?.[v] ?? null) : null;

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

/**
 * The individualized summary. Every sentence is either fixed text from src/config/same-day.ts or a
 * restatement of a score, its published range, or the person's own answer.
 */
export function buildSummary(input: {
  measures: readonly ScoredInstrument[];
  functioning: FunctioningAnswers;
  completedAt: Date;
}): ScreeningSummary {
  const scores = input.measures.map((m) => ({
    key: m.key,
    shortName: m.shortName,
    total: m.total,
    max: INSTRUMENT_MEASURES[m.key].max,
    band: m.band,
  }));
  const scoreLines: string[] = [];
  let elevated = false;
  for (const m of input.measures) {
    const info = INSTRUMENT_MEASURES[m.key];
    scoreLines.push(
      `${m.shortName} total score: ${m.total} of ${info.max}. The ${m.shortName} screens for ${info.measures}. On its published scoring, this total falls in the "${m.band.toLowerCase()}" range.`,
    );
    if (m.total >= info.furtherEvaluationAt) {
      elevated = true;
      scoreLines.push(SUMMARY_TEXT.atOrAboveCutoff(m.shortName, info.furtherEvaluationAt));
    } else scoreLines.push(SUMMARY_TEXT.belowCutoff(m.shortName, info.furtherEvaluationAt));
  }
  scoreLines.push(SUMMARY_TEXT.scoreNotDiagnosis);

  const f = input.functioning;
  const work: string[] = [SUMMARY_TEXT.selfReported];
  const concerns = (Array.isArray(f.main_concerns) ? f.main_concerns : [])
    .map((v) => phrase("main_concerns", v))
    .filter((x): x is string => !!x);
  if (concerns.length) work.push(`Concerns reported: ${list(concerns)}.`);
  const duration = phrase("symptom_duration", f.symptom_duration);
  if (duration) work.push(`Reported duration: ${duration}.`);
  const difficulty = phrase("difficulty", f.difficulty);
  if (difficulty)
    work.push(`These problems were described as ${difficulty} for work, home or relationships.`);
  const status = phrase("work_status", f.work_status);
  if (status) work.push(`Current work situation reported: ${status}.`);
  const effect = phrase("work_effect", f.work_effect);
  if (effect)
    work.push(`Job performance on days worked in the past two weeks, as reported: ${effect}.`);
  const areas = (Array.isArray(f.work_areas) ? f.work_areas : [])
    .map((v) => phrase("work_areas", v))
    .filter((x): x is string => !!x);
  if (areas.length) work.push(`Parts of work reported as harder: ${list(areas)}.`);
  if (typeof f.missed_days === "number")
    work.push(`Full workdays missed in the past 30 days, as reported: ${days(f.missed_days)}.`);
  if (typeof f.partial_days === "number")
    work.push(
      `Days with late arrival, early departure or fewer hours in the past 30 days, as reported: ${days(f.partial_days)}.`,
    );
  if (
    f.difficulty === "very" ||
    f.difficulty === "extremely" ||
    f.work_effect === "much_less" ||
    f.work_effect === "unable"
  )
    elevated = true;

  return {
    version: 1,
    completedAt: input.completedAt.toISOString(),
    scores,
    sections: [
      { heading: "About this record", lines: [SUMMARY_TEXT.intro, RECORD_STATEMENT] },
      { heading: "Questionnaire results", lines: scoreLines },
      { heading: "Symptoms, work and attendance", lines: work },
      {
        heading: "Suggested next steps",
        lines: [
          elevated ? SUMMARY_TEXT.nextStepsElevated : SUMMARY_TEXT.nextStepsRoutine,
          SUMMARY_TEXT.crisis,
        ],
      },
    ],
  };
}

/** Stable serialization so the stored hash binds to the exact summary issued. */
export function canonicalSummary(s: ScreeningSummary): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, norm((v as Record<string, unknown>)[k])]),
      );
    return v;
  };
  return JSON.stringify(norm(s));
}

export interface LetterRequestInput {
  /** Whether the absence is from work or from school. Requests made before 2026-10-10 have none and mean work. */
  setting: ExcuseSetting;
  /** First day the person asks to be excused (YYYY-MM-DD). */
  startDate: string;
  /** Last day (YYYY-MM-DD). */
  endDate: string;
  /** Requested return date, optional (YYYY-MM-DD). */
  returnDate: string | null;
  /** Optional note to the clinician; never placed in the letter. */
  note: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const utcDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Validates a letter request against the screening date (dates cannot reach far before or after it). */
export function validateLetterRequest(
  raw: Record<string, string | undefined>,
  screeningCompletedAt: Date,
): { input: LetterRequestInput | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const start = raw.startDate?.trim() ?? "";
  const end = raw.endDate?.trim() ?? "";
  const ret = raw.returnDate?.trim() ?? "";
  const note = (raw.note ?? "").trim();
  const setting = raw.setting?.trim();
  if (!isExcuseSetting(setting)) errors.setting = "Choose work or school.";
  const screened = Date.UTC(
    screeningCompletedAt.getUTCFullYear(),
    screeningCompletedAt.getUTCMonth(),
    screeningCompletedAt.getUTCDate(),
  );
  if (!ISO_DAY.test(start) || Number.isNaN(utcDay(start)))
    errors.startDate = "Enter the first day.";
  if (!ISO_DAY.test(end) || Number.isNaN(utcDay(end))) errors.endDate = "Enter the last day.";
  if (ret && (!ISO_DAY.test(ret) || Number.isNaN(utcDay(ret))))
    errors.returnDate = "Enter a valid date or leave it blank.";
  if (!errors.startDate && utcDay(start) < screened - 14 * DAY_MS)
    errors.startDate = "The first day can be at most 14 days before your screening.";
  if (!errors.startDate && utcDay(start) > screened + 14 * DAY_MS)
    errors.startDate = "The first day can be at most 14 days after your screening.";
  if (!errors.startDate && !errors.endDate && utcDay(end) < utcDay(start))
    errors.endDate = "The last day must be on or after the first day.";
  if (!errors.startDate && !errors.endDate && utcDay(end) - utcDay(start) > 30 * DAY_MS)
    errors.endDate =
      "A letter request can cover at most 31 days. A longer absence needs a full clinical assessment.";
  if (!errors.endDate && ret && !errors.returnDate && utcDay(ret) <= utcDay(end))
    errors.returnDate = "The return date must be after the last day.";
  if (note.length > 1000) errors.note = "Keep the note under 1,000 characters.";
  if (Object.keys(errors).length) return { input: null, errors };
  return {
    input: {
      setting: setting as ExcuseSetting,
      startDate: start,
      endDate: end,
      returnDate: ret || null,
      note,
    },
    errors,
  };
}

/** "2026-10-09" → "October 9, 2026". */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export interface LetterFields {
  patient_name: string;
  /** "work" or "school". */
  excused_setting: string;
  excused_from: string;
  excused_through: string;
  return_date: string;
  letter_body: string;
}

/** The proposed letter: the patient's requested dates, for the clinician to change, approve or decline. */
export function proposedLetter(p: {
  patientName: string;
  request: LetterRequestInput;
}): LetterFields {
  const setting: ExcuseSetting = p.request.setting === "school" ? "school" : "work";
  return {
    patient_name: p.patientName,
    excused_setting: setting,
    excused_from: p.request.startDate,
    excused_through: p.request.endDate,
    return_date: p.request.returnDate ?? "",
    letter_body: "",
  };
}

/** "October 9, 2026" for one day, "October 9, 2026 – October 11, 2026" for a range. */
export function excusedRange(from: string, through: string): string {
  return from === through ? longDate(from) : `${longDate(from)} – ${longDate(through)}`;
}

export interface LetterWording {
  heading: string;
  documentType: string;
  salutation: string;
  before: string[];
  absence: [string, string][];
  after: string[];
}

/** The letter body exactly as printed, from the clinician-approved fields. */
export function letterWording(fields: LetterFields, screeningDate: Date): LetterWording {
  const setting: ExcuseSetting = fields.excused_setting === "school" ? "school" : "work";
  const t = LETTER_TEXT[setting];
  const screened = screeningDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  });
  const absence: [string, string][] = [
    [
      "Excused Absence",
      fields.excused_from === fields.excused_through
        ? longDate(fields.excused_from)
        : `${longDate(fields.excused_from)} through ${longDate(fields.excused_through)}`,
    ],
  ];
  if (fields.return_date) absence.push([t.returnLabel, longDate(fields.return_date)]);
  const note = fields.letter_body.trim();
  return {
    heading: t.heading,
    documentType: t.documentType,
    salutation: "To Whom It May Concern:",
    before: [letterOpening(fields.patient_name, screened), t.recommendation],
    absence,
    after: [t.basis, ...(note ? note.split(/\n{2,}/) : []), t.confidentiality],
  };
}

/** Crockford base32 without I, L, O, U. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Document number printed on every issued PDF and in its QR code: "LB-" + 20 base32 characters
 * (100 random bits) in groups of four. Not derived from any patient, case or date.
 */
export function formatDocumentNumber(random: Uint8Array): string {
  if (random.length < 13) throw new Error("need 13 random bytes");
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of random) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5 && out.length < 20) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return `LB-${out.match(/.{4}/g)!.join("-")}`;
}

export const DOCUMENT_NUMBER_RE = /^LB-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/;

/** Accepts what people type: any case, spaces or missing dashes. Returns the canonical form or null. */
export function normalizeDocumentNumber(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, "");
  const body = s.startsWith("LB") ? s.slice(2) : s;
  if (!/^[0-9A-HJKMNP-TV-Z]{20}$/.test(body)) return null;
  return `LB-${body.match(/.{4}/g)!.join("-")}`;
}

/** "Jordan Q. Examplecase" -> "J. E.": first and last initials only, for the public verification page. */
export function nameInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w));
  if (!parts.length) return "";
  const pick = parts.length === 1 ? [parts[0]!] : [parts[0]!, parts[parts.length - 1]!];
  return pick.map((w) => `${w.match(/\p{L}/u)![0]!.toUpperCase()}.`).join(" ");
}
