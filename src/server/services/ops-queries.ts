import "server-only";
import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import {
  appointments,
  caseStatusHistory,
  cases,
  clinicalReviews,
  clinicians,
  documentRequests,
  employerForms,
  identityVerifications,
  locationAttestations,
  measureResponses,
  patients,
  payments,
  questionnaires,
  refunds,
  safetyEvents,
  screenings,
  services,
  users,
} from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, decryptOptional } from "../crypto";
import { getSetting } from "../settings";
import { loadCase } from "./cases";
import { caseFiles } from "./files";
import { caseAudit } from "./admin";
import { listCaseNotes } from "./clinical";
import { clinicianJurisdictions, servingClinicians } from "./jurisdiction";
import { flagsFor, opsCases, type OpsFlag } from "./ops";
import { caseAccess, hasRole, requireRole } from "@/domain/policy";
import { instrumentSchema } from "@/domain/instruments";

/*
 * Read-only helpers for the operations console. Each one re-checks role and case access
 * because several underlying service reads (openRequests, casePayments, caseFiles, caseAudit,
 * statusHistory) do not check access themselves.
 */

const STAFF = ["clinician", "clinical_director", "admin", "support", "billing", "compliance"] as const;

/** "Farah Haddad" → "Farah H." (list views never show the full legal name). */
export function shortPatientName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.`;
}

/** Everything the case workspace header and Summary tab need, at operational access. */
export async function caseWorkspace(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, STAFF);
  const { row, access } = await loadCase(ctx, caseId, "operational");
  await audit(ctx, { action: "case.viewed", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { access } });
  const [patient] = await ctx.tx
    .select({ first: patients.legalFirstName, last: patients.legalLastName, preferred: patients.preferredName, timeZone: patients.timeZone })
    .from(patients)
    .where(eq(patients.id, row.patientId))
    .limit(1);
  const [service] = row.serviceId ? await ctx.tx.select().from(services).where(eq(services.id, row.serviceId)).limit(1) : [];
  const [clinician] = row.assignedClinicianId
    ? await ctx.tx.select({ id: clinicians.id, name: clinicians.displayName, credentials: clinicians.credentials }).from(clinicians).where(eq(clinicians.id, row.assignedClinicianId)).limit(1)
    : [];
  const [idv] = await ctx.tx.select().from(identityVerifications).where(eq(identityVerifications.patientId, row.patientId)).orderBy(desc(identityVerifications.createdAt)).limit(1);
  const locations = await ctx.tx.select().from(locationAttestations).where(eq(locationAttestations.caseId, row.id)).orderBy(desc(locationAttestations.createdAt));
  const casePays = await ctx.tx.select().from(payments).where(eq(payments.caseId, row.id)).orderBy(desc(payments.createdAt));
  const history = await ctx.tx
    .select({ h: caseStatusHistory, email: users.email })
    .from(caseStatusHistory)
    .leftJoin(users, eq(users.id, caseStatusHistory.actorUserId))
    .where(eq(caseStatusHistory.caseId, row.id))
    .orderBy(desc(caseStatusHistory.createdAt));
  const reqs = await ctx.tx.select().from(documentRequests).where(eq(documentRequests.caseId, row.id)).orderBy(desc(documentRequests.createdAt));
  const [screening] = row.screeningId ? await ctx.tx.select({ outcome: screenings.outcome }).from(screenings).where(eq(screenings.id, row.screeningId)).limit(1) : [];
  const thresholds = await getSetting(ctx.tx, "operations");
  const opsRow = (await opsCases(ctx, { includeClosed: true })).find((r) => r.id === row.id);
  const flags: OpsFlag[] = opsRow ? flagsFor(opsRow, thresholds) : [];
  return {
    row,
    access,
    patientName: patient ? `${patient.first} ${patient.last}` : "",
    preferredName: patient?.preferred ?? null,
    employerName: decryptOptional(row.employerName),
    screeningOutcome: screening?.outcome ?? null,
    patientTimeZone: patient?.timeZone ?? "America/Chicago",
    service: service ?? null,
    clinician: clinician ?? null,
    identity: idv ? { id: idv.id, status: idv.status, fileId: idv.fileId, method: idv.method, reviewedAt: idv.reviewedAt, createdAt: idv.createdAt, reviewNote: decryptOptional(idv.reviewNote) } : null,
    locations,
    payments: casePays,
    history: history.map(({ h, email }) => ({ ...h, actorEmail: email })),
    // Information requests are clinical; their text is shown only with clinical access.
    requests: reqs.map((r) => {
      const clinicalOnly = r.kind === "information" && access !== "clinical";
      return { ...r, message: clinicalOnly ? null : decrypt(r.message), response: clinicalOnly ? null : decryptOptional(r.response) };
    }),
    flags,
  };
}

/** Clinicians who can serve this case today (for assign / reassign). */
export async function assignableClinicians(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin"]);
  const { row } = await loadCase(ctx, caseId, "operational");
  if (!row.serviceId || !row.jurisdictionCode) return [];
  const list = await servingClinicians(ctx.tx, row.serviceId, row.jurisdictionCode, new Date());
  return list.filter((x) => x.clinician.status === "active").map((x) => ({ id: x.clinician.id, name: x.clinician.displayName, credentials: x.clinician.credentials }));
}

/** Measure responses with instrument definitions, for the clinical Measures tab. */
export async function caseMeasures(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "compliance"]);
  const { row } = await loadCase(ctx, caseId, "clinical");
  const rows = await ctx.tx
    .select({ m: measureResponses, def: questionnaires.definition })
    .from(measureResponses)
    .innerJoin(questionnaires, eq(questionnaires.id, measureResponses.questionnaireId))
    .where(eq(measureResponses.caseId, row.id))
    .orderBy(measureResponses.completedAt);
  await audit(ctx, { action: "case.viewed", subjectType: "case", subjectId: row.id, caseId: row.id, metadata: { section: "measures" } });
  return rows.map(({ m, def }) => {
    const parsed = instrumentSchema.safeParse(def);
    return {
      id: m.id,
      instrumentKey: m.instrumentKey,
      instrument: parsed.success ? parsed.data : null,
      answers: decryptJson<Record<string, number>>(m.answers, {}),
      totalScore: m.totalScore,
      severityBand: m.severityBand,
      safetyFlag: m.safetyFlag,
      completedAt: m.completedAt,
      reviewedAt: m.reviewedAt,
    };
  });
}

/** Files on the case. Identity files only for operational roles; downloads are re-authorized by /api/files. */
export async function caseFileList(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, STAFF);
  const { row, access } = await loadCase(ctx, caseId, "operational");
  const includeIdentity = hasRole(ctx.actor, ["admin", "support", "clinician", "clinical_director"]);
  const list = await caseFiles(ctx, row.id, { includeIdentity });
  const forms =
    access === "clinical"
      ? (await ctx.tx.select().from(employerForms).where(eq(employerForms.caseId, row.id)).orderBy(employerForms.createdAt)).map((f) => ({
          ...f,
          notes: decryptJson<{ reviewerNotes?: string }>(f.extracted, {}).reviewerNotes ?? "",
        }))
      : [];
  return {
    access,
    files: list.map((f) => ({ id: f.id, category: f.category, name: access === "clinical" || f.category === "identity" ? f.name : "Document", mimeType: f.mimeType, sizeBytes: f.sizeBytes, createdAt: f.createdAt, scanStatus: f.scanStatus, canDownload: f.scanStatus === "clean" && (access === "clinical" || f.category === "identity") })),
    forms,
  };
}

export async function caseClinicalReviews(ctx: Ctx, caseId: string) {
  const { row } = await loadCase(ctx, caseId, "clinical");
  const rows = await ctx.tx
    .select({ r: clinicalReviews, name: clinicians.displayName })
    .from(clinicalReviews)
    .innerJoin(clinicians, eq(clinicians.id, clinicalReviews.clinicianId))
    .where(eq(clinicalReviews.caseId, row.id))
    .orderBy(desc(clinicalReviews.createdAt));
  return rows.map(({ r, name }) => ({ id: r.id, outcome: r.outcome, notes: decryptOptional(r.notes), createdAt: r.createdAt, clinician: name }));
}

/** Audit trail for one case: admin and compliance only. */
export async function caseAuditTrail(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, ["admin", "compliance"]);
  const { row } = await loadCase(ctx, caseId, "operational");
  const rows = await caseAudit(ctx, row.id);
  return rows.map(({ e, email }) => ({ id: e.id, occurredAt: e.occurredAt, actor: email ?? e.actorRole ?? "system", action: e.action, outcome: e.outcome }));
}

/** Payments for one case with their refunds (operational). */
export async function casePaymentDetail(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, STAFF);
  const { row } = await loadCase(ctx, caseId, "operational");
  const pays = await ctx.tx.select().from(payments).where(eq(payments.caseId, row.id)).orderBy(desc(payments.createdAt));
  const refundRows = pays.length
    ? await ctx.tx
        .select({ r: refunds, requester: users.email })
        .from(refunds)
        .leftJoin(users, eq(users.id, refunds.requestedBy))
        .where(inArray(refunds.paymentId, pays.map((p) => p.id)))
        .orderBy(desc(refunds.createdAt))
    : [];
  return { row, payments: pays.map((p) => ({ ...p, refunds: refundRows.filter((x) => x.r.paymentId === p.id).map((x) => ({ ...x.r, requesterEmail: x.requester })) })) };
}

/** Appointments in a window with case reference and short patient name (schedule and overview). */
export async function scheduleAppointments(ctx: Ctx, opts: { clinicianId: string | null; days: number }) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  const now = new Date();
  const until = new Date(now.getTime() + opts.days * 86_400_000);
  const conds = [eq(appointments.status, "booked"), gte(appointments.endsAt, now), lt(appointments.startsAt, until)];
  if (opts.clinicianId) conds.push(eq(appointments.clinicianId, opts.clinicianId));
  const rows = await ctx.tx
    .select({ a: appointments, clinicianName: clinicians.displayName, reference: cases.reference, first: patients.legalFirstName, last: patients.legalLastName })
    .from(appointments)
    .innerJoin(clinicians, eq(clinicians.id, appointments.clinicianId))
    .innerJoin(cases, eq(cases.id, appointments.caseId))
    .innerJoin(patients, eq(patients.id, cases.patientId))
    .where(and(...conds))
    .orderBy(appointments.startsAt);
  return rows.map((r) => ({
    id: r.a.id,
    caseId: r.a.caseId,
    startsAt: r.a.startsAt,
    endsAt: r.a.endsAt,
    jurisdictionCode: r.a.jurisdictionCode,
    clinicianId: r.a.clinicianId,
    clinicianName: r.clinicianName,
    reference: r.reference,
    patient: shortPatientName(`${r.first} ${r.last}`),
  }));
}

/**
 * Open safety events. Case events carry the case reference and short name; screening events
 * (no case) are returned only as an anonymous count. The triggering rule is included only
 * when the actor would have clinical access to that case.
 */
export async function safetyQueue(ctx: Ctx) {
  requireRole(ctx.actor, STAFF);
  const actor = ctx.actor;
  const rows = await ctx.tx
    .select({ e: safetyEvents, reference: cases.reference, status: cases.status, kind: cases.kind, assigned: cases.assignedClinicianId, jurisdiction: cases.jurisdictionCode, patientId: cases.patientId, first: patients.legalFirstName, last: patients.legalLastName })
    .from(safetyEvents)
    .leftJoin(cases, eq(cases.id, safetyEvents.caseId))
    .leftJoin(patients, eq(patients.id, cases.patientId))
    .where(isNull(safetyEvents.acknowledgedAt))
    .orderBy(desc(safetyEvents.createdAt));
  const held = await ctx.tx
    .select({ id: cases.id, reference: cases.reference, kind: cases.kind, assigned: cases.assignedClinicianId, jurisdiction: cases.jurisdictionCode, patientId: cases.patientId, status: cases.status, first: patients.legalFirstName, last: patients.legalLastName, updatedAt: cases.lastActivityAt })
    .from(cases)
    .innerJoin(patients, eq(patients.id, cases.patientId))
    .where(eq(cases.status, "safety_hold"));
  const authorizedJurisdictions = actor.clinicianId ? await clinicianJurisdictions(ctx.tx, actor.clinicianId) : [];
  const clinicalFor = (c: { patientId: string | null; assigned: string | null; jurisdiction: string | null; status: string | null }) =>
    c.patientId ? caseAccess(actor, { patientId: c.patientId, assignedClinicianId: c.assigned, jurisdictionCode: c.jurisdiction, status: c.status ?? "" }, { authorizedJurisdictions }) === "clinical" : false;
  const caseEvents = rows.filter((r) => r.e.caseId);
  return {
    screeningCount: rows.length - caseEvents.length,
    events: caseEvents.map((r) => {
      const clinical = clinicalFor(r);
      return {
        id: r.e.id,
        caseId: r.e.caseId!,
        reference: r.reference ?? "",
        patient: shortPatientName(`${r.first ?? ""} ${r.last ?? ""}`),
        status: r.status,
        automated: r.kind === "automated_screening",
        createdAt: r.e.createdAt,
        source: clinical ? r.e.source : null,
        rule: clinical ? r.e.rule : null,
        canAct: clinical && hasRole(actor, ["clinician", "clinical_director"]),
      };
    }),
    held: held.map((h) => ({ id: h.id, reference: h.reference, automated: h.kind === "automated_screening", patient: shortPatientName(`${h.first} ${h.last}`), updatedAt: h.updatedAt, canAct: clinicalFor(h) && hasRole(actor, ["clinician", "clinical_director"]) })),
  };
}

/** Recent payments across cases for billing (no clinical data, case reference only). */
export async function billingPayments(ctx: Ctx, limit = 200) {
  requireRole(ctx.actor, ["billing", "admin"]);
  const rows = await ctx.tx
    .select({ p: payments, reference: cases.reference, caseId: cases.id, caseStatus: cases.status })
    .from(payments)
    .innerJoin(cases, eq(cases.id, payments.caseId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
  const ids = rows.map((r) => r.p.id);
  const refundRows = ids.length
    ? await ctx.tx.select({ r: refunds, requester: users.email }).from(refunds).leftJoin(users, eq(users.id, refunds.requestedBy)).where(inArray(refunds.paymentId, ids)).orderBy(desc(refunds.createdAt))
    : [];
  const pending = await ctx.tx
    .select({ r: refunds, requester: users.email, reference: cases.reference, caseId: cases.id, amountPaid: payments.amountCents, currency: payments.currency })
    .from(refunds)
    .innerJoin(payments, eq(payments.id, refunds.paymentId))
    .innerJoin(cases, eq(cases.id, payments.caseId))
    .leftJoin(users, eq(users.id, refunds.requestedBy))
    .where(eq(refunds.status, "requested"))
    .orderBy(refunds.createdAt);
  return {
    payments: rows.map((r) => ({
      ...r.p,
      reference: r.reference,
      caseId: r.caseId,
      caseStatus: r.caseStatus,
      refunds: refundRows.filter((x) => x.r.paymentId === r.p.id).map((x) => ({ ...x.r, requesterEmail: x.requester })),
    })),
    pending: pending.map((x) => ({ ...x.r, requesterEmail: x.requester, reference: x.reference, caseId: x.caseId, amountPaid: x.amountPaid, currency: x.currency })),
  };
}

/** Case notes with author emails. Clinical notes only when the viewer has clinical access. */
export async function caseNotesWithAuthors(ctx: Ctx, caseId: string) {
  requireRole(ctx.actor, STAFF);
  const { row, access } = await loadCase(ctx, caseId, "operational");
  const notes = await listCaseNotes(ctx, row.id, access === "clinical");
  const ids = [...new Set(notes.map((n) => n.authorUserId))];
  const authors = ids.length ? await ctx.tx.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ids)) : [];
  return notes.map((n) => ({ id: n.id, visibility: n.visibility, body: n.body, createdAt: n.createdAt, author: authors.find((a) => a.id === n.authorUserId)?.email ?? "Staff" }));
}
