import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { automatedScreenings, caseNotes, cases, documents, issuedDocuments, measureResponses, patients, payments, safetyEvents, services, workExcuseRequests } from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, encrypt, encryptJson, sha256Hex } from "../crypto";
import { loadCase, notifyPatient, transition, type CaseRow } from "./cases";
import { enabledInstruments, raiseSafety } from "./intake";
import { issueDocument, issuedFor, type IssuedDocumentRow } from "./issued-documents";
import { startCheckout } from "./payments";
import { sameDayCheckoutBlocker } from "./same-day-gate";
import { alertClinicalStaff } from "./staff-alerts";
import { HOLD_REASON_LABEL, PURCHASE_ACKNOWLEDGEMENT, RECORD_STATEMENT, RECORD_TITLE, SAME_DAY_INSTRUMENTS, SAME_DAY_SERVICE_NAME, type SameDayInstrument } from "@/config/same-day";
import { SAME_DAY_SERVICE_SLUG } from "@/config/catalog";
import { hasRole, requireRole, requireStaffMfa } from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { scoreInstrument } from "@/domain/instruments";
import {
  buildSummary,
  canonicalSummary,
  holdReasons,
  isSameDayInstrument,
  validateFunctioning,
  type FunctioningAnswers,
  type ScoredInstrument,
  type ScreeningSummary,
} from "@/domain/same-day/rules";

/**
 * Same-Day Mental Health Assessment: a paid, automated screening. The patient chooses PHQ-9, GAD-7 or
 * both, answers work-functioning questions, and the system scores everything, writes a rule-based
 * summary and issues a signed Automated Mental Health Screening Record. A safety response never
 * issues automatically: the case goes on safety hold, the clinical team is alerted and a clinician
 * decides whether to issue the record or close the screening.
 */
export type AutomatedScreeningRow = typeof automatedScreenings.$inferSelect;

const CLINICAL = ["clinician", "clinical_director"] as const;

export const ACKNOWLEDGEMENT_HASH = sha256Hex(PURCHASE_ACKNOWLEDGEMENT.join("\n"));

export async function sameDayServiceId(ctx: Ctx): Promise<string> {
  const [svc] = await ctx.tx.select({ id: services.id }).from(services).where(eq(services.slug, SAME_DAY_SERVICE_SLUG)).limit(1);
  if (!svc) throw invalid("The Same-Day Mental Health Assessment is not configured.");
  return svc.id;
}

/** Called when a same-day case is created from its screening (accounts.promoteScreeningToCase). */
export async function createAutomatedScreening(ctx: Ctx, caseId: string) {
  await ctx.tx.insert(automatedScreenings).values({ caseId });
}

async function screeningRow(ctx: Ctx, caseId: string): Promise<AutomatedScreeningRow> {
  const [s] = await ctx.tx.select().from(automatedScreenings).where(eq(automatedScreenings.caseId, caseId)).limit(1);
  if (!s) throw notFound("Screening");
  return s;
}

async function ownedAutomated(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "owner");
  if (row.kind !== "automated_screening") throw notFound("Screening");
  return { row, screening: await screeningRow(ctx, row.id) };
}

export interface MeasureProgress {
  key: SameDayInstrument;
  name: string;
  shortName: string;
  done: boolean;
}

