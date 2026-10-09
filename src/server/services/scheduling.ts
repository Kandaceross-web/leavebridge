import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { appointments, availabilityRules, clinicians, jurisdictions, services } from "../db/schema";
import { audit } from "../audit";
import { getSetting } from "../settings";
import { video } from "../providers/video";
import { checkCanServe, loadAuthorizations } from "./jurisdiction";
import { attestLocation } from "./identity";
import { getCaseRow, loadCase, notifyPatient, transition } from "./cases";
import { canServe } from "@/domain/jurisdiction/can-serve";
import { requireAssignedClinician, requireRole } from "@/domain/policy";
import { conflict, invalid, notFound } from "@/domain/errors";

/** Minutes offset of a time zone at an instant (e.g. America/Chicago → -300 in CDT). */
function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** UTC instant for a wall-clock time in a zone (DST-safe for non-ambiguous times). */
export function zonedTime(dateIso: string, minuteOfDay: number, timeZone: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number) as [number, number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60));
  const off1 = tzOffsetMinutes(timeZone, guess);
  const first = new Date(guess.getTime() - off1 * 60_000);
  const off2 = tzOffsetMinutes(timeZone, first);
  return off1 === off2 ? first : new Date(guess.getTime() - off2 * 60_000);
}

function localDateIso(at: Date, timeZone: string): { iso: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, weekday: wd };
}

/**
 * Bookable slots for the assigned clinician: availability rules, minimum notice, horizon, session
 * length plus buffer, existing bookings, and canServe() for the case's jurisdiction on each date.
 */
export async function availableSlots(ctx: Ctx, caseId: string): Promise<{ startsAt: Date; endsAt: Date }[]> {
  const { row } = await loadCase(ctx, caseId, ctx.actor.kind === "patient" ? "owner" : "operational");
  if (!row.assignedClinicianId || !row.serviceId || !row.jurisdictionCode) return [];
  const sched = await getSetting(ctx.tx, "scheduling");
  const [svc] = await ctx.tx.select().from(services).where(eq(services.id, row.serviceId)).limit(1);
  const [clin] = await ctx.tx.select().from(clinicians).where(eq(clinicians.id, row.assignedClinicianId)).limit(1);
  const [j] = await ctx.tx.select().from(jurisdictions).where(eq(jurisdictions.code, row.jurisdictionCode)).limit(1);
  if (!svc || !clin) return [];
  const rules = await ctx.tx.select().from(availabilityRules).where(eq(availabilityRules.clinicianId, clin.id));
  const auths = await loadAuthorizations(ctx.tx, { clinicianId: clin.id, serviceId: svc.id, jurisdictionCode: row.jurisdictionCode });
  const now = Date.now();
  const earliest = now + sched.minNoticeHours * 3_600_000;
  const horizon = now + sched.horizonDays * 86_400_000;
  // Busy times come from a SECURITY DEFINER function so patients never read other patients' rows.
  const busy = await ctx.tx.execute<{ starts_at: string; ends_at: string }>(sql`select starts_at, ends_at from lb_clinician_busy(${clin.id}::uuid, ${new Date(now).toISOString()}::timestamptz, ${new Date(horizon).toISOString()}::timestamptz)`);
  const booked = busy.rows.map((b) => ({ s: new Date(b.starts_at), e: new Date(b.ends_at) }));
  const duration = svc.sessionMinutes * 60_000;
  const buffer = sched.bufferMinutes * 60_000;
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  for (let dayMs = now; dayMs <= horizon; dayMs += 86_400_000) {
    for (const rule of rules) {
      const { iso, weekday } = localDateIso(new Date(dayMs), rule.timeZone);
      if (weekday !== rule.weekday) continue;
      if (rule.effectiveFrom && iso < rule.effectiveFrom) continue;
      if (rule.effectiveTo && iso > rule.effectiveTo) continue;
      for (let m = rule.startMinute; m + svc.sessionMinutes <= rule.endMinute; m += sched.slotIntervalMinutes) {
        const start = zonedTime(iso, m, rule.timeZone);
        const s = start.getTime();
        if (s < earliest || s > horizon) continue;
        const e = s + duration;
        if (booked.some((b) => s < b.e.getTime() + buffer && e + buffer > b.s.getTime())) continue;
        if (!canServe({ jurisdiction: j ?? null, clinician: clin, serviceId: svc.id, authorizations: auths, on: start }).ok) continue;
        if (!slots.some((x) => x.startsAt.getTime() === s)) slots.push({ startsAt: start, endsAt: new Date(e) });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 120);
}

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

export async function bookAppointment(ctx: Ctx, caseId: string, startsAtIso: string) {
  const { row } = await loadCase(ctx, caseId, ctx.actor.kind === "patient" ? "owner" : "operational");
  if (row.status !== "appointment_needed") throw conflict("This case isn't ready for scheduling.");
  const slots = await availableSlots(ctx, caseId);
  const slot = slots.find((s) => s.startsAt.toISOString() === startsAtIso);
  if (!slot) throw invalid("That time is no longer available. Please choose another.");
  // STR-02: license expiry is rechecked only before signing (owner sign-off 2026-10-09); state match is still enforced.
  const can = await checkCanServe(ctx.tx, row.assignedClinicianId!, row.serviceId!, row.jurisdictionCode!, slot.startsAt, { checkLicenseExpiry: false });
  if (!can.ok) throw invalid("That time can't be booked for your state.");
  const [appt] = await ctx.tx
    .insert(appointments)
    .values({ caseId: row.id, clinicianId: row.assignedClinicianId!, serviceAuthorizationId: can.authorizationId, startsAt: slot.startsAt, endsAt: slot.endsAt, jurisdictionCode: row.jurisdictionCode! })
    .returning()
    .catch((err: unknown) => {
      // Only the no-overlap exclusion constraint means "slot taken"; anything else is a real error.
      if (pgCode(err) === "23P01") throw conflict("That time was just taken. Please choose another.");
      throw err;
    });
  const room = await video().createRoom(appt!.id);
  await ctx.tx.update(appointments).set({ videoRef: room.roomRef }).where(eq(appointments.id, appt!.id));
  await audit(ctx, { action: "appointment.scheduled", subjectType: "appointment", subjectId: appt!.id, caseId: row.id });
  const updated = await transition(ctx, row, "appointment_scheduled", "appointment booked");
  await notifyPatient(ctx, updated, "appointment_scheduled");
  return appt!.id;
}

export async function cancelAppointment(ctx: Ctx, appointmentId: string, reason: string) {
  const [appt] = await ctx.tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appt || appt.status !== "booked") throw invalid("This appointment can't be cancelled.");
  const byPatient = ctx.actor.kind === "patient";
  const { row } = await loadCase(ctx, appt.caseId, byPatient ? "owner" : "operational");
  if (!byPatient) requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  await ctx.tx.update(appointments).set({ status: byPatient ? "cancelled_by_patient" : "cancelled_by_clinician", cancelReason: reason.slice(0, 200), updatedAt: new Date() }).where(eq(appointments.id, appt.id));
  await audit(ctx, { action: "appointment.cancelled", subjectType: "appointment", subjectId: appt.id, caseId: row.id, metadata: { by: byPatient ? "patient" : "staff" } });
  if (row.status === "appointment_scheduled") {
    const updated = await transition(ctx, row, "appointment_needed", "appointment cancelled");
    await notifyPatient(ctx, updated, "appointment_needed");
  }
}

/**
 * Join check: the patient re-attests their physical location; joining is allowed only if the
 * clinician can serve that state right now (STR-03).
 */
export async function joinAppointment(ctx: Ctx, appointmentId: string, stateCode: string) {
  const [appt] = await ctx.tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appt || appt.status !== "booked") throw notFound("Appointment");
  const row = await getCaseRow(ctx, appt.caseId);
  await attestLocation(ctx, row.id, stateCode, "appointment_join", appt.id);
  const can = await checkCanServe(ctx.tx, appt.clinicianId, row.serviceId!, stateCode, new Date(), { checkLicenseExpiry: false });
  return { allowed: can.ok, joinUrl: can.ok ? video().joinUrl(appt.videoRef ?? "", "patient") : null };
}

