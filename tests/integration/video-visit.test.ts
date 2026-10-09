import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { advanceClinical, advancePatient, as, staffActor, system } from "@/server/fixtures/journey";
import { clinicianJoinAppointment, joinAppointment } from "@/server/services/scheduling";
import { appointments, auditEvents, locationAttestations } from "@/server/db/schema";
import { newPatient, rejects, staff } from "./helpers";

describe("video visit join check (stub provider)", () => {
  it("issues a join only to the case's patient and booked clinician, inside the window, from a served state", async () => {
    const s = await staff();
    const p = await newPatient("Visit", "Join");
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "book");
    const appt = await as(system, async (ctx) => (await ctx.tx.select().from(appointments).where(eq(appointments.caseId, p.caseId)).limit(1))[0]!);
    const clinician = staffActor(s, "clinician");

    // Booked days ahead: the room is not open yet, for either side, and no location is recorded.
    expect(await as(p.actor, (ctx) => joinAppointment(ctx, appt.id, appt.jurisdictionCode))).toEqual({ allowed: false, reason: "early" });
    expect(await as(clinician, (ctx) => clinicianJoinAppointment(ctx, appt.id))).toEqual({ allowed: false, reason: "early" });

    // Move the visit to now (fictional data) and join.
    const startsAt = new Date(Date.now() - 5 * 60_000);
    await as(system, (ctx) => ctx.tx.update(appointments).set({ startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000) }).where(eq(appointments.id, appt.id)));
    expect(await as(p.actor, (ctx) => joinAppointment(ctx, appt.id, "WY"))).toEqual({ allowed: false, reason: "location" });
    expect(await as(p.actor, (ctx) => joinAppointment(ctx, appt.id, appt.jurisdictionCode))).toEqual({ allowed: true, video: null });
    expect(await as(clinician, (ctx) => clinicianJoinAppointment(ctx, appt.id))).toEqual({ allowed: true, video: null });

    // Nobody else gets in: another clinician, staff without a clinical role, or another patient.
    await rejects(as(staffActor(s, "clinician2"), (ctx) => clinicianJoinAppointment(ctx, appt.id)));
    await rejects(as(staffActor(s, "support"), (ctx) => clinicianJoinAppointment(ctx, appt.id)), "forbidden");
    const other = await newPatient("Other", "Patient");
    await rejects(as(other.actor, (ctx) => joinAppointment(ctx, appt.id, appt.jurisdictionCode)), "not_found");
    await rejects(as(clinician, (ctx) => joinAppointment(ctx, appt.id, appt.jurisdictionCode)), "forbidden");

    const attested = await as(system, (ctx) => ctx.tx.select().from(locationAttestations).where(and(eq(locationAttestations.appointmentId, appt.id), eq(locationAttestations.context, "appointment_join"))));
    expect(attested.map((a) => a.stateCode).sort()).toEqual([appt.jurisdictionCode, "WY"].sort());
    const joins = await as(system, (ctx) => ctx.tx.select().from(auditEvents).where(and(eq(auditEvents.action, "appointment.joined"), eq(auditEvents.subjectId, appt.id))));
    expect(joins.map((j) => j.outcome).sort()).toEqual(["allowed", "allowed", "denied", "denied", "denied"]);

    // Past the window it closes again.
    const past = new Date(Date.now() - 3 * 3_600_000);
    await as(system, (ctx) => ctx.tx.update(appointments).set({ startsAt: past, endsAt: new Date(past.getTime() + 30 * 60_000) }).where(eq(appointments.id, appt.id)));
    expect(await as(p.actor, (ctx) => joinAppointment(ctx, appt.id, appt.jurisdictionCode))).toEqual({ allowed: false, reason: "closed" });
  });
});