/** Everything the patient's screening pages need, in one read. Summary only once issued. */
export async function sameDayOverview(ctx: Ctx, caseId: string) {
  const { row, screening } = await ownedAutomated(ctx, caseId);
  const pays = await ctx.tx.select().from(payments).where(eq(payments.caseId, row.id)).orderBy(desc(payments.createdAt));
  const paid = pays.find((p) => p.status === "paid" || p.status === "partially_refunded" || p.status === "refunded") ?? null;
  const instruments = await enabledInstruments(ctx);
  const done = await ctx.tx.select({ key: measureResponses.instrumentKey }).from(measureResponses).where(eq(measureResponses.caseId, row.id));
  const doneSet = new Set(done.map((d) => d.key));
  const measures: MeasureProgress[] = screening.instruments.filter(isSameDayInstrument).flatMap((key) => {
    const inst = instruments.find((i) => i.inst.key === key)?.inst;
    return inst ? [{ key, name: inst.name, shortName: inst.shortName, done: doneSet.has(key) }] : [];
  });
  const record = await issuedFor(ctx, "automated_screening_record", screening.id);
  const [letter] = await ctx.tx.select().from(workExcuseRequests).where(eq(workExcuseRequests.automatedScreeningId, screening.id)).limit(1);
  const [letterDoc] = letter?.documentId ? await ctx.tx.select().from(documents).where(eq(documents.id, letter.documentId)).limit(1) : [];
  const letterIssued = letter ? await issuedFor(ctx, "work_excuse_letter", letter.id) : null;
  const showSummary = screening.status === "issued" && !!record;
  return {
    row,
    screening,
    paid,
    // The acknowledgement is given on the payment page itself, so it never blocks reaching it.
    checkoutBlocker: row.status === "started" ? await sameDayCheckoutBlocker(ctx, row, { ignoreAcknowledgement: true }) : null,
    measures,
    functioningDone: Boolean(screening.functioning),
    summary: showSummary ? decryptJson<ScreeningSummary | null>(screening.summary, null) : null,
    record,
    letter: letter
      ? {
          id: letter.id,
          status: letter.status,
          createdAt: letter.createdAt,
          decidedAt: letter.decidedAt,
          declineMessage: letter.declineMessage ? decrypt(letter.declineMessage) : null,
          recommendAssessment: letter.recommendAssessment === "yes",
          signedFileId: letterDoc?.status === "delivered" ? letterDoc.signedFileId : null,
          issued: letterIssued,
        }
      : null,
  };
}

/** Records the pre-payment acknowledgement (its text hash and time) and opens checkout. */
export async function acknowledgeAndCheckout(ctx: Ctx, caseId: string, shownEstimateId: string): Promise<string> {
  if (ctx.actor.kind !== "patient") throw forbidden();
  const { row, screening } = await ownedAutomated(ctx, caseId);
  if (screening.status !== "awaiting_payment") throw conflict("This screening has already been paid for.");
  if (!screening.acknowledgedAt) {
    await ctx.tx.update(automatedScreenings).set({ acknowledgementHash: ACKNOWLEDGEMENT_HASH, acknowledgedAt: new Date(), updatedAt: new Date() }).where(eq(automatedScreenings.id, screening.id));
    await audit(ctx, { action: "same_day.acknowledged", subjectType: "automated_screening", subjectId: screening.id, caseId: row.id });
  }
  return startCheckout(ctx, row.id, shownEstimateId);
}

function requireOpen(row: CaseRow, s: AutomatedScreeningRow) {
  if (s.status === "awaiting_payment" || row.status === "started") throw invalid("Payment is needed before the questionnaires open.");
  if (s.status !== "in_progress") throw conflict("This screening is already finished.");
}

/** PHQ-9, GAD-7 or both. Can change until the first questionnaire is submitted. */
export async function chooseInstruments(ctx: Ctx, caseId: string, chosen: string[]) {
  const { row, screening } = await ownedAutomated(ctx, caseId);
  requireOpen(row, screening);
  const list = SAME_DAY_INSTRUMENTS.filter((k) => chosen.includes(k));
  if (!list.length) throw invalid("Choose the PHQ-9, the GAD-7, or both.");
  const [started] = await ctx.tx.select({ id: measureResponses.id }).from(measureResponses).where(eq(measureResponses.caseId, row.id)).limit(1);
  if (started) throw conflict("You have already started a questionnaire, so your choice can't change now.");
  await ctx.tx.update(automatedScreenings).set({ instruments: [...list], updatedAt: new Date() }).where(eq(automatedScreenings.id, screening.id));
  await audit(ctx, { action: "same_day.instruments_chosen", subjectType: "automated_screening", subjectId: screening.id, caseId: row.id, metadata: { instruments: list.join(",") } });
}

