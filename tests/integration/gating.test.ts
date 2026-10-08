import { describe, expect, it } from "vitest";
import { advanceClinical, advancePatient, as, caseRow, runScreening, staffActor, system } from "@/server/fixtures/journey";
import { promoteScreeningToCase } from "@/server/services/accounts";
import { startCheckout } from "@/server/services/payments";
import { signStageConsents } from "@/server/services/consents";
import { saveIntakeSection } from "@/server/services/intake";
import { submitCase } from "@/server/services/cases";
import { decideScreeningReview } from "@/server/services/clinical";
import { safetyEvents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { newPatient, rejects, staff } from "./helpers";

describe("client cannot bypass required consent or steps", () => {
  it("blocks payment until financial policies are signed", async () => {
    const p = await newPatient("Consent", "Payment");
    await advancePatient(p, "identity");
    const err = await rejects(as(p.actor, (ctx) => startCheckout(ctx, p.caseId)), "invalid");
    expect(err.message).toMatch(/financial policies/);
  });

  it("requires the typed legal name and the current consent versions", async () => {
    const p = await newPatient("Typed", "Name");
    await advancePatient(p, "identity");
    await rejects(as(p.actor, (ctx) => signStageConsents(ctx, p.caseId, "payment", { typedName: "Someone Else", versionIds: [], legalName: p.legalName, sessionMfa: false })), "invalid");
    const stale = await rejects(as(p.actor, (ctx) => signStageConsents(ctx, p.caseId, "payment", { typedName: p.legalName, versionIds: [], legalName: p.legalName, sessionMfa: false })), "invalid");
    expect(stale.message).toMatch(/updated/);
  });

  it("blocks intake until care consents are signed, and submission until measures are done", async () => {
    const p = await newPatient("Intake", "Gate");
    await advancePatient(p, "payment");
    await rejects(as(p.actor, (ctx) => saveIntakeSection(ctx, p.caseId, "concern", { presenting_concern: "Fictional" })), "invalid");
    await advancePatient(p, "intake", { from: "consents_intake" });
    const err = await rejects(as(p.actor, (ctx) => submitCase(ctx, p.caseId)), "invalid");
    expect(err.message).toMatch(/questionnaires/);
  });
});

describe("screening outcomes", () => {
  it("never routes an emergency into the routine workflow", async () => {
    const { screening, outcome } = await runScreening({ safety_now: "yes" });
    expect(outcome).toBe("EMERGENCY");
    const events = await as(system, (ctx) => ctx.tx.select().from(safetyEvents).where(eq(safetyEvents.screeningId, screening.id)));
    expect(events).toHaveLength(1);
    await rejects(as(system, (ctx) => promoteScreeningToCase(ctx, screening, "00000000-0000-0000-0000-000000000000")), "invalid");
  });

  it("NOT_AVAILABLE outcomes cannot create a case", async () => {
    const { screening, outcome } = await runScreening({ current_state: "NY", appointment_state: "NY" });
    expect(outcome).toBe("NOT_AVAILABLE");
    await rejects(as(system, (ctx) => promoteScreeningToCase(ctx, screening, "00000000-0000-0000-0000-000000000000")), "invalid");
  });

  it("NEEDS_REVIEW blocks payment until a clinician clears it", async () => {
    const s = await staff();
    const p = await newPatient("Needs", "Review", { previous_leave: "recert" });
    expect((await caseRow(p.caseId)).screeningReview).toBe("pending");
    await advancePatient(p, "consents_payment");
    await rejects(as(p.actor, (ctx) => startCheckout(ctx, p.caseId)), "invalid");
    await rejects(as(staffActor(s, "support"), (ctx) => decideScreeningReview(ctx, p.caseId, "cleared", "Fictional note")), "forbidden");
    await as(staffActor(s, "clinician"), (ctx) => decideScreeningReview(ctx, p.caseId, "cleared", "Fictional: recert request reviewed."));
    await advancePatient(p, "payment", { from: "payment" });
    expect((await caseRow(p.caseId)).status).toBe("intake_incomplete");
  });

  it("a safety answer in intake raises a safety event and marks the case urgent", async () => {
    const s = await staff();
    const p = await newPatient("Safety", "Flag");
    await advancePatient(p, "submit", { safetyInIntake: true });
    const row = await caseRow(p.caseId);
    expect(row.priority).toBe("urgent");
    const events = await as(system, (ctx) => ctx.tx.select().from(safetyEvents).where(eq(safetyEvents.caseId, p.caseId)));
    expect(events.length).toBeGreaterThan(0);
    void s;
    void advanceClinical;
  });
});
