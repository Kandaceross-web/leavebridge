import { describe, expect, it } from "vitest";
import {
  DOCUMENT_NUMBER_RE,
  buildSummary,
  canonicalSummary,
  formatDocumentNumber,
  holdReasons,
  nameInitials,
  normalizeDocumentNumber,
  proposedLetter,
  validateFunctioning,
  validateLetterRequest,
  type FunctioningAnswers,
  type ScoredInstrument,
} from "@/domain/same-day/rules";
import { DEFAULT_INSTRUMENTS, scoreInstrument } from "@/domain/instruments";
import { RECORD_STATEMENT } from "@/config/same-day";
import { canTransition, patientStatusFor } from "@/domain/cases/state-machine";

const FUNCTIONING_FORM = {
  main_concerns: ["low_mood", "sleep"],
  symptom_duration: "1_3m",
  difficulty: "very",
  work_status: "reduced",
  work_effect: "much_less",
  work_areas: ["focus", "attendance"],
  missed_days: "3",
  partial_days: "1",
  safety_now: "no",
};

function scored(key: "phq9" | "gad7", value: number, overrides: Record<string, number> = {}): ScoredInstrument {
  const inst = DEFAULT_INSTRUMENTS.find((i) => i.key === key)!;
  const raw = Object.fromEntries(inst.items.map((it) => [it.key, overrides[it.key] ?? value]));
  const out = scoreInstrument(inst, raw);
  if (!out.ok) throw new Error("scoring failed");
  return { key, shortName: inst.shortName, total: out.result.total, band: out.result.band, answers: out.result.answers };
}

const functioning = (over: Record<string, string | string[]> = {}) => {
  const { answers, errors } = validateFunctioning({ ...FUNCTIONING_FORM, ...over });
  expect(errors).toEqual({});
  return answers;
};

describe("same-day functioning questions", () => {
  it("requires every answer, rejects out-of-range numbers and 'none' combined with others", () => {
    const { errors } = validateFunctioning({ ...FUNCTIONING_FORM, missed_days: "40", work_areas: ["none", "focus"], difficulty: "" });
    expect(Object.keys(errors).sort()).toEqual(["difficulty", "missed_days", "work_areas"]);
    expect(validateFunctioning({}).errors.safety_now).toBeDefined();
  });

  it("stores numbers as numbers and drops unknown options", () => {
    const a = functioning({ main_concerns: ["low_mood", "made_up"] });
    expect(a.missed_days).toBe(3);
    expect(a.main_concerns).toEqual(["low_mood"]);
  });
});

describe("safety holds (PHQ-9 item 9 and the immediate-safety question)", () => {
  it("issues automatically when item 9 is 0 and safety is 'no'", () => {
    expect(holdReasons({ measures: [scored("phq9", 1, { phq9_9: 0 }), scored("gad7", 2)], functioning: functioning() })).toEqual([]);
  });

  it("holds for any item-9 answer above 'Not at all'", () => {
    for (const v of [1, 2, 3]) expect(holdReasons({ measures: [scored("phq9", 0, { phq9_9: v })], functioning: functioning() })).toEqual(["PHQ9_ITEM9"]);
  });

  it("holds for 'yes' or 'not sure' on the immediate-safety question, even with GAD-7 only", () => {
    expect(holdReasons({ measures: [scored("gad7", 0)], functioning: functioning({ safety_now: "yes" }) })).toEqual(["SAFETY_NOW"]);
    expect(holdReasons({ measures: [scored("gad7", 0)], functioning: functioning({ safety_now: "unsure" }) })).toEqual(["SAFETY_NOW"]);
    expect(holdReasons({ measures: [scored("phq9", 0, { phq9_9: 2 })], functioning: functioning({ safety_now: "yes" }) })).toEqual(["PHQ9_ITEM9", "SAFETY_NOW"]);
  });
});

describe("automated summary", () => {
  const completedAt = new Date("2026-10-09T15:00:00Z");

  it("restates scores against the published ranges and never states a diagnosis, eligibility or restriction", () => {
    const s = buildSummary({ measures: [scored("phq9", 2, { phq9_9: 0 }), scored("gad7", 1)], functioning: functioning(), completedAt });
    const text = s.sections.flatMap((x) => x.lines).join("\n");
    expect(s.scores.map((x) => [x.key, x.total, x.max])).toEqual([
      ["phq9", 16, 27],
      ["gad7", 7, 21],
    ]);
    expect(text).toContain("PHQ-9 total score: 16 of 27");
    expect(text).toContain("totals of 10 or more are the published point");
    expect(text).toContain("This total is below 10");
    expect(text).toContain(RECORD_STATEMENT);
    expect(text).toContain("A screening score is not a diagnosis.");
    expect(text).toContain("Full workdays missed in the past 30 days, as reported: 3 days.");
    expect(text).toContain("988");
    expect(text).not.toMatch(/diagnosed with|you have (depression|anxiety)|major depressive|generalized anxiety disorder|eligib|qualif|restrict|should be excused|needs? (medical )?leave|fit for duty/i);
  });

  it("is deterministic and its canonical form ignores key order", () => {
    const input = { measures: [scored("gad7", 3)], functioning: functioning(), completedAt };
    const a = buildSummary(input);
    const b = buildSummary(input);
    expect(canonicalSummary(a)).toBe(canonicalSummary(b));
    const reordered = JSON.parse(JSON.stringify({ sections: a.sections, scores: a.scores, completedAt: a.completedAt, version: a.version }));
    expect(canonicalSummary(reordered)).toBe(canonicalSummary(a));
    const changed = { ...a, scores: [{ ...a.scores[0]!, total: a.scores[0]!.total - 1 }] };
    expect(canonicalSummary(changed)).not.toBe(canonicalSummary(a));
  });

  it("suggests timely follow-up when scores or reported functioning are elevated", () => {
    const low = buildSummary({ measures: [scored("gad7", 0)], functioning: functioning({ difficulty: "not", work_effect: "same" }), completedAt });
    const high = buildSummary({ measures: [scored("gad7", 0)], functioning: functioning({ difficulty: "extremely" }), completedAt });
    expect(low.sections.at(-1)!.lines[0]).toMatch(/If these concerns continue/);
    expect(high.sections.at(-1)!.lines[0]).toMatch(/talk with a licensed mental-health professional .* soon/);
  });
});