/** Scores and stores one questionnaire with the shared instrument scoring. Returns whether a safety item was triggered. */
export async function submitSameDayMeasure(ctx: Ctx, caseId: string, key: string, raw: Record<string, unknown>): Promise<{ missing: string[]; safety: boolean }> {
  const { row, screening } = await ownedAutomated(ctx, caseId);
  requireOpen(row, screening);
  if (!screening.instruments.includes(key)) throw notFound("Questionnaire");
  const found = (await enabledInstruments(ctx)).find((i) => i.inst.key === key);
  if (!found) throw notFound("Questionnaire");
  const scored = scoreInstrument(found.inst, raw);
  if (!scored.ok) return { missing: scored.missing, safety: false };
  const [existing] = await ctx.tx.select({ id: measureResponses.id }).from(measureResponses).where(and(eq(measureResponses.caseId, row.id), eq(measureResponses.instrumentKey, key))).limit(1);
  if (existing) throw conflict("This questionnaire was already completed.");
  await ctx.tx.insert(measureResponses).values({
    caseId: row.id,
    questionnaireId: found.id,
    instrumentKey: key,
    answers: encryptJson(scored.result.answers),
    totalScore: scored.result.total,
    severityBand: scored.result.band,
    safetyFlag: scored.result.safetyFlag,
  });
  await audit(ctx, { action: "measure.completed", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { instrument: key } });
  const holds = holdReasons({ measures: [{ key: key as SameDayInstrument, shortName: found.inst.shortName, total: scored.result.total, band: scored.result.band, answers: scored.result.answers }], functioning: null });
  if (holds.length) await raiseSameDaySafety(ctx, row.id, holds);
  return { missing: [], safety: scored.result.safetyFlag || holds.length > 0 };
}

/** Symptoms, work functioning, missed work and the immediate-safety question. */
export async function saveFunctioning(ctx: Ctx, caseId: string, raw: Record<string, string | string[] | undefined>): Promise<{ errors: Record<string, string>; safety: boolean }> {
  const { row, screening } = await ownedAutomated(ctx, caseId);
  requireOpen(row, screening);
  const { answers, errors } = validateFunctioning(raw);
  if (Object.keys(errors).length) return { errors, safety: false };
  await ctx.tx.update(automatedScreenings).set({ functioning: encryptJson(answers), updatedAt: new Date() }).where(eq(automatedScreenings.id, screening.id));
  await audit(ctx, { action: "same_day.functioning_saved", subjectType: "automated_screening", subjectId: screening.id, caseId: row.id });
  const holds = holdReasons({ measures: [], functioning: answers });
  if (holds.length) await raiseSameDaySafety(ctx, row.id, holds);
  return { errors: {}, safety: holds.length > 0 };
}

/**
 * Opens a safety event for each hold code that has no open event yet, and alerts the clinical team
 * once if any was new. Called as soon as a safety answer is saved (so a clinician hears about it even
 * if the patient stops there) and again on completion (a no-op for events already open).
 */
async function raiseSameDaySafety(ctx: Ctx, caseId: string, codes: readonly string[]) {
  let raised = false;
  for (const code of codes) {
    const rule = `same_day:${code}`;
    const [open] = await ctx.tx.select({ id: safetyEvents.id }).from(safetyEvents).where(and(eq(safetyEvents.caseId, caseId), eq(safetyEvents.rule, rule), isNull(safetyEvents.acknowledgedAt))).limit(1);
    if (open) continue;
    await raiseSafety(ctx, caseId, code === "PHQ9_ITEM9" ? "measure" : "intake", rule);
    raised = true;
  }
  if (raised) await alertClinicalStaff(ctx, "safety", caseId);
}

