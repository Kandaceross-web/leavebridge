import "server-only";
import { sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { getSetting } from "../settings";
import { clinicianJurisdictions } from "./jurisdiction";
import { OPS_STAGE_OF } from "@/domain/cases/state-machine";
import { hasRole, requireRole } from "@/domain/policy";
import type { CaseStatus, OpsStage } from "@/domain/constants";

export interface OpsCaseRow {
  id: string;
  reference: string;
  patientName: string;
  status: CaseStatus;
  stage: OpsStage | null;
  priority: "normal" | "urgent";
  serviceName: string | null;
  jurisdictionCode: string | null;
  clinicianId: string | null;
  clinicianName: string | null;
  deadline: string | null;
  createdAt: Date;
  submittedAt: Date | null;
  lastActivityAt: Date;
  screeningReview: string;
  openRequests: number;
  formsCount: number;
  formsUnreviewed: number;
  requiresForm: boolean;
  measuresToReview: number;
  safetyOpen: number;
  docsToSign: number;
  docsSignedUndelivered: number;
  nextAppointment: Date | null;
  idvPending: boolean;
  paid: boolean;
  isFixture: boolean;
}

export type OpsFlag =
  | "new"
  | "missing_info"
  | "missing_forms"
  | "measures_review"
  | "upcoming_appointments"
  | "awaiting_clinician"
  | "needs_signature"
  | "completed"
  | "follow_up"
  | "aging"
  | "abandoned"
  | "safety"
  | "screening_review"
  | "identity_review"
  | "deadline_soon"
  | "unassigned";

export const OPS_FLAG_LABEL: Record<OpsFlag, string> = {
  new: "New patients",
  missing_info: "Missing information",
  missing_forms: "Missing forms",
  measures_review: "Assessments to review",
  upcoming_appointments: "Upcoming appointments",
  awaiting_clinician: "Waiting on clinician",
  needs_signature: "Forms needing signature",
  completed: "Completed, not delivered",
  follow_up: "Needs follow-up",
  aging: "Aging cases",
  abandoned: "Abandoned / incomplete",
  safety: "Safety follow-up",
  screening_review: "Screening review",
  identity_review: "Identity review",
  deadline_soon: "Deadline soon",
  unassigned: "Unassigned",
};

export async function opsCases(ctx: Ctx, opts: { includeClosed?: boolean } = {}): Promise<OpsCaseRow[]> {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support", "billing", "compliance"]);
  const actor = ctx.actor;
  // Clinicians who are not directors see their assigned cases plus unassigned cases in states they serve.
  let scope = sql`true`;
  if (!hasRole(actor, ["clinical_director", "admin", "support", "billing", "compliance"]) && actor.clinicianId) {
    const js = await clinicianJurisdictions(ctx.tx, actor.clinicianId);
    const jsList = js.length ? sql.join(js.map((j) => sql`${j}`), sql`, `) : sql`'__none__'`;
    scope = sql`(c.assigned_clinician_id = ${actor.clinicianId}::uuid or (c.assigned_clinician_id is null and c.jurisdiction_code in (${jsList})))`;
  }
  const closedFilter = opts.includeClosed ? sql`true` : sql`c.status not in ('closed','cancelled')`;
  const res = await ctx.tx.execute(sql`
    select c.id, c.reference, p.legal_first_name || ' ' || p.legal_last_name as patient_name, c.status, c.priority,
      s.name as service_name, s.requires_employer_form as requires_form, c.jurisdiction_code, c.assigned_clinician_id as clinician_id,
      cl.display_name as clinician_name, c.documentation_deadline as deadline, c.created_at, c.submitted_at, c.last_activity_at,
      c.screening_review, c.is_fixture,
      (select count(*)::int from document_requests r where r.case_id = c.id and r.status = 'open') as open_requests,
      (select count(*)::int from employer_forms f where f.case_id = c.id) as forms_count,
      (select count(*)::int from employer_forms f where f.case_id = c.id and f.status = 'received') as forms_unreviewed,
      (select count(*)::int from measure_responses m where m.case_id = c.id and m.reviewed_at is null) as measures_to_review,
      (select count(*)::int from safety_events e where e.case_id = c.id and e.acknowledged_at is null) as safety_open,
      (select count(*)::int from documents d where d.case_id = c.id and d.status = 'ready_for_signature') as docs_to_sign,
      (select count(*)::int from documents d where d.case_id = c.id and d.status = 'signed') as docs_signed_undelivered,
      (select min(a.starts_at) from appointments a where a.case_id = c.id and a.status = 'booked' and a.ends_at > now()) as next_appointment,
      exists(select 1 from identity_verifications v where v.patient_id = c.patient_id and v.status = 'pending') as idv_pending,
      exists(select 1 from payments pay where pay.case_id = c.id and pay.status in ('paid','partially_refunded')) as paid
    from cases c
    join patients p on p.id = c.patient_id
    left join services s on s.id = c.service_id
    left join clinicians cl on cl.id = c.assigned_clinician_id
    where ${closedFilter} and ${scope}
    order by c.priority desc, c.last_activity_at asc
    limit 2000`);
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    reference: String(r.reference),
    patientName: String(r.patient_name),
    status: r.status as CaseStatus,
    stage: OPS_STAGE_OF[r.status as CaseStatus],
    priority: r.priority as "normal" | "urgent",
    serviceName: (r.service_name as string) ?? null,
    jurisdictionCode: (r.jurisdiction_code as string) ?? null,
    clinicianId: (r.clinician_id as string) ?? null,
    clinicianName: (r.clinician_name as string) ?? null,
    deadline: r.deadline ? String(r.deadline).slice(0, 10) : null,
    createdAt: new Date(r.created_at as string),
    submittedAt: r.submitted_at ? new Date(r.submitted_at as string) : null,
    lastActivityAt: new Date(r.last_activity_at as string),
    screeningReview: String(r.screening_review),
    openRequests: Number(r.open_requests),
    formsCount: Number(r.forms_count),
    formsUnreviewed: Number(r.forms_unreviewed),
    requiresForm: Boolean(r.requires_form),
    measuresToReview: Number(r.measures_to_review),
    safetyOpen: Number(r.safety_open),
    docsToSign: Number(r.docs_to_sign),
    docsSignedUndelivered: Number(r.docs_signed_undelivered),
    nextAppointment: r.next_appointment ? new Date(r.next_appointment as string) : null,
    idvPending: Boolean(r.idv_pending),
    paid: Boolean(r.paid),
    isFixture: Boolean(r.is_fixture),
  }));
}