describe("work excuse letter requests", () => {
  const screened = new Date("2026-10-09T15:00:00Z");

  it("accepts a period near the screening of at most 31 days", () => {
    const { input, errors } = validateLetterRequest({ startDate: "2026-10-08", endDate: "2026-10-12", returnDate: "2026-10-13", note: "" }, screened);
    expect(errors).toEqual({});
    expect(input).toEqual({ startDate: "2026-10-08", endDate: "2026-10-12", returnDate: "2026-10-13", note: "" });
  });

  it("rejects dates far from the screening, reversed or too long periods, and early returns", () => {
    expect(validateLetterRequest({ startDate: "2026-09-01", endDate: "2026-09-02" }, screened).errors.startDate).toBeDefined();
    expect(validateLetterRequest({ startDate: "2026-11-01", endDate: "2026-11-02" }, screened).errors.startDate).toBeDefined();
    expect(validateLetterRequest({ startDate: "2026-10-09", endDate: "2026-10-08" }, screened).errors.endDate).toBeDefined();
    expect(validateLetterRequest({ startDate: "2026-10-09", endDate: "2026-11-09" }, screened).errors.endDate).toMatch(/31 days/);
    expect(validateLetterRequest({ startDate: "2026-10-09", endDate: "2026-10-10", returnDate: "2026-10-10" }, screened).errors.returnDate).toBeDefined();
    expect(validateLetterRequest({ startDate: "not-a-date", endDate: "" }, screened).input).toBeNull();
  });

  it("proposes a letter without any diagnosis or score", () => {
    const letter = proposedLetter({ patientName: "Avery Testcase", screeningDate: screened, practice: "Example Practice", request: { startDate: "2026-10-08", endDate: "2026-10-12", returnDate: null, note: "" } });
    expect(letter.excused_from).toBe("2026-10-08");
    expect(letter.letter_body).toContain("October 8, 2026 through October 12, 2026");
    expect(letter.letter_body).not.toMatch(/PHQ|GAD|score|depress|anxi|diagnos(?!is or treatment)/i);
  });
});

describe("document numbers", () => {
  it("are 100 random bits in Crockford base32 and normalize from typed input", () => {
    const bytes = new Uint8Array(13).map((_, i) => (i * 37 + 11) & 255);
    const n = formatDocumentNumber(bytes);
    expect(n).toMatch(DOCUMENT_NUMBER_RE);
    expect(normalizeDocumentNumber(n.toLowerCase().replace(/-/g, " "))).toBe(n);
    expect(normalizeDocumentNumber(n.replace("LB-", ""))).toBe(n);
    expect(normalizeDocumentNumber("LB-OOOO-IIII-LLLL-UUUU-0000")).toBeNull();
    expect(normalizeDocumentNumber("../../etc")).toBeNull();
    const seen = new Set(Array.from({ length: 200 }, () => formatDocumentNumber(crypto.getRandomValues(new Uint8Array(13)))));
    expect(seen.size).toBe(200);
  });
});

describe("automated screening case states", () => {
  it("allows only the automated path and labels it for the patient", () => {
    expect(canTransition("started", "intake_incomplete", "automated_screening")).toBe(true);
    expect(canTransition("intake_incomplete", "completed", "automated_screening")).toBe(true);
    expect(canTransition("intake_incomplete", "safety_hold", "automated_screening")).toBe(true);
    expect(canTransition("safety_hold", "completed", "automated_screening")).toBe(true);
    expect(canTransition("intake_incomplete", "submitted", "automated_screening")).toBe(false);
    expect(canTransition("completed", "delivered", "automated_screening")).toBe(false);
    expect(canTransition("intake_incomplete", "provider_signature", "automated_screening")).toBe(false);
    expect(patientStatusFor("automated_screening", "completed").label).toBe("Screening record ready");
    expect(patientStatusFor("clinical", "completed").label).not.toBe("Screening record ready");
  });
});

// Answers typed as the summary builder expects (guards against drift in the exported type).
const _typecheck: FunctioningAnswers = { missed_days: 0 };
void _typecheck;

describe("initials for the public verification page", () => {
  it("keeps first and last initials only", () => {
    expect(nameInitials("Jordan Q. Examplecase")).toBe("J. E.");
    expect(nameInitials("  avery  ")).toBe("A.");
    expect(nameInitials("Ana-María O'Neil")).toBe("A. O.");
    expect(nameInitials("")).toBe("");
  });
});