async function scoredMeasures(ctx: Ctx, caseId: string, chosen: readonly string[]): Promise<ScoredInstrument[]> {
  const rows = await ctx.tx.select().from(measureResponses).where(and(eq(measureResponses.caseId, caseId), inArray(measureResponses.instrumentKey, [...chosen])));
  const instruments = await enabledInstruments(ctx);
  return SAME_DAY_INSTRUMENTS.filter((k) => chosen.includes(k)).flatMap((key) => {
    const r = rows.find((x) => x.instrumentKey === key);
    const inst = instruments.find((i) => i.inst.key === key)?.inst;
    if (!r || !inst) return [];
    return [{ key, shortName: inst.shortName, total: r.totalScore, band: r.severityBand, answers: decryptJson<Record<string, number>>(r.answers, {}) }];
  });
}

/** The PDF content for a screening record, built from the stored summary. */
async function issueRecord(ctx: Ctx, row: CaseRow, s: AutomatedScreeningRow): Promise<IssuedDocumentRow> {
  const summary = decryptJson<ScreeningSummary | null>(s.summary, null);
  if (!summary || sha256Hex(canonicalSummary(summary)) !== s.summaryHash) throw conflict("The screening summary could not be verified.");
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, row.patientId)).limit(1);
  const completed = new Date(summary.completedAt);
  const dob = p?.dateOfBirth ? decrypt(p.dateOfBirth) : "";
  return issueDocument(ctx, {
    caseRow: row,
    kind: "automated_screening_record",
    sourceId: s.id,
    title: RECORD_TITLE,
    subtitle: `${SAME_DAY_SERVICE_NAME}. Automated screening record: not a clinician examination, diagnosis, FMLA certification or work excuse.`,
    facts: [
      { label: "Name", value: p ? `${p.legalFirstName} ${p.legalLastName}` : "" },
      ...(dob ? [{ label: "Date of birth", value: new Date(`${dob}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) }] : []),
      { label: "Questionnaires completed", value: `${summary.scores.map((x) => x.shortName).join(" and ")} on ${completed.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" })} Central` },
      { label: "Reference", value: row.reference },
    ],
    sections: summary.sections,
    closing: [
      RECORD_STATEMENT,
      s.reviewedAt ? "A clinician reviewed a safety-related response before this record was issued. The review did not change the automated scores or summary." : "",
      "PHQ-9 and GAD-7: developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc.",
    ].filter(Boolean),
    issuerClinicianId: null,
    fileName: `screening-record-${row.reference}.pdf`,
  });
}

/**
 * Finishes the screening: scores, summary, safety rules, then either issues the record and emails
 * the patient that it is ready, or holds it for clinician review. Idempotent once finished.
 */
export async function completeSameDayScreening(ctx: Ctx, caseId: string): Promise<{ outcome: "issued" | "held" }> {
  const { row, screening } = await ownedAutomated(ctx, caseId);
  if (screening.status === "issued") return { outcome: "issued" };
  if (screening.status === "held_for_review") return { outcome: "held" };
  requireOpen(row, screening);
  if (!screening.instruments.length) throw invalid("Choose your questionnaires first.");
  const measures = await scoredMeasures(ctx, row.id, screening.instruments);
  if (measures.length !== screening.instruments.length) throw invalid("Please finish every questionnaire you chose.");
  const functioning = decryptJson<FunctioningAnswers | null>(screening.functioning, null);
  if (!functioning) throw invalid("Please answer the questions about symptoms and work.");

  const completedAt = new Date();
  const summary = buildSummary({ measures, functioning, completedAt });
  const holds = holdReasons({ measures, functioning });
  await ctx.tx
    .update(automatedScreenings)
    .set({
      summary: encryptJson(summary),
      summaryHash: sha256Hex(canonicalSummary(summary)),
      completedAt,
      holdReasons: holds,
      status: holds.length ? "held_for_review" : "in_progress",
      refundReview: holds.length ? "flagged" : "none",
      updatedAt: new Date(),
    })
    .where(eq(automatedScreenings.id, screening.id));
  await audit(ctx, { action: "same_day.completed", subjectType: "automated_screening", subjectId: screening.id, caseId: row.id, metadata: { instruments: screening.instruments.join(","), held: holds.length > 0 } });

  if (holds.length) {
    await raiseSameDaySafety(ctx, row.id, holds);
    await transition(ctx, row, "safety_hold", "automated screening safety response");
    await audit(ctx, { action: "same_day.held", subjectType: "automated_screening", subjectId: screening.id, caseId: row.id, metadata: { reasons: holds.join(",") } });
    return { outcome: "held" };
  }

  const fresh = await screeningRow(ctx, row.id);
  await issueRecord(ctx, row, fresh);
  await ctx.tx.update(automatedScreenings).set({ status: "issued", updatedAt: new Date() }).where(eq(automatedScreenings.id, screening.id));
  const updated = await transition(ctx, row, "completed", "automated screening record issued");
  await notifyPatient(ctx, updated, "documents_ready");
  return { outcome: "issued" };
}

// ---- Operations ------------------------------------------------------------------------

/**
 * A clinician decides a held screening: issue the record (the automated content is unchanged) or close
 * it without issuing. The note is also recorded as the follow-up on the case's open safety events.
 */
export async function decideHeldScreening(ctx: Ctx, caseId: string, decision: "issue" | "close", note: string) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const { row } = await loadCase(ctx, caseId, "clinical");
  if (row.kind !== "automated_screening") throw notFound("Screening");
  const s = await screeningRow(ctx, row.id);
  if (s.status !== "held_for_review" || row.status !== "safety_hold") throw conflict("This screening is not on hold.");
  const text = note.trim();
  if (!text) throw invalid("Add a note describing the follow-up and your decision.");
  const now = new Date();
  await ctx.tx
    .update(safetyEvents)
    .set({ acknowledgedBy: ctx.actor.userId, acknowledgedAt: now, followUpNote: encrypt(text) })
    .where(and(eq(safetyEvents.caseId, row.id), isNull(safetyEvents.acknowledgedAt)));
  await ctx.tx.insert(caseNotes).values({ caseId: row.id, authorUserId: ctx.actor.userId, visibility: "clinical", body: encrypt(`Same-day screening hold, ${decision === "issue" ? "record issued" : "closed without issuing"}: ${text}`) });
  await ctx.tx.update(automatedScreenings).set({ reviewedBy: ctx.actor.userId, reviewedAt: now, reviewNote: encrypt(text), updatedAt: now }).where(eq(automatedScreenings.id, s.id));
  if (decision === "issue") {
    await issueRecord(ctx, row, { ...s, reviewedAt: now });
    await ctx.tx.update(automatedScreenings).set({ status: "issued" }).where(eq(automatedScreenings.id, s.id));
    const updated = await transition(ctx, row, "completed", "clinician released safety hold; record issued");
    await audit(ctx, { action: "same_day.hold_released", subjectType: "automated_screening", subjectId: s.id, caseId: row.id });
    await notifyPatient(ctx, updated, "documents_ready");
  } else {
    await ctx.tx.update(automatedScreenings).set({ status: "closed" }).where(eq(automatedScreenings.id, s.id));
    const updated = await transition(ctx, row, "closed", "clinician closed held screening without issuing");
    await audit(ctx, { action: "same_day.closed_without_issue", subjectType: "automated_screening", subjectId: s.id, caseId: row.id });
    await notifyPatient(ctx, updated, "case_update");
  }
}

/** Billing or admin records that the owner made the refund decision for a held screening (done in Payments). */
export async function resolveRefundFlag(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["admin", "billing"]);
  const { row } = await loadCase(ctx, caseId, "operational");
  const s = await screeningRow(ctx, row.id);
  if (s.refundReview !== "flagged") throw invalid("There is no refund decision pending for this screening.");
  await ctx.tx.update(automatedScreenings).set({ refundReview: "resolved", updatedAt: new Date() }).where(eq(automatedScreenings.id, s.id));
  await audit(ctx, { action: "same_day.refund_flag_resolved", subjectType: "automated_screening", subjectId: s.id, caseId: row.id });
}

/** Administrative report: counts only. */
export async function sameDayReport(ctx: Ctx) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support", "billing", "compliance"]);
  const res = await ctx.tx.execute<Record<string, number>>(sql`
    select
      (select count(*)::int from cases c where c.kind = 'automated_screening') as started,
      (select count(*)::int from cases c where c.kind = 'automated_screening'
         and exists (select 1 from payments p where p.case_id = c.id and p.status in ('paid','partially_refunded','refunded'))) as purchased,
      (select count(*)::int from automated_screenings where status = 'issued') as completed,
      (select count(*)::int from automated_screenings where status = 'held_for_review') as held_now,
      (select count(*)::int from automated_screenings where cardinality(hold_reasons) > 0) as held_total,
      (select count(*)::int from automated_screenings where status = 'closed') as closed_without_issue,
      (select count(*)::int from automated_screenings where refund_review = 'flagged') as refund_flags,
      (select count(*)::int from work_excuse_requests) as letters_requested,
      (select count(*)::int from work_excuse_requests where status = 'requested') as letters_pending,
      (select count(*)::int from work_excuse_requests where status = 'approved') as letters_approved,
      (select count(*)::int from work_excuse_requests where status = 'declined') as letters_declined,
      (select count(*)::int from automated_screenings where follow_up_requested_at is not null) as follow_ups,
      (select count(*)::int from issued_documents where status = 'revoked') as revoked,
      (select count(*)::int from issued_documents) as issued_documents`);
  return res.rows[0] as Record<
    "started" | "purchased" | "completed" | "held_now" | "held_total" | "closed_without_issue" | "refund_flags" | "letters_requested" | "letters_pending" | "letters_approved" | "letters_declined" | "follow_ups" | "revoked" | "issued_documents",
    number
  >;
}

/**
 * Patient: ask to be contacted about scheduling a full clinician-led assessment. Opt-in only, offered to
 * every patient once their record is issued; nothing is booked or charged, and the scores never trigger it.
 */
export async function requestAssessmentFollowUp(ctx: Ctx, caseId: string) {
  if (ctx.actor.kind !== "patient") throw forbidden();
  const { row, screening: s } = await ownedAutomated(ctx, caseId);
  if (s.status !== "issued") throw invalid("You can ask about an assessment once your screening record is issued.");
  if (s.followUpRequestedAt) return;
  await ctx.tx.update(automatedScreenings).set({ followUpRequestedAt: new Date() }).where(eq(automatedScreenings.id, s.id));
  await audit(ctx, { action: "screening.follow_up_requested", subjectType: "automated_screening", subjectId: s.id, caseId: row.id });
  await alertClinicalStaff(ctx, "follow_up_request", row.id);
}

/** Staff: record that someone reached out about a follow-up request. */
export async function markFollowUpHandled(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  requireStaffMfa(ctx.actor);
  const { row } = await loadCase(ctx, caseId, "operational");
  const s = await screeningRow(ctx, row.id);
  if (!s.followUpRequestedAt) throw invalid("This patient has not asked to be contacted.");
  if (s.followUpHandledAt) return;
  await ctx.tx.update(automatedScreenings).set({ followUpHandledAt: new Date(), followUpHandledBy: ctx.actor.userId }).where(eq(automatedScreenings.id, s.id));
  await audit(ctx, { action: "screening.follow_up_handled", subjectType: "automated_screening", subjectId: s.id, caseId: row.id });
}

/** Work queues for the console. References and dates only; details are on the case page for those with access. */
export async function sameDayQueues(ctx: Ctx) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support", "billing", "compliance"]);
  const held = await ctx.tx
    .select({ caseId: cases.id, reference: cases.reference, jurisdiction: cases.jurisdictionCode, completedAt: automatedScreenings.completedAt, holdReasons: automatedScreenings.holdReasons })
    .from(automatedScreenings)
    .innerJoin(cases, eq(cases.id, automatedScreenings.caseId))
    .where(eq(automatedScreenings.status, "held_for_review"))
    .orderBy(automatedScreenings.completedAt);
  const reviews = await ctx.tx
    .select({ caseId: cases.id, reference: cases.reference, createdAt: cases.createdAt })
    .from(cases)
    .where(and(eq(cases.kind, "automated_screening"), eq(cases.screeningReview, "pending"), eq(cases.status, "started")))
    .orderBy(cases.createdAt);
  const letters = await ctx.tx
    .select({ id: workExcuseRequests.id, caseId: cases.id, reference: cases.reference, createdAt: workExcuseRequests.createdAt, assigned: cases.assignedClinicianId })
    .from(workExcuseRequests)
    .innerJoin(cases, eq(cases.id, workExcuseRequests.caseId))
    .where(eq(workExcuseRequests.status, "requested"))
    .orderBy(workExcuseRequests.createdAt);
  const refunds = await ctx.tx
    .select({ caseId: cases.id, reference: cases.reference, completedAt: automatedScreenings.completedAt })
    .from(automatedScreenings)
    .innerJoin(cases, eq(cases.id, automatedScreenings.caseId))
    .where(eq(automatedScreenings.refundReview, "flagged"));
  const followUps = await ctx.tx
    .select({ caseId: cases.id, reference: cases.reference, requestedAt: automatedScreenings.followUpRequestedAt })
    .from(automatedScreenings)
    .innerJoin(cases, eq(cases.id, automatedScreenings.caseId))
    .where(and(isNotNull(automatedScreenings.followUpRequestedAt), isNull(automatedScreenings.followUpHandledAt)))
    .orderBy(automatedScreenings.followUpRequestedAt);
  const docs = await ctx.tx
    .select({ id: issuedDocuments.id, publicId: issuedDocuments.publicId, kind: issuedDocuments.kind, status: issuedDocuments.status, issuedAt: issuedDocuments.issuedAt, caseId: issuedDocuments.caseId, reference: cases.reference })
    .from(issuedDocuments)
    .innerJoin(cases, eq(cases.id, issuedDocuments.caseId))
    .orderBy(desc(issuedDocuments.issuedAt))
    .limit(50);
  // Why a screening is held is clinical information: only clinicians see the reason here.
  const clinicalViewer = hasRole(ctx.actor, CLINICAL);
  return {
    held: held.map(({ holdReasons: codes, ...h }) => ({ ...h, holdLabels: clinicalViewer ? codes.map((c) => HOLD_REASON_LABEL[c] ?? c) : [] })),
    reviews,
    letters,
    refunds,
    followUps,
    docs,
  };
}

