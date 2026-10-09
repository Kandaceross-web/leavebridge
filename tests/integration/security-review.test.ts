import { describe, expect, it } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { as, staffActor, system } from "@/server/fixtures/journey";
import { recordSecurityReview, securityReviewStatus, securityReviewSummary } from "@/server/services/security-review";
import { approveAccessGrant, requestAccessGrant } from "@/server/services/admin";
import { auditEvents, complianceReviews } from "@/server/db/schema";
import { rejects, staff } from "./helpers";

const DAY = 86_400_000;

describe("monthly security review (SEC-13)", () => {
  it("is due when none was recorded in 30 days, and recording one clears the reminder", async () => {
    const s = await staff();
    const director = staffActor(s, "director");
    // Viewed from 31 days ahead, every review recorded so far (by any test) is older than 30 days.
    const later = new Date(Date.now() + 31 * DAY);
    expect((await as(director, (ctx) => securityReviewStatus(ctx, later))).due).toBe(true);

    // A self-approved emergency access grant shows in the counts.
    const before = await as(director, (ctx) => securityReviewSummary(ctx));
    const grantId = await as(director, (ctx) => requestAccessGrant(ctx, { caseId: null, reason: "Fictional monthly review coverage check", hours: 1 }));
    await as(director, (ctx) => approveAccessGrant(ctx, grantId));
    const summary = await as(director, (ctx) => securityReviewSummary(ctx));
    expect(summary.emergencyAccessApproved).toBe(before.emergencyAccessApproved + 1);
    expect(summary.emergencyAccessSelfApproved).toBe(before.emergencyAccessSelfApproved + 1);
    expect(summary.chainBrokenAt).toBeNull();

    const note = "Looked at grants and sign-ins; nothing to follow up.";
    await as(director, (ctx) => recordSecurityReview(ctx, { note }));
    const status = await as(director, (ctx) => securityReviewStatus(ctx));
    expect(status.due).toBe(false);
    expect(Date.now() - status.lastReviewAt!.getTime()).toBeLessThan(60_000);
    // Still clear for the rest of the 30 days, and due again after.
    expect((await as(director, (ctx) => securityReviewStatus(ctx, new Date(Date.now() + 29 * DAY)))).due).toBe(false);
    expect((await as(director, (ctx) => securityReviewStatus(ctx, later))).due).toBe(true);

    // The audit event holds counts and the note's length only, never the note itself.
    const [event] = await as(system, (ctx) =>
      ctx.tx.select().from(auditEvents).where(and(eq(auditEvents.action, "security_review.completed"), eq(auditEvents.actorUserId, s.userIds.director))).orderBy(desc(auditEvents.id)).limit(1),
    );
    expect(event?.metadata).toMatchObject({ chainIntact: true, noteLength: note.length, emergencyAccessSelfApproved: summary.emergencyAccessSelfApproved });
    expect(JSON.stringify(event?.metadata)).not.toContain("follow up");
    // The note is kept with the compliance reviews instead.
    const [kept] = await as(system, (ctx) => ctx.tx.select().from(complianceReviews).where(eq(complianceReviews.subjectId, "monthly-security-review")).orderBy(desc(complianceReviews.createdAt)).limit(1));
    expect(kept?.notes).toBe(note);

    // Admin and compliance can record it too, without a note.
    for (const role of ["admin", "compliance"] as const) await as(staffActor(s, role), (ctx) => recordSecurityReview(ctx, { note: "" }));
  });

  it("can't be recorded or read by roles without oversight access, or without MFA", async () => {
    const s = await staff();
    for (const role of ["support", "billing", "clinician"] as const) {
      await rejects(as(staffActor(s, role), (ctx) => recordSecurityReview(ctx, { note: "" })), "forbidden");
      await rejects(as(staffActor(s, role), (ctx) => securityReviewStatus(ctx)), "forbidden");
      await rejects(as(staffActor(s, role), (ctx) => securityReviewSummary(ctx)), "forbidden");
    }
    await rejects(as(staffActor(s, "admin", { mfa: false }), (ctx) => recordSecurityReview(ctx, { note: "" })), "mfa_required");
    await rejects(as(staffActor(s, "admin"), (ctx) => recordSecurityReview(ctx, { note: "x".repeat(501) })));
  });
});
