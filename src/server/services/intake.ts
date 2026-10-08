import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { cases, intakes, measureResponses, questionnaires, safetyEvents } from "../db/schema";
import { audit } from "../audit";
import { decryptJson, encryptJson } from "../crypto";
import { loadCase, requireGate, syncPreSubmissionStatus, touch } from "./cases";
import { intakeDefinitionSchema, type IntakeDefinition, type IntakeSection } from "@/config/intake";
import { instrumentSchema, scoreInstrument, type Instrument } from "@/domain/instruments";
import { invalid, notFound } from "@/domain/errors";

export type IntakeAnswers = Record<string, string | string[]>;

export async function publishedIntakeTemplate(ctx: Ctx) {
  const [q] = await ctx.tx
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.kind, "intake"), eq(questionnaires.status, "published")))
    .orderBy(desc(questionnaires.version))
    .limit(1);
  if (!q) throw new Error("No published intake template");
  return { id: q.id, version: q.version, def: intakeDefinitionSchema.parse(q.definition) };
}

async function intakeRow(ctx: Ctx, caseId: string) {
  const [row] = await ctx.tx.select().from(intakes).where(eq(intakes.caseId, caseId)).limit(1);
  return row ?? null;
}

export async function getIntake(ctx: Ctx, caseId: string, level: "owner" | "clinical") {
  const { row } = await loadCase(ctx, caseId, level);
  const existing = await intakeRow(ctx, row.id);
  const template = existing
    ? await ctx.tx.select().from(questionnaires).where(eq(questionnaires.id, existing.questionnaireId)).limit(1).then(([q]) => ({ id: q!.id, version: q!.version, def: intakeDefinitionSchema.parse(q!.definition) }))
    : await publishedIntakeTemplate(ctx);
  if (level === "clinical") await audit(ctx, { action: "intake.viewed", subjectType: "intake", subjectId: existing?.id, caseId: row.id });
  return {
    caseRow: row,
    template,
    status: existing?.status ?? "in_progress",
    completed: existing?.completedSections ?? [],
    answers: decryptJson<IntakeAnswers>(existing?.answers, {}),
    submittedAt: existing?.submittedAt ?? null,
  };
}

function validateSection(section: IntakeSection, raw: Record<string, string | string[]>, prior: IntakeAnswers) {
  const answers: IntakeAnswers = { ...prior };
  const errors: Record<string, string> = {};
  for (const q of section.questions) {
    if (q.showIf && answers[q.showIf.q] !== q.showIf.eq && raw[q.showIf.q] !== q.showIf.eq) {
      delete answers[q.key];
      continue;
    }
    const v = raw[q.key];
    if (q.kind === "multi") {
      const allowed = new Set((q.options ?? []).map((o) => o.value));
      const arr = (Array.isArray(v) ? v : v ? [v] : []).filter((x) => allowed.has(x));
      if (q.required && !arr.length) errors[q.key] = "Choose at least one option.";
      answers[q.key] = arr;
      continue;
    }
    const s = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
    if (!s) {
      if (q.required) errors[q.key] = "This question needs an answer.";
      delete answers[q.key];
      continue;
    }
    if (q.options && !q.options.some((o) => o.value === s)) errors[q.key] = "Choose one of the options.";
    if (q.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(s)) errors[q.key] = "Enter a valid date.";
    if (s.length > (q.maxLength ?? 4000)) errors[q.key] = "That answer is too long.";
    answers[q.key] = s;
  }
  return { answers, errors };
}

function safetyTriggered(def: IntakeDefinition, answers: IntakeAnswers): string | null {
  for (const s of def.sections) for (const q of s.questions) if (q.safetyValue && answers[q.key] === q.safetyValue) return q.key;
  return null;
}

/**
 * Saves one intake section (autosave). A safety response does NOT silently continue: it creates a
 * safety event, flags the case urgent for clinical follow-up, and the UI shows crisis resources.
 */
export async function saveIntakeSection(ctx: Ctx, caseId: string, sectionKey: string, raw: Record<string, string | string[]>) {
  const { row } = await loadCase(ctx, caseId, "owner");
  await requireGate(ctx, row, "intake");
  const existing = await intakeRow(ctx, row.id);
  if (existing?.status === "submitted") throw invalid("Your intake was already submitted. Use secure messages to add information.");
  const template = existing
    ? { id: existing.questionnaireId, def: intakeDefinitionSchema.parse((await ctx.tx.select().from(questionnaires).where(eq(questionnaires.id, existing.questionnaireId)).limit(1))[0]!.definition) }
    : await publishedIntakeTemplate(ctx);
  const section = template.def.sections.find((s) => s.key === sectionKey);
  if (!section) throw notFound("Section");
  const prior = decryptJson<IntakeAnswers>(existing?.answers, {});
  const { answers, errors } = validateSection(section, raw, prior);
  const completed = new Set(existing?.completedSections ?? []);
  if (Object.keys(errors).length) completed.delete(sectionKey);
  else completed.add(sectionKey);
  if (existing) {
    await ctx.tx.update(intakes).set({ answers: encryptJson(answers), completedSections: [...completed], updatedAt: new Date() }).where(eq(intakes.id, existing.id));
  } else {
    await ctx.tx.insert(intakes).values({ caseId: row.id, questionnaireId: template.id, answers: encryptJson(answers), completedSections: [...completed] });
  }
  await audit(ctx, { action: "intake.saved", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { section: sectionKey } });
  const safetyKey = safetyTriggered(template.def, answers);
  let safety = false;
  if (safetyKey && section.questions.some((q) => q.key === safetyKey)) {
    safety = true;
    await raiseSafety(ctx, row.id, "intake", `intake:${safetyKey}`);
  }
  await touch(ctx, row.id);
  return { errors, safety };
}