export interface Thresholds {
  agingDays: number;
  abandonedDays: number;
  followUpDays: number;
  deadlineWarningDays: number;
}

export function flagsFor(c: OpsCaseRow, t: Thresholds, now = Date.now()): OpsFlag[] {
  const days = (d: Date) => (now - d.getTime()) / 86_400_000;
  const flags: OpsFlag[] = [];
  const preSubmit = ["started", "intake_incomplete", "awaiting_documents"].includes(c.status);
  if (c.status === "submitted") flags.push("new");
  if (c.openRequests > 0 || c.status === "info_requested") flags.push("missing_info");
  if ((c.requiresForm && c.formsCount === 0 && c.paid) || c.status === "awaiting_documents") flags.push("missing_forms");
  if (c.measuresToReview > 0 && !preSubmit) flags.push("measures_review");
  if (c.nextAppointment && c.nextAppointment.getTime() - now < 7 * 86_400_000) flags.push("upcoming_appointments");
  const finished = ["completed", "delivered", "closed", "cancelled"].includes(c.status);
  if (["submitted", "clinical_review", "provider_review"].includes(c.status) || (c.formsUnreviewed > 0 && !preSubmit && !finished)) flags.push("awaiting_clinician");
  if (c.docsToSign > 0) flags.push("needs_signature");
  if (c.status === "completed" || c.docsSignedUndelivered > 0) flags.push("completed");
  if (c.openRequests > 0 && days(c.lastActivityAt) > t.followUpDays) flags.push("follow_up");
  if (!preSubmit && c.status !== "completed" && c.status !== "delivered" && days(c.submittedAt ?? c.createdAt) > t.agingDays) flags.push("aging");
  if (preSubmit && days(c.lastActivityAt) > t.abandonedDays) flags.push("abandoned");
  if (c.safetyOpen > 0 || c.status === "safety_hold") flags.push("safety");
  if (c.screeningReview === "pending") flags.push("screening_review");
  if (c.idvPending) flags.push("identity_review");
  if (c.deadline && (new Date(`${c.deadline}T00:00:00Z`).getTime() - now) / 86_400_000 <= t.deadlineWarningDays && !["completed", "delivered"].includes(c.status)) flags.push("deadline_soon");
  if (!c.clinicianId && ["submitted", "safety_hold"].includes(c.status)) flags.push("unassigned");
  return flags;
}

export async function opsOverview(ctx: Ctx) {
  const rows = await opsCases(ctx);
  const t = await getSetting(ctx.tx, "operations");
  const withFlags = rows.map((r) => ({ ...r, flags: flagsFor(r, t) }));
  const counts = {} as Record<OpsFlag, number>;
  for (const k of Object.keys(OPS_FLAG_LABEL) as OpsFlag[]) counts[k] = withFlags.filter((r) => r.flags.includes(k)).length;
  const stageCounts = {} as Record<OpsStage, number>;
  for (const r of withFlags) if (r.stage) stageCounts[r.stage] = (stageCounts[r.stage] ?? 0) + 1;
  return { rows: withFlags, counts, stageCounts, thresholds: t };
}