export async function completeAppointment(ctx: Ctx, appointmentId: string, outcome: "completed" | "no_show") {
  requireRole(ctx.actor, ["clinician", "clinical_director"]);
  const [appt] = await ctx.tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appt || appt.status !== "booked") throw invalid("This appointment is not open.");
  const { row } = await loadCase(ctx, appt.caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  await ctx.tx.update(appointments).set({ status: outcome, updatedAt: new Date() }).where(eq(appointments.id, appt.id));
  await audit(ctx, { action: "appointment.completed", subjectType: "appointment", subjectId: appt.id, caseId: row.id, metadata: { outcome } });
  if (row.status === "appointment_scheduled") {
    if (outcome === "completed") await transition(ctx, row, "provider_review", "session completed");
    else {
      const updated = await transition(ctx, row, "appointment_needed", "no show");
      await notifyPatient(ctx, updated, "appointment_needed");
    }
  }
}

export async function caseAppointments(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, ctx.actor.kind === "patient" ? "owner" : "operational");
  return ctx.tx
    .select({ a: appointments, clinicianName: clinicians.displayName, credentials: clinicians.credentials })
    .from(appointments)
    .innerJoin(clinicians, eq(clinicians.id, appointments.clinicianId))
    .where(eq(appointments.caseId, caseId))
    .orderBy(desc(appointments.startsAt));
}

export async function upcomingAppointments(ctx: Ctx, opts: { clinicianId?: string | null; days: number }) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  const now = new Date();
  const until = new Date(now.getTime() + opts.days * 86_400_000);
  const conds = [eq(appointments.status, "booked"), gte(appointments.endsAt, now), lt(appointments.startsAt, until)];
  if (opts.clinicianId) conds.push(eq(appointments.clinicianId, opts.clinicianId));
  return ctx.tx.select({ a: appointments, clinicianName: clinicians.displayName }).from(appointments).innerJoin(clinicians, eq(clinicians.id, appointments.clinicianId)).where(and(...conds)).orderBy(appointments.startsAt);
}

export async function clinicianAvailability(ctx: Ctx, clinicianId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  return ctx.tx.select().from(availabilityRules).where(eq(availabilityRules.clinicianId, clinicianId)).orderBy(availabilityRules.weekday, availabilityRules.startMinute);
}

export async function setAvailability(ctx: Ctx, clinicianId: string, rules: { weekday: number; startMinute: number; endMinute: number; timeZone: string }[]) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin"]);
  if (ctx.actor.clinicianId !== clinicianId && !ctx.actor.roles.includes("admin")) throw invalid("You can only change your own availability.");
  for (const r of rules) {
    if (r.weekday < 0 || r.weekday > 6 || r.startMinute < 0 || r.endMinute > 1440 || r.startMinute >= r.endMinute) throw invalid("Availability times are not valid.");
  }
  await ctx.tx.delete(availabilityRules).where(eq(availabilityRules.clinicianId, clinicianId));
  if (rules.length) await ctx.tx.insert(availabilityRules).values(rules.map((r) => ({ ...r, clinicianId })));
  await audit(ctx, { action: "config.updated", subjectType: "availability", subjectId: clinicianId });
}
