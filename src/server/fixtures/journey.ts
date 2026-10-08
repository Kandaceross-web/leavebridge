import "server-only";
import type { StoredAttribution } from "@/domain/attribution";
import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { withActor, type Ctx } from "../db/actor";
import { cases, documents, patients, payments, users } from "../db/schema";
import { createScreening, saveScreeningStep, screeningById, type ScreeningRow } from "../services/screening";
import { signUp } from "../services/accounts";
import { selectService, submitCase } from "../services/cases";
import { requiredConsentVersions } from "../services/cases";
import { signStageConsents } from "../services/consents";
import { attestLocation, submitIdentityDocument } from "../services/identity";
import { confirmSimulatedPayment, startCheckout } from "../services/payments";
import { enabledInstruments, publishedIntakeTemplate, saveIntakeSection, submitIntake, submitMeasure } from "../services/intake";
import { uploadEmployerForm } from "../services/files";
import { assignClinician, recordClinicalReview, recordDetermination, saveAssessmentNote } from "../services/clinical";
import { availableSlots, bookAppointment, completeAppointment } from "../services/scheduling";
import { createDocument, deliverToPatient, markReadyForSignature, saveDocumentVersion, signDocument } from "../services/documents";
import { FIXTURE_PASSWORD, FIXTURE_STAFF, type FixtureStaff, type FixtureStaffKey } from "./reference";
import type { Actor } from "@/domain/actor";
import type { ConsentStage } from "@/domain/constants";

/**
 * Drives the real service layer through the patient journey, one transaction per "request",
 * exactly as the UI would. Used by the development seed and by integration tests so both
 * exercise the same rules (gates, RLS, triggers) rather than inserting rows directly.
 */

export const anonymous: Actor = { kind: "anonymous" };
export const system: Actor = { kind: "system", reason: "fixture" };

export function staffActor(staff: FixtureStaff, key: FixtureStaffKey, opts: { mfa?: boolean; stepUp?: boolean } = {}): Extract<Actor, { kind: "staff" }> {
  const clinicianId = key === "director" || key === "clinician" || key === "clinician2" ? staff.clinicianIds[key] : null;
  return { kind: "staff", userId: staff.userIds[key], roles: [...FIXTURE_STAFF[key].roles], clinicianId, mfa: opts.mfa ?? true, stepUpAt: opts.stepUp === false ? null : new Date() };
}

export type ScreeningAnswers = Record<string, string | string[]>;

export const AVAILABLE_ANSWERS: ScreeningAnswers = {
  age_18: "yes",
  current_state: "MS",
  appointment_state: "MS",
  safety_now: "no",
  reason: ["symptoms_affect_work"],
  own_condition: "yes",
  employer_type: "private",
  employment_length: "gte_12m",
  hours_worked: "24_plus",
  current_provider: "no",
  leave_type: "continuous",
  hr_contacted: "yes",
  has_form: "yes",
  provider_type_accepted: "any_licensed",
  deadline: "",
  previous_leave: "new",
};

/** Completes a screening step by step. Returns the final row and outcome (or the step where it stopped). */
export async function runScreening(overrides: ScreeningAnswers = {}, refCode: string | null = null, attribution: StoredAttribution | null = null) {
  const answers = { ...AVAILABLE_ANSWERS, ...overrides };
  const { row } = await withActor(anonymous, (ctx) => createScreening(ctx, refCode, attribution));
  let outcome: string | undefined;
  for (const step of ["location", "safety", "situation", "leave"]) {
    const res = await withActor(anonymous, async (ctx) => saveScreeningStep(ctx, await screeningById(ctx, row.id), step, answers));
    if (Object.keys(res.errors).length) throw new Error(`Screening step ${step} invalid: ${JSON.stringify(res.errors)}`);
    if (res.done) {
      outcome = res.outcome;
      break;
    }
  }
  const final = await withActor(system, (ctx) => screeningById(ctx, row.id));
  return { screening: final, outcome };
}

export interface FixturePatient {
  userId: string;
  patientId: string;
  caseId: string;
  email: string;
  legalName: string;
  actor: Extract<Actor, { kind: "patient" }>;
}

