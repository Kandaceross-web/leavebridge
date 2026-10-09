import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { advanceClinical, advancePatient, as, staffActor } from "@/server/fixtures/journey";
import { loadCase, patientCases, statusHistory } from "@/server/services/cases";
import { caseAudit } from "@/server/services/admin";
import { getIntake } from "@/server/services/intake";
import { caseFiles, authorizeFileDownload } from "@/server/services/files";
import { listCaseNotes, openRequests, recordDetermination } from "@/server/services/clinical";
import { casePayments } from "@/server/services/payments";
import { threadMessages } from "@/server/services/messaging";
import { requestAccessGrant, approveAccessGrant } from "@/server/services/admin";
import { newPatient, rejects, staff } from "./helpers";

describe("client cannot access another client's information", () => {
  it("is enforced by the service layer and by Postgres row-level security", async () => {
    const a = await newPatient("Alice", "Isolation");
    const b = await newPatient("Bob", "Isolation");
    await advancePatient(a, "intake");

    await rejects(as(b.actor, (ctx) => loadCase(ctx, a.caseId, "owner")), "not_found");
    await rejects(as(b.actor, (ctx) => getIntake(ctx, a.caseId, "owner")));
    const mine = await as(b.actor, (ctx) => patientCases(ctx));
    expect(mine.map((r) => r.c.id)).toEqual([b.caseId]);

    // Even raw SQL as patient B sees none of A's rows (RLS, not application code).
    const raw = await as(b.actor, async (ctx) => {
      const q = async (t: string) => Number((await ctx.tx.execute(sql.raw(`select count(*)::int as n from ${t} where case_id = '${a.caseId}'`))).rows[0]!.n);
      return { intakes: await q("intakes"), files: await q("files"), consents: await q("consents"), payments: await q("payments"), history: await q("case_status_history") };
    });
    expect(raw).toEqual({ intakes: 0, files: 0, consents: 0, payments: 0, history: 0 });
    const casesSeen = await as(b.actor, async (ctx) => Number((await ctx.tx.execute(sql`select count(*)::int as n from cases`)).rows[0]!.n));
    expect(casesSeen).toBe(1);

    // A's ID document cannot be downloaded by B even with its id.
    const aFiles = await as(a.actor, (ctx) => caseFiles(ctx, a.caseId, { includeIdentity: true }));
    expect(aFiles.length).toBeGreaterThan(0);
    await rejects(as(b.actor, (ctx) => authorizeFileDownload(ctx, aFiles[0]!.id)));
  });

  it("case-scoped read helpers check access themselves, not only their callers", async () => {
    const s = await staff();
    const a = await newPatient("Ana", "Helpers");
    const b = await newPatient("Ben", "Helpers");
    await advancePatient(a, "submit");
    await rejects(as(b.actor, (ctx) => casePayments(ctx, a.caseId)));
    await rejects(as(b.actor, (ctx) => statusHistory(ctx, a.caseId)));
    await rejects(as(b.actor, (ctx) => openRequests(ctx, a.caseId)));
    await rejects(as(b.actor, (ctx) => caseFiles(ctx, a.caseId, { includeIdentity: false })));
    // Support may see operational notes but never clinical request text or the audit trail.
    const support = staffActor(s, "support");
    await rejects(as(support, (ctx) => openRequests(ctx, a.caseId)));
    await rejects(as(support, (ctx) => caseAudit(ctx, a.caseId)));
    const notes = await as(support, (ctx) => listCaseNotes(ctx, a.caseId, true));
    expect(notes.every((n) => n.visibility === "operational")).toBe(true);
  });

  it("anonymous visitors see no patient rows", async () => {
    const n = await as({ kind: "anonymous" }, async (ctx) => Number((await ctx.tx.execute(sql`select count(*)::int as n from patients`)).rows[0]!.n));
    expect(n).toBe(0);
  });
});

describe("clinician and staff access", () => {
  it("clinicians cannot access cases they are not assigned to", async () => {
    const s = await staff();
    const p = await newPatient("Carla", "Access");
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "review_session");
    const other = staffActor(s, "clinician2");
    await rejects(as(other, (ctx) => getIntake(ctx, p.caseId, "clinical")), "forbidden");
    await rejects(as(other, (ctx) => threadMessages(ctx, p.caseId, "clinical")), "forbidden");
    await rejects(as(other, (ctx) => recordDetermination(ctx, p.caseId, { decision: "DOCUMENTATION_CLINICALLY_SUPPORTED", rationale: "x".repeat(30), findings: "y".repeat(20), patientMessage: "z" })), "forbidden");
  });

  it("refuses an outcome message that still has a starting point's bracketed parts (CLN-10)", async () => {
    const s = await staff();
    const p = await newPatient("Bea", "Bracket");
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "review_session");
    const input = { decision: "ADDITIONAL_INFORMATION_REQUIRED", rationale: "x".repeat(30), findings: "y".repeat(20), patientMessage: "I need a little more. [Say what you need.]", requestMessage: "Fictional request" };
    await rejects(as(staffActor(s, "clinician"), (ctx) => recordDetermination(ctx, p.caseId, input)), "invalid");
  });

  it("operations staff cannot read protected clinical data without an approved grant", async () => {
    const s = await staff();
    const p = await newPatient("Dev", "Ops");
    await advancePatient(p, "submit");
    for (const role of ["support", "billing", "admin", "compliance"] as const) {
      await rejects(as(staffActor(s, role), (ctx) => getIntake(ctx, p.caseId, "clinical")), "forbidden");
    }
    // Break-glass: compliance requests, a director approves, then access is audited.
    const grantId = await as(staffActor(s, "compliance"), (ctx) => requestAccessGrant(ctx, { caseId: p.caseId, reason: "Fictional audit of record completeness", hours: 1 }));
    await as(staffActor(s, "director"), (ctx) => approveAccessGrant(ctx, grantId));
    const intake = await as(staffActor(s, "compliance"), (ctx) => getIntake(ctx, p.caseId, "clinical"));
    expect(intake.status).toBe("submitted");
  });

  it("requires MFA for clinical actions", async () => {
    const s = await staff();
    const p = await newPatient("Mfa", "Required");
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "assign");
    const noMfa = staffActor(s, "clinician", { mfa: false });
    await rejects(as(noMfa, (ctx) => recordDetermination(ctx, p.caseId, { decision: "DOCUMENTATION_NOT_CLINICALLY_SUPPORTED", rationale: "x".repeat(30), findings: "y".repeat(20), patientMessage: "z" })));
  });
});
