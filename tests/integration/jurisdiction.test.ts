import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { advanceClinical, advancePatient, as, staffActor, system } from "@/server/fixtures/journey";
import { availableSlots, bookAppointment } from "@/server/services/scheduling";
import { assignClinician } from "@/server/services/clinical";
import { setCredentialStatus, setJurisdictionActive } from "@/server/services/admin";
import { checkCanServe } from "@/server/services/jurisdiction";
import { compactPrivileges, licenses } from "@/server/db/schema";
import { newPatient, rejects, staff } from "./helpers";

describe("jurisdiction and credential enforcement", () => {
  it("states without an approved review cannot be activated", async () => {
    const s = await staff();
    await rejects(as(staffActor(s, "admin"), (ctx) => setJurisdictionActive(ctx, "CO", true)), "invalid");
  });

  it("inactive states cannot schedule", async () => {
    const s = await staff();
    const p = await newPatient("Florida", "Patient", { current_state: "FL", appointment_state: "FL" });
    await advancePatient(p, "submit", {});
    await advanceClinical(s, p, "review_session", { clinician: "director" });
    expect((await as(p.actor, (ctx) => availableSlots(ctx, p.caseId))).length).toBeGreaterThan(0);
    const admin = staffActor(s, "admin");
    await as(admin, (ctx) => setJurisdictionActive(ctx, "FL", false));
    try {
      expect(await as(p.actor, (ctx) => availableSlots(ctx, p.caseId))).toEqual([]);
      await rejects(as(p.actor, (ctx) => bookAppointment(ctx, p.caseId, new Date(Date.now() + 3 * 86_400_000).toISOString())), "invalid");
    } finally {
      await as(admin, (ctx) => setJurisdictionActive(ctx, "FL", true));
    }
  });

  it("an expired or suspended privilege blocks new appointments and assignment", async () => {
    const s = await staff();
    const priv = await as(system, async (ctx) => (await ctx.tx.select().from(compactPrivileges).where(and(eq(compactPrivileges.clinicianId, s.clinicianIds.director), eq(compactPrivileges.remoteJurisdictionCode, "FL"))).limit(1))[0]!);
    const p = await newPatient("Privilege", "Expired", { current_state: "FL", appointment_state: "FL" });
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "review_session", { clinician: "director" });
    const admin = staffActor(s, "admin");
    await as(admin, (ctx) => setCredentialStatus(ctx, "privilege", priv.id, "expired"));
    try {
      expect(await as(p.actor, (ctx) => availableSlots(ctx, p.caseId))).toEqual([]);
      const can = await as(system, (ctx) => checkCanServe(ctx.tx, s.clinicianIds.director, s.serviceId, "FL", new Date()));
      expect(can.ok).toBe(false);
      const q = await newPatient("Privilege", "Second", { current_state: "FL", appointment_state: "FL" });
      await advancePatient(q, "submit");
      await rejects(as(staffActor(s, "director"), (ctx) => assignClinician(ctx, q.caseId, s.clinicianIds.director)), "invalid");
    } finally {
      await as(admin, (ctx) => setCredentialStatus(ctx, "privilege", priv.id, "active"));
    }
  });

  it("a license expiring soon only offers slots before it expires", async () => {
    const s = await staff();
    const lic = await as(system, async (ctx) => (await ctx.tx.select().from(licenses).where(eq(licenses.clinicianId, s.clinicianIds.clinician2)).limit(1))[0]!);
    const p = await newPatient("Expiring", "License");
    await advancePatient(p, "submit");
    await as(staffActor(s, "director"), (ctx) => assignClinician(ctx, p.caseId, s.clinicianIds.clinician2));
    const { recordClinicalReview } = await import("@/server/services/clinical");
    await as(staffActor(s, "clinician2"), (ctx) => recordClinicalReview(ctx, p.caseId, { outcome: "session_required", notes: "Fictional" }));
    const slots = await as(p.actor, (ctx) => availableSlots(ctx, p.caseId));
    for (const slot of slots) expect(slot.startsAt.toISOString().slice(0, 10) <= lic.expiresOn).toBe(true);
  });
});