let counter = 0;
export async function registerPatient(screening: ScreeningRow, person: { first: string; last: string; email?: string }): Promise<FixturePatient> {
  counter++;
  const email = person.email ?? `${person.first.toLowerCase()}.${person.last.toLowerCase()}.${Date.now().toString(36)}${counter}@example.test`;
  const { userId, caseId } = await withActor(system, (ctx) =>
    signUp(ctx, { firstName: person.first, lastName: person.last, preferredName: "", email, password: FIXTURE_PASSWORD, dateOfBirth: "1988-04-12", timeZone: "America/Chicago", ageAttest: "on", termsAccept: "on" }, screening),
  );
  await withActor(system, async (ctx) => {
    await ctx.tx.update(users).set({ isFixture: true, emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    await ctx.tx.update(cases).set({ isFixture: true }).where(eq(cases.id, caseId));
  });
  const [p] = await withActor(system, (ctx) => ctx.tx.select().from(patients).where(eq(patients.userId, userId)).limit(1));
  return {
    userId,
    patientId: p!.id,
    caseId,
    email,
    legalName: `${person.first} ${person.last}`,
    actor: { kind: "patient", userId, patientId: p!.id, mfa: false, stepUpAt: null },
  };
}

/** A small, valid PDF used as a fictional upload. */
export async function fixturePdf(title: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(`FICTIONAL TEST DOCUMENT: ${title}`, { x: 56, y: 720, size: 12, font });
  return Buffer.from(await pdf.save());
}

export const as = <T>(actor: Actor, fn: (ctx: Ctx) => Promise<T>) => withActor(actor, fn);

async function signStage(p: FixturePatient, stage: ConsentStage) {
  await as(p.actor, async (ctx) => {
    const [c] = await ctx.tx.select().from(cases).where(eq(cases.id, p.caseId)).limit(1);
    const required = await requiredConsentVersions(ctx, stage, c!.jurisdictionCode);
    const versionIds = required.map((r) => r.version.id);
    await signStageConsents(ctx, p.caseId, stage, { typedName: p.legalName, versionIds, legalName: p.legalName, sessionMfa: false });
  });
}

export type PatientStep = "service" | "identity" | "consents_payment" | "payment" | "consents_intake" | "intake" | "measures" | "documents" | "submit";
const ORDER: PatientStep[] = ["service", "identity", "consents_payment", "payment", "consents_intake", "intake", "measures", "documents", "submit"];

/** Intake answers that satisfy every required question; safety answers are "no" unless asked. */
export async function intakeAnswers(opts: { safety?: boolean } = {}) {
  const tpl = await as(system, (ctx) => publishedIntakeTemplate(ctx));
  const out: Record<string, Record<string, string | string[]>> = {};
  for (const s of tpl.def.sections) {
    const a: Record<string, string | string[]> = {};
    for (const q of s.questions) {
      if (q.safetyValue) a[q.key] = opts.safety && q.key === "safety_thoughts" ? q.safetyValue : "no";
      else if (q.kind === "multi") a[q.key] = [q.options![0]!.value];
      else if (q.options?.length) a[q.key] = q.kind === "yesno" ? "no" : q.options[0]!.value;
      else if (q.kind === "date") a[q.key] = "2026-08-01";
      else if (q.kind === "state") a[q.key] = "MS";
      else if (/phone/.test(q.key)) a[q.key] = "555-0100";
      else a[q.key] = "Fictional answer for development and testing.".slice(0, q.maxLength ?? 4000);
    }
    out[s.key] = a;
  }
  return out;
}

/** Advances the patient's case through each step up to and including `through`. */
export async function advancePatient(p: FixturePatient, through: PatientStep, opts: { from?: PatientStep; safetyInIntake?: boolean; serviceSlug?: string } = {}) {
  const last = ORDER.indexOf(through);
  for (const step of ORDER.slice(opts.from ? ORDER.indexOf(opts.from) : 0, last + 1)) {
    switch (step) {
      case "service":
        await as(p.actor, async (ctx) => {
          const svc = await ctx.tx.query.services.findFirst({ where: (s, { eq: e }) => e(s.slug, opts.serviceSlug ?? "mental-health-leave-assessment") });
          await selectService(ctx, p.caseId, { serviceId: svc!.id, leaveType: "continuous", deadline: null, employerName: "Example Logistics Co. (fictional)" });
        });
        break;
      case "identity": {
        const pdf = await fixturePdf("photo ID");
        await as(p.actor, (ctx) => submitIdentityDocument(ctx, p.caseId, { name: "fictional-id.pdf", data: pdf }));
        const { jurisdictionCode } = await caseRow(p.caseId);
        await as(p.actor, (ctx) => attestLocation(ctx, p.caseId, jurisdictionCode ?? "MS", "verification"));
        break;
      }
      case "consents_payment":
        await signStage(p, "payment");
        break;
      case "payment": {
        const url = await as(p.actor, (ctx) => startCheckout(ctx, p.caseId));
        const ref = new URL(url, "http://localhost").searchParams.get("ref")!;
        await as(p.actor, (ctx) => confirmSimulatedPayment(ctx, ref));
        break;
      }
      case "consents_intake":
        await signStage(p, "intake");
        break;
      case "intake": {
        const answers = await intakeAnswers({ safety: opts.safetyInIntake });
        for (const [section, a] of Object.entries(answers)) {
          const res = await as(p.actor, (ctx) => saveIntakeSection(ctx, p.caseId, section, a));
          if (Object.keys(res.errors).length) throw new Error(`Intake ${section}: ${JSON.stringify(res.errors)}`);
        }
        await as(p.actor, (ctx) => submitIntake(ctx, p.caseId));
        break;
      }
      case "measures": {
        const list = await as(system, (ctx) => enabledInstruments(ctx));
        for (const { inst } of list) {
          const raw = Object.fromEntries(inst.items.map((i, idx) => [i.key, idx % 3 === 0 ? 2 : 1]));
          // Keep safety items at 0 so routine fixtures don't raise safety events.
          for (const s of inst.safetyItems) raw[s.item] = 0;
          await as(p.actor, (ctx) => submitMeasure(ctx, p.caseId, inst.key, raw));
        }
        break;
      }
      case "documents": {
        const pdf = await fixturePdf("employer leave form");
        await as(p.actor, (ctx) => uploadEmployerForm(ctx, p.caseId, { name: "employer-form.pdf", data: pdf }));
        break;
      }
      case "submit":
        await as(p.actor, (ctx) => submitCase(ctx, p.caseId));
        break;
    }
  }
}

export type StaffStep = "assign" | "review_session" | "book" | "complete_session" | "determine" | "document" | "sign" | "deliver";
const STAFF_ORDER: StaffStep[] = ["assign", "review_session", "book", "complete_session", "determine", "document", "sign", "deliver"];

/** Advances a submitted case through clinical steps as the fixture clinician. */
export async function advanceClinical(staff: FixtureStaff, p: FixturePatient, through: StaffStep, opts: { from?: StaffStep; clinician?: "clinician" | "director"; decision?: string } = {}) {
  const who = opts.clinician ?? "clinician";
  const clin = staffActor(staff, who);
  const last = STAFF_ORDER.indexOf(through);
  let documentId: string | null = null;
  for (const step of STAFF_ORDER.slice(opts.from ? STAFF_ORDER.indexOf(opts.from) : 0, last + 1)) {
    switch (step) {
      case "assign":
        await as(staffActor(staff, "director"), (ctx) => assignClinician(ctx, p.caseId, staff.clinicianIds[who]));
        break;
      case "review_session":
        await as(clin, (ctx) => recordClinicalReview(ctx, p.caseId, { outcome: "session_required", notes: "Fictional review note: intake reviewed; a video assessment is needed." }));
        break;
      case "book": {
        const slots = await as(p.actor, (ctx) => availableSlots(ctx, p.caseId));
        if (!slots.length) throw new Error("No fixture slots available");
        await as(p.actor, (ctx) => bookAppointment(ctx, p.caseId, slots[0]!.startsAt.toISOString()));
        break;
      }
      case "complete_session": {
        const appt = await as(system, (ctx) => ctx.tx.query.appointments.findFirst({ where: (a, { eq: e }) => e(a.caseId, p.caseId) }));
        await as(clin, (ctx) => completeAppointment(ctx, appt!.id, "completed"));
        await as(clin, (ctx) => saveAssessmentNote(ctx, p.caseId, "Fictional assessment note for development. No real patient.", appt!.id));
        break;
      }
      case "determine":
        await as(clin, (ctx) =>
          recordDetermination(ctx, p.caseId, {
            decision: opts.decision ?? "DOCUMENTATION_CLINICALLY_SUPPORTED",
            rationale: "Fictional rationale written by the fixture clinician for development purposes.",
            findings: "Fictional findings for development.",
            patientMessage: "Your clinician has completed the assessment. Next steps are shown in your portal.",
          }),
        );
        break;
      case "document": {
        documentId = await as(clin, (ctx) => createDocument(ctx, p.caseId, "continuous_leave", null));
        await as(clin, (ctx) =>
          saveDocumentVersion(ctx, documentId!, {
            patient_name: p.legalName,
            patient_dob: "1988-04-12",
            incapacity_start: "2026-10-12",
            incapacity_end: "2026-11-09",
            functional_limitations: "Fictional limitations text written by the clinician.",
            clinician_statement: "Fictional clinician statement.",
          }),
        );
        await as(clin, (ctx) => markReadyForSignature(ctx, documentId!));
        break;
      }
      case "sign":
        documentId ??= await latestDocumentId(p.caseId);
        await as(clin, (ctx) => signDocument(ctx, documentId!, "I attest that I personally evaluated this patient and that this document reflects my independent clinical judgment."));
        break;
      case "deliver":
        documentId ??= await latestDocumentId(p.caseId);
        await as(staffActor(staff, "support"), (ctx) => deliverToPatient(ctx, documentId!));
        break;
    }
  }
  return { documentId };
}

async function latestDocumentId(caseId: string) {
  return as(system, async (ctx) => (await ctx.tx.select({ id: documents.id }).from(documents).where(eq(documents.caseId, caseId)).limit(1))[0]!.id);
}

/** Fetches a case row as the system (for assertions). */
export async function caseRow(caseId: string) {
  return as(system, async (ctx) => (await ctx.tx.select().from(cases).where(eq(cases.id, caseId)).limit(1))[0]!);
}

export async function paymentRow(caseId: string) {
  return as(system, async (ctx) => (await ctx.tx.select().from(payments).where(eq(payments.caseId, caseId)).limit(1))[0] ?? null);
}

