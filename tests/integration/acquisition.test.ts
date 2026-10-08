import { describe, expect, it } from "vitest";
import { advancePatient, as, caseRow, registerPatient, runScreening, staffActor } from "@/server/fixtures/journey";
import { acquisitionFunnel, unservedDemand } from "@/server/services/acquisition";
import { nextAttribution, touchFromRequest, type StoredAttribution } from "@/domain/attribution";
import { rejects, staff } from "./helpers";

function attribution(qs: string, entry: string): StoredAttribution {
  const touch = touchFromRequest({ params: new URLSearchParams(qs), referrer: null, ownHosts: [], landingPath: "/" });
  return { ...nextAttribution(null, touch, "/")!, entry };
}

describe("first-party acquisition reporting", () => {
  it("carries attribution from screening to case and counts the funnel by campaign, excluding emergencies", async () => {
    const s = await staff();
    const campaign = `test-${Date.now().toString(36)}`;
    const a = attribution(`utm_source=google&utm_medium=cpc&utm_campaign=${campaign}`, "home-hero");

    const paidRun = await runScreening({}, null, a);
    const p = await registerPatient(paidRun.screening, { first: "Una", last: "Attribution" });
    await advancePatient(p, "payment");
    const c = await caseRow(p.caseId);
    expect(c.attribution?.last.campaign).toBe(campaign);
    expect(c.attribution?.entry).toBe("home-hero");

    for (let i = 0; i < 5; i++) await runScreening({ current_state: "AL", appointment_state: "AL" }, null, a);
    await runScreening({ safety_now: "yes" }, null, a);

    const admin = staffActor(s, "admin");
    const report = await as(admin, (ctx) => acquisitionFunnel(ctx, { days: 1, by: "campaign", touch: "last" }));
    const row = report.rows.find((r) => r.key === campaign)!;
    expect(row.started).toBe(6); // the emergency screening is not counted
    expect(row.notAvailable).toBe(5);
    expect(row.accounts).toBe(1);
    expect(row.paid).toBe(1);
    expect(row.revenueCents).toBeGreaterThan(0);

    const unserved = await as(admin, (ctx) => unservedDemand(ctx, 1));
    expect(Number(unserved.find((u) => u.state === "AL")?.n)).toBeGreaterThanOrEqual(5);
  });

  it("is limited to admins", async () => {
    const s = await staff();
    for (const role of ["support", "billing", "clinician", "compliance"] as const) {
      await rejects(as(staffActor(s, role), (ctx) => acquisitionFunnel(ctx, { days: 30, by: "channel", touch: "last" })));
    }
  });
});