/** The console view of one same-day case. Clinical content only with clinical access. */
export async function sameDayCaseForStaff(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support", "billing", "compliance"]);
  const { row, access } = await loadCase(ctx, caseId, "operational");
  if (row.kind !== "automated_screening") throw notFound("Screening");
  const s = await screeningRow(ctx, row.id);
  const docs = await ctx.tx.select().from(issuedDocuments).where(eq(issuedDocuments.caseId, row.id)).orderBy(desc(issuedDocuments.issuedAt));
  const [letter] = await ctx.tx.select().from(workExcuseRequests).where(eq(workExcuseRequests.automatedScreeningId, s.id)).limit(1);
  const clinical = access === "clinical";
  return {
    row,
    access,
    screening: { id: s.id, status: s.status, instruments: s.instruments, completedAt: s.completedAt, holdLabels: clinical ? s.holdReasons.map((c) => HOLD_REASON_LABEL[c] ?? c) : [], refundReview: s.refundReview, reviewedAt: s.reviewedAt },
    summary: clinical ? decryptJson<ScreeningSummary | null>(s.summary, null) : null,
    functioning: clinical ? decryptJson<FunctioningAnswers | null>(s.functioning, null) : null,
    docs,
    letter: letter ? { id: letter.id, status: letter.status } : null,
  };
}