export async function raiseSafety(ctx: Ctx, caseId: string, source: "intake" | "measure" | "message", rule: string) {
  const [open] = await ctx.tx
    .select({ id: safetyEvents.id })
    .from(safetyEvents)
    .where(and(eq(safetyEvents.caseId, caseId), eq(safetyEvents.rule, rule), sql`${safetyEvents.acknowledgedAt} is null`))
    .limit(1);
  if (open) return;
  const [evt] = await ctx.tx.insert(safetyEvents).values({ caseId, source, rule }).returning({ id: safetyEvents.id });
  await ctx.tx.update(cases).set({ priority: "urgent" }).where(eq(cases.id, caseId));
  await audit(ctx, { action: "safety.event_created", subjectType: "safety_event", subjectId: evt!.id, caseId, metadata: { source } });
}

export async function submitIntake(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  await requireGate(ctx, row, "intake");
  const existing = await intakeRow(ctx, row.id);
  if (!existing) throw invalid("Please complete your intake first.");
  const template = intakeDefinitionSchema.parse((await ctx.tx.select().from(questionnaires).where(eq(questionnaires.id, existing.questionnaireId)).limit(1))[0]!.definition);
  const missing = template.sections.filter((s) => !existing.completedSections.includes(s.key));
  if (missing.length) throw invalid(`Please complete: ${missing.map((m) => m.title).join(", ")}.`);
  await ctx.tx.update(intakes).set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() }).where(eq(intakes.id, existing.id));
  await audit(ctx, { action: "intake.submitted", subjectType: "intake", subjectId: existing.id, caseId: row.id });
  await syncPreSubmissionStatus(ctx, row);
}

// ---- Validated measures -------------------------------------------------------------

export async function enabledInstruments(ctx: Ctx): Promise<{ id: string; inst: Instrument }[]> {
  const rows = await ctx.tx
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.kind, "measure"), eq(questionnaires.status, "published"), eq(questionnaires.enabled, true)))
    .orderBy(questionnaires.key, desc(questionnaires.version));
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true))).map((r) => ({ id: r.id, inst: instrumentSchema.parse(r.definition) }));
}

export async function measureStatus(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  const instruments = await enabledInstruments(ctx);
  const done = await ctx.tx.select({ key: measureResponses.instrumentKey, at: measureResponses.completedAt }).from(measureResponses).where(eq(measureResponses.caseId, row.id));
  return instruments.map(({ inst }) => ({ key: inst.key, name: inst.shortName, items: inst.items.length, completedAt: done.find((d) => d.key === inst.key)?.at ?? null }));
}

export async function submitMeasure(ctx: Ctx, caseId: string, instrumentKey: string, raw: Record<string, unknown>) {
  const { row } = await loadCase(ctx, caseId, "owner");
  await requireGate(ctx, row, "measures");
  const instruments = await enabledInstruments(ctx);
  const found = instruments.find((i) => i.inst.key === instrumentKey);
  if (!found) throw notFound("Questionnaire");
  const scored = scoreInstrument(found.inst, raw);
  if (!scored.ok) return { missing: scored.missing, safety: false };
  const [existing] = await ctx.tx.select({ id: measureResponses.id }).from(measureResponses).where(and(eq(measureResponses.caseId, row.id), eq(measureResponses.instrumentKey, instrumentKey))).limit(1);
  if (existing) throw invalid("This questionnaire was already completed.");
  await ctx.tx.insert(measureResponses).values({
    caseId: row.id,
    questionnaireId: found.id,
    instrumentKey,
    answers: encryptJson(scored.result.answers),
    totalScore: scored.result.total,
    severityBand: scored.result.band,
    safetyFlag: scored.result.safetyFlag,
  });
  await audit(ctx, { action: "measure.completed", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { instrument: instrumentKey } });
  if (scored.result.safetyFlag) await raiseSafety(ctx, row.id, "measure", `measure:${instrumentKey}`);
  await syncPreSubmissionStatus(ctx, row);
  return { missing: [], safety: scored.result.safetyFlag };
}

export async function getInstrument(ctx: Ctx, key: string) {
  const list = await enabledInstruments(ctx);
  return list.find((i) => i.inst.key === key)?.inst ?? null;
}
