import { z } from "zod";
import type { ScreeningOutcome } from "../constants";

/**
 * Declarative screening engine. Rules are data (versioned in `screening_rulesets`), evaluated
 * with a small typed operator set. The engine never makes clinical or FMLA-eligibility
 * determinations; it only decides whether ordinary scheduling may continue.
 * Severity: EMERGENCY > NOT_AVAILABLE > NEEDS_REVIEW > AVAILABLE.
 */

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { q: string; op: "eq" | "neq"; value: string | boolean }
  | { q: string; op: "in" | "includes_any"; value: string[] }
  | { q: string; op: "answered" | "unanswered" }
  | { q: string; op: "state_inactive" }
  | { q: string; op: "date_within_days"; value: number }
  | { op: "answers_differ"; a: string; b: string };

const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
    z.object({ q: z.string(), op: z.enum(["eq", "neq"]), value: z.union([z.string(), z.boolean()]) }),
    z.object({ q: z.string(), op: z.enum(["in", "includes_any"]), value: z.array(z.string()) }),
    z.object({ q: z.string(), op: z.enum(["answered", "unanswered", "state_inactive"]) }),
    z.object({ q: z.string(), op: z.literal("date_within_days"), value: z.number() }),
    z.object({ op: z.literal("answers_differ"), a: z.string(), b: z.string() }),
  ]),
);

export const questionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  step: z.string(),
  kind: z.enum(["single", "multi", "state", "date", "text"]),
  label: z.string(),
  help: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  required: z.boolean().default(true),
  showIf: conditionSchema.optional(),
  maxLength: z.number().optional(),
});
export type Question = z.infer<typeof questionSchema>;

export const ruleSchema = z.object({
  id: z.string(),
  when: conditionSchema,
  outcome: z.enum(["EMERGENCY", "NOT_AVAILABLE", "NEEDS_REVIEW"]),
  reasonCode: z.string(),
});
export type Rule = z.infer<typeof ruleSchema>;

export const rulesetSchema = z.object({
  steps: z.array(z.object({ key: z.string(), title: z.string(), description: z.string().optional() })).min(1),
  questions: z.array(questionSchema).min(1),
  rules: z.array(ruleSchema),
});
export type RulesetDefinition = z.infer<typeof rulesetSchema>;

export type Answers = Record<string, string | string[] | undefined>;

export interface EvalEnv {
  activeStates: ReadonlySet<string>;
  today: Date;
}

const SEVERITY: Record<ScreeningOutcome, number> = { AVAILABLE: 0, NEEDS_REVIEW: 1, NOT_AVAILABLE: 2, EMERGENCY: 3 };

export function evaluateCondition(c: Condition, answers: Answers, env: EvalEnv): boolean {
  if ("all" in c) return c.all.every((x) => evaluateCondition(x, answers, env));
  if ("any" in c) return c.any.some((x) => evaluateCondition(x, answers, env));
  if ("not" in c) return !evaluateCondition(c.not, answers, env);
  if (c.op === "answers_differ") {
    const a = answers[c.a];
    const b = answers[c.b];
    return a !== undefined && b !== undefined && String(a) !== String(b);
  }
  const v = answers[c.q];
  switch (c.op) {
    case "eq":
      return String(v) === String(c.value);
    case "neq":
      return v !== undefined && String(v) !== String(c.value);
    case "in":
      return typeof v === "string" && c.value.includes(v);
    case "includes_any":
      return Array.isArray(v) && v.some((x) => c.value.includes(x));
    case "answered":
      return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
    case "unanswered":
      return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    case "state_inactive":
      return typeof v === "string" && v !== "" && !env.activeStates.has(v);
    case "date_within_days": {
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const d = new Date(`${v}T00:00:00Z`).getTime();
      const t = Date.UTC(env.today.getUTCFullYear(), env.today.getUTCMonth(), env.today.getUTCDate());
      return (d - t) / 86_400_000 <= c.value;
    }
  }
}

export interface ScreeningResult {
  outcome: ScreeningOutcome;
  reasonCodes: string[];
}

/** Evaluate all rules whose referenced questions have been reached. Highest severity wins. */
export function evaluate(def: RulesetDefinition, answers: Answers, env: EvalEnv): ScreeningResult {
  let outcome: ScreeningOutcome = "AVAILABLE";
  const reasonCodes: string[] = [];
  for (const rule of def.rules) {
    if (!evaluateCondition(rule.when, answers, env)) continue;
    reasonCodes.push(rule.reasonCode);
    if (SEVERITY[rule.outcome] > SEVERITY[outcome]) outcome = rule.outcome;
  }
  return { outcome, reasonCodes };
}

/** Emergency rules are checked after every step so a safety concern interrupts immediately. */
export function emergencyTriggered(def: RulesetDefinition, answers: Answers, env: EvalEnv): Rule | null {
  return def.rules.find((r) => r.outcome === "EMERGENCY" && evaluateCondition(r.when, answers, env)) ?? null;
}

export function visibleQuestions(def: RulesetDefinition, stepKey: string, answers: Answers, env: EvalEnv): Question[] {
  return def.questions.filter((q) => q.step === stepKey && (!q.showIf || evaluateCondition(q.showIf, answers, env)));
}

/** Validates and normalizes submitted answers for one step. Returns field errors keyed by question. */
export function validateStep(
  def: RulesetDefinition,
  stepKey: string,
  raw: Record<string, string | string[]>,
  prior: Answers,
  env: EvalEnv,
): { answers: Answers; errors: Record<string, string> } {
  const merged: Answers = { ...prior };
  const errors: Record<string, string> = {};
  // Evaluate visibility progressively so showIf can depend on answers in the same step.
  for (const q of def.questions.filter((x) => x.step === stepKey)) {
    if (q.showIf && !evaluateCondition(q.showIf, merged, env)) {
      delete merged[q.key];
      continue;
    }
    const value = raw[q.key];
    const allowed = new Set((q.options ?? []).map((o) => o.value));
    if (q.kind === "multi") {
      const arr = (Array.isArray(value) ? value : value ? [value] : []).filter((x) => allowed.has(x));
      if (q.required && arr.length === 0) errors[q.key] = "Choose at least one option.";
      merged[q.key] = arr;
    } else {
      const s = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
      if (!s) {
        if (q.required) errors[q.key] = "This question needs an answer.";
        delete merged[q.key];
        continue;
      }
      if ((q.kind === "single" || q.kind === "state") && q.options && !allowed.has(s)) errors[q.key] = "Choose one of the options.";
      if (q.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(s)) errors[q.key] = "Enter a valid date.";
      if (q.kind === "text" && s.length > (q.maxLength ?? 500)) errors[q.key] = "That answer is too long.";
      merged[q.key] = s;
    }
  }
  return { answers: merged, errors };
}

export const OUTCOME_COPY: Record<ScreeningOutcome, { title: string; body: string }> = {
  AVAILABLE: {
    title: "This service may be a fit for you",
    body: "Based on the information provided, this service may be appropriate for you. A licensed clinician makes every clinical decision after reviewing your full intake.",
  },
  NEEDS_REVIEW: {
    title: "We need a little more information",
    body: "We need additional information before determining whether you can continue. You can create an account so a member of our clinical team can review your answers.",
  },
  NOT_AVAILABLE: {
    title: "This service isn't available for your situation right now",
    body: "Based on your answers, this service is not currently available for your situation. This is not a judgment about your health or your need for support.",
  },
  EMERGENCY: {
    title: "Please get help now",
    body: "LeaveBridge Health is not an emergency service. Based on your answers, please contact crisis or emergency services right away.",
  },
};
