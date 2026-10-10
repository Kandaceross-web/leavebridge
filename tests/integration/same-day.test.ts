import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { as, runSameDayScreening, staffActor, system } from "@/server/fixtures/journey";
import { FIXTURE_PASSWORD } from "@/server/fixtures/reference";
import { signUp } from "@/server/services/accounts";
import { confirmEmail, verificationLinkUsable } from "@/server/services/email-verification";
import { ensureEstimate } from "@/server/services/estimates";
import { confirmSimulatedPayment } from "@/server/services/payments";
import {
  acknowledgeAndCheckout,
  chooseInstruments,
  completeSameDayScreening,
  decideHeldScreening,
  markFollowUpHandled,
  requestAssessmentFollowUp,
  saveFunctioning,
  sameDayOverview,
  sameDayQueues,
  sameDayReport,
  submitSameDayMeasure,
} from "@/server/services/same-day";
import {
  issueDocument,
  issuedFor,
  revokeIssuedDocument,
  verifyDocument,
} from "@/server/services/issued-documents";
import {
  approveWorkExcuse,
  claimWorkExcuse,
  declineWorkExcuse,
  requestWorkExcuse,
  workExcuseDetail,
} from "@/server/services/work-excuse";
import { authorizeFileDownload } from "@/server/services/files";
import { opsCases } from "@/server/services/ops";
import { outbox } from "@/server/providers/messaging";
import {
  automatedScreenings,
  cases,
  documents,
  issuedDocuments,
  patients,
  payments,
  safetyEvents,
  users,
  workExcuseRequests,
} from "@/server/db/schema";
import { verifyPdfSignature } from "@/server/signing";
import { lintTemplate } from "@/domain/notifications/templates";
import { DOCUMENT_NUMBER_RE } from "@/domain/same-day/rules";
import type { Actor } from "@/domain/actor";
import { rejects, staff } from "./helpers";

type PatientActor = Extract<Actor, { kind: "patient" }>;

const tag = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const WORK = {
  main_concerns: ["low_mood", "sleep"],
  symptom_duration: "1_3m",
  difficulty: "somewhat",
  work_status: "full",
  work_effect: "somewhat_less",
  work_areas: ["focus"],
  missed_days: "2",
  partial_days: "1",
  safety_now: "no",
};

const answers = (
  prefix: "phq9" | "gad7",
  n: number,
  value: number,
  over: Record<string, number> = {},
) =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [
      `${prefix}_${i + 1}`,
      over[`${prefix}_${i + 1}`] ?? value,
    ]),
  );

/** Health words and scores that must never appear in an ordinary email. */
const PHI_IN_EMAIL =
  /phq|gad|depress|anxi|suicid|self-harm|mental|screening|score|symptom|diagnos|safety|crisis|work excuse|letter|record|\b\d{1,2} of (27|21)\b/i;

/** Signs up through the real service (email not yet confirmed) and returns the patient, case and the emailed link token. */
async function signUpSameDay(first = "Avery") {
  const { screening, outcome } = await runSameDayScreening();
  expect(outcome).toBe("AVAILABLE");
  const email = `same-day-${tag()}@example.test`;
  const before = outbox.length;
  const { userId, caseId, sameDay } = await as(system, (ctx) =>
    signUp(
      ctx,
      {
        firstName: first,
        lastName: "Testcase",
        preferredName: "",
        email,
        password: FIXTURE_PASSWORD,
        dateOfBirth: "1990-02-03",
        timeZone: "America/Chicago",
        ageAttest: "on",
        termsAccept: "on",
      },
      screening,
    ),
  );
  expect(sameDay).toBe(true);
  await as(system, async (ctx) => {
    await ctx.tx.update(users).set({ isFixture: true }).where(eq(users.id, userId));
    await ctx.tx.update(cases).set({ isFixture: true }).where(eq(cases.id, caseId));
  });
  const [p] = await as(system, (ctx) =>
    ctx.tx.select().from(patients).where(eq(patients.userId, userId)).limit(1),
  );
  const actor: PatientActor = {
    kind: "patient",
    userId,
    patientId: p!.id,
    mfa: false,
    stepUpAt: null,
  };
  const mail = outbox
    .slice(before)
    .find((m) => m.to === email && m.templateKey === "email_verification")!;
  const token = /\/verify-email\/([A-Za-z0-9_-]+)/.exec(mail.body)?.[1];
  if (!token) throw new Error("No verification link");
  return { userId, caseId, actor, email, mail, token, screening };
}

async function pay(actor: PatientActor, caseId: string) {
  const estimateId = await as(
    actor,
    async (ctx) => (await ensureEstimate(ctx, (await sameDayOverview(ctx, caseId)).row)).row.id,
  );
  const url = await as(actor, (ctx) => acknowledgeAndCheckout(ctx, caseId, estimateId));
  const ref = new URL(url, "http://localhost").searchParams.get("ref")!;
  await as(actor, (ctx) => confirmSimulatedPayment(ctx, ref));
}

async function verifiedAndPaid(first = "Avery") {
  const p = await signUpSameDay(first);
  expect(await as(system, (ctx) => confirmEmail(ctx, p.token))).toBe(true);
  await pay(p.actor, p.caseId);
  return p;
}

async function finish(
  p: { actor: PatientActor; caseId: string },
  opts: { phq9_9?: number; safety?: string; instruments?: ("phq9" | "gad7")[] } = {},
) {
  const chosen = opts.instruments ?? ["phq9", "gad7"];
  await as(p.actor, (ctx) => chooseInstruments(ctx, p.caseId, chosen));
  if (chosen.includes("phq9"))
    await as(p.actor, (ctx) =>
      submitSameDayMeasure(
        ctx,
        p.caseId,
        "phq9",
        answers("phq9", 9, 1, { phq9_9: opts.phq9_9 ?? 0 }),
      ),
    );
  if (chosen.includes("gad7"))
    await as(p.actor, (ctx) => submitSameDayMeasure(ctx, p.caseId, "gad7", answers("gad7", 7, 1)));
  await as(p.actor, (ctx) =>
    saveFunctioning(ctx, p.caseId, { ...WORK, safety_now: opts.safety ?? "no" }),
  );
  return as(p.actor, (ctx) => completeSameDayScreening(ctx, p.caseId));
}

describe("Same-Day Mental Health Assessment: purchase to signed record", () => {
  it("verifies the email, takes payment, scores, issues a signed record and sends a PHI-free email", async () => {
    const s = await staff();
    const p = await signUpSameDay();

    // The account email asks only to confirm the address.
    expect(p.mail.subject).toBe("Confirm your email for LeaveBridge Health");
    expect(lintTemplate(`${p.mail.subject}\n${p.mail.body}`)).toEqual([]);
    expect(`${p.mail.subject}\n${p.mail.body}`).not.toMatch(PHI_IN_EMAIL);

    // A same-day case with its own state, no leave type, and nothing payable before the email is confirmed.
    const [c] = await as(system, (ctx) =>
      ctx.tx.select().from(cases).where(eq(cases.id, p.caseId)),
    );
    expect(c).toMatchObject({
      kind: "automated_screening",
      status: "started",
      requestedLeaveType: null,
    });
    await rejects(
      as(p.actor, (ctx) => acknowledgeAndCheckout(ctx, p.caseId, "")),
      "invalid",
    );

    // The link works once.
    expect(await as(system, (ctx) => verificationLinkUsable(ctx, p.token))).toBe(true);
    expect(await as(system, (ctx) => confirmEmail(ctx, p.token))).toBe(true);
    expect(await as(system, (ctx) => confirmEmail(ctx, p.token))).toBe(false);

    // Questionnaires stay closed until payment.
    await rejects(
      as(p.actor, (ctx) => chooseInstruments(ctx, p.caseId, ["phq9"])),
      "invalid",
    );
    await pay(p.actor, p.caseId);
    const [paid] = await as(system, (ctx) =>
      ctx.tx.select().from(payments).where(eq(payments.caseId, p.caseId)),
    );
    expect(paid).toMatchObject({ status: "paid", amountCents: 2999 });

    const before = outbox.length;
    const res = await finish(p);
    expect(res.outcome).toBe("issued");
    expect(await finish(p).catch((e) => (e as { code?: string }).code)).toBe("conflict");

    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.row.status).toBe("completed");
    expect(view.screening.status).toBe("issued");
    expect(view.summary?.scores.map((x) => x.total)).toEqual([8, 7]);
    const record = view.record!;
    expect(record.publicId).toMatch(DOCUMENT_NUMBER_RE);
    expect(record.status).toBe("valid");
    expect(Math.abs(record.issuedAt.getTime() - Date.now())).toBeLessThan(60_000);

    // The stored PDF is the signed file, unchanged on every download.
    const file = await as(p.actor, (ctx) => authorizeFileDownload(ctx, record.fileId));
    const again = await as(p.actor, (ctx) => authorizeFileDownload(ctx, record.fileId));
    expect(file.data.equals(again.data)).toBe(true);
    expect(file.mime).toBe("application/pdf");
    expect(verifyPdfSignature(file.data)).toMatchObject({
      ok: true,
      fingerprint: record.signingCertFingerprint,
    });
    const text = file.data.toString("latin1");
    expect(text).toContain("/adbe.pkcs7.detached");
    // Another patient cannot download it.
    const other = await signUpSameDay("Blake");
    await rejects(as(other.actor, (ctx) => authorizeFileDownload(ctx, record.fileId)));

    // The "ready" email names no health information.
    const ready = outbox.slice(before).filter((m) => m.channel === "email" && m.to === p.email);
    expect(ready.length).toBeGreaterThan(0);
    for (const m of ready) {
      expect(`${m.subject}\n${m.body}`).not.toMatch(PHI_IN_EMAIL);
      expect(m.body).not.toContain(record.publicId);
    }

    // Issuing again for the same screening returns the same document (no second signed copy).
    const again2 = await as(p.actor, async (ctx) =>
      issueDocument(ctx, {
        caseRow: view.row,
        kind: "automated_screening_record",
        sourceId: view.screening.id,
        title: "x",
        subtitle: "x",
        facts: [],
        sections: [],
        closing: [],
        issuerClinicianId: null,
        fileName: "x.pdf",
      }),
    );
    expect(again2.id).toBe(record.id);

    // Ops sees counts; the automated case stays out of the clinical pipeline.
    const admin = staffActor(s, "admin");
    const report = await as(admin, (ctx) => sameDayReport(ctx));
    expect(report.completed).toBeGreaterThan(0);
    const pipeline = await as(admin, (ctx) => opsCases(ctx, { includeClosed: true }));
    expect(pipeline.some((x) => x.id === p.caseId)).toBe(false);
  });

  it("public verification shows status only, detects altered copies, and reflects revocation", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Casey");
    await finish(p, { instruments: ["gad7"] });
    const { record, row } = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    const [pt] = await as(system, (ctx) =>
      ctx.tx.select().from(patients).where(eq(patients.id, p.actor.patientId)),
    );

    const v = await verifyDocument(record!.publicId.toLowerCase().replace(/-/g, " "));
    expect(v).toMatchObject({
      found: true,
      status: "valid",
      kind: "automated_screening_record",
      documentNumber: record!.publicId,
    });
    expect(v.issuer?.clinician).toBeNull();
    const json = JSON.stringify(v);
    for (const secret of [
      pt!.legalFirstName,
      pt!.legalLastName,
      "1990",
      row.reference,
      "GAD",
      "score",
      p.email,
      p.caseId,
    ])
      expect(json).not.toContain(secret);
    expect(await verifyDocument("LB-0000-0000-0000-0000-0000")).toMatchObject({ found: false });
    expect(await verifyDocument("not a number")).toEqual({ found: false, documentNumber: null });

    // Byte-identical copy matches; a changed copy does not.
    const original = (await as(p.actor, (ctx) => authorizeFileDownload(ctx, record!.fileId))).data;
    expect((await verifyDocument(record!.publicId, original)).file).toEqual({
      matches: true,
      signature: "valid",
    });
    const tampered = Buffer.from(original);
    tampered[200] = tampered[200]! ^ 1;
    expect((await verifyDocument(record!.publicId, tampered)).file).toEqual({
      matches: false,
      signature: "invalid",
    });

    // The issue time and content cannot be changed in the database, not even by the system.
    await rejects(
      as(system, (ctx) =>
        ctx.tx
          .update(issuedDocuments)
          .set({ issuedAt: new Date("2020-01-01") })
          .where(eq(issuedDocuments.id, record!.id)),
      ),
    );
    await rejects(
      as(system, (ctx) =>
        ctx.tx
          .update(issuedDocuments)
          .set({ sha256: "0".repeat(64) })
          .where(eq(issuedDocuments.id, record!.id)),
      ),
    );
    await rejects(
      as(system, (ctx) => ctx.tx.delete(issuedDocuments).where(eq(issuedDocuments.id, record!.id))),
    );

    // Revocation needs a clinical or admin role, MFA, a fresh step-up and a reason.
    await rejects(
      as(staffActor(s, "support"), (ctx) =>
        revokeIssuedDocument(ctx, record!.id, "Issued in error"),
      ),
      "forbidden",
    );
    await rejects(
      as(staffActor(s, "admin", { stepUp: false }), (ctx) =>
        revokeIssuedDocument(ctx, record!.id, "Issued in error"),
      ),
      "step_up_required",
    );
    await rejects(
      as(staffActor(s, "admin"), (ctx) => revokeIssuedDocument(ctx, record!.id, "no")),
      "invalid",
    );
    await as(staffActor(s, "admin"), (ctx) =>
      revokeIssuedDocument(ctx, record!.id, "Issued in error during testing"),
    );
    const revoked = await verifyDocument(record!.publicId);
    expect(revoked).toMatchObject({ found: true, status: "revoked" });
    expect(JSON.stringify(revoked)).not.toContain("Issued in error");
    await rejects(
      as(p.actor, (ctx) => authorizeFileDownload(ctx, record!.fileId)),
      "forbidden",
    );
    // Revoked stays revoked.
    await rejects(
      as(system, (ctx) =>
        ctx.tx
          .update(issuedDocuments)
          .set({ status: "valid" })
          .where(eq(issuedDocuments.id, record!.id)),
      ),
    );
    // A letter can't be requested from a revoked record.
    await rejects(
      as(p.actor, (ctx) =>
        requestWorkExcuse(ctx, p.caseId, {
          setting: "work",
          startDate: new Date().toISOString().slice(0, 10),
          endDate: new Date().toISOString().slice(0, 10),
        }),
      ),
      "invalid",
    );
  });

  it("holds the record, alerts clinicians and flags the payment when PHQ-9 item 9 is positive", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Drew");
    const before = outbox.length;
    await as(p.actor, (ctx) => chooseInstruments(ctx, p.caseId, ["phq9"]));
    const measure = await as(p.actor, (ctx) =>
      submitSameDayMeasure(ctx, p.caseId, "phq9", answers("phq9", 9, 0, { phq9_9: 1 })),
    );
    expect(measure.safety).toBe(true);
    // Raised and alerted as soon as the answer is saved, even before the patient finishes.
    const events = await as(system, (ctx) =>
      ctx.tx.select().from(safetyEvents).where(eq(safetyEvents.caseId, p.caseId)),
    );
    expect(events.map((e) => e.rule)).toEqual(["same_day:PHQ9_ITEM9"]);
    const alerts = outbox.slice(before).filter((m) => m.templateKey === "staff_safety");
    expect(alerts.length).toBeGreaterThan(0);
    for (const m of alerts)
      expect(`${m.subject}\n${m.body}`).not.toMatch(
        /phq|suicid|self-harm|item 9|Drew|Testcase|LB-/i,
      );

    await as(p.actor, (ctx) => saveFunctioning(ctx, p.caseId, WORK));
    const res = await as(p.actor, (ctx) => completeSameDayScreening(ctx, p.caseId));
    expect(res.outcome).toBe("held");
    // No duplicate event or second alert for the same answer.
    expect(
      (
        await as(system, (ctx) =>
          ctx.tx.select().from(safetyEvents).where(eq(safetyEvents.caseId, p.caseId)),
        )
      ).length,
    ).toBe(1);

    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.row.status).toBe("safety_hold");
    expect(view.screening.status).toBe("held_for_review");
    expect(view.screening.refundReview).toBe("flagged");
    expect(view.record).toBeNull();
    expect(view.summary).toBeNull();
    const [pay] = await as(system, (ctx) =>
      ctx.tx.select().from(payments).where(eq(payments.caseId, p.caseId)),
    );
    expect(pay!.status).toBe("paid");

    // Support sees the hold but not why.
    const q = await as(staffActor(s, "support"), (ctx) => sameDayQueues(ctx));
    expect(q.held.find((h) => h.caseId === p.caseId)?.holdLabels).toEqual([]);
    const qc = await as(staffActor(s, "clinician"), (ctx) => sameDayQueues(ctx));
    expect(qc.held.find((h) => h.caseId === p.caseId)?.holdLabels[0]).toMatch(/item 9/);

    // Only a clinician decides; issuing releases the unchanged automated record and closes the event.
    await rejects(
      as(staffActor(s, "admin"), (ctx) =>
        decideHeldScreening(ctx, p.caseId, "issue", "Spoke with patient"),
      ),
      "forbidden",
    );
    await as(staffActor(s, "clinician"), (ctx) =>
      decideHeldScreening(
        ctx,
        p.caseId,
        "issue",
        "Called the patient; safety plan reviewed. Fictional note.",
      ),
    );
    const after = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(after.row.status).toBe("completed");
    expect(after.record?.status).toBe("valid");
    const open = await as(system, (ctx) =>
      ctx.tx
        .select()
        .from(safetyEvents)
        .where(and(eq(safetyEvents.caseId, p.caseId))),
    );
    expect(open.every((e) => e.acknowledgedAt)).toBe(true);
  });

  it("holds when the immediate-safety question is answered 'yes' and can be closed without a record", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Emery");
    const res = await finish(p, { instruments: ["gad7"], safety: "yes" });
    expect(res.outcome).toBe("held");
    await as(staffActor(s, "clinician"), (ctx) =>
      decideHeldScreening(
        ctx,
        p.caseId,
        "close",
        "Referred to local crisis services. Fictional note.",
      ),
    );
    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.row.status).toBe("closed");
    expect(view.record).toBeNull();
    const [s2] = await as(system, (ctx) =>
      ctx.tx.select().from(automatedScreenings).where(eq(automatedScreenings.caseId, p.caseId)),
    );
    expect(s2!.status).toBe("closed");
  });
});

describe("work excuse letters", () => {
  const today = () => new Date().toISOString().slice(0, 10);
  const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  it("is one request per screening, never issued without clinician approval, then signed and delivered", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Finley");
    await finish(p);
    const before = outbox.length;
    await as(p.actor, (ctx) =>
      requestWorkExcuse(ctx, p.caseId, {
        setting: "work",
        startDate: today(),
        endDate: plusDays(2),
        returnDate: plusDays(3),
        note: "Fictional note.",
      }),
    );
    await rejects(
      as(p.actor, (ctx) =>
        requestWorkExcuse(ctx, p.caseId, {
          setting: "work",
          startDate: today(),
          endDate: plusDays(1),
        }),
      ),
      "conflict",
    );
    const [req] = await as(system, (ctx) =>
      ctx.tx.select().from(workExcuseRequests).where(eq(workExcuseRequests.caseId, p.caseId)),
    );
    expect(req!.status).toBe("requested");
    // The database also refuses a second request for the same screening.
    await rejects(
      as(system, (ctx) =>
        ctx.tx
          .insert(workExcuseRequests)
          .values({
            caseId: p.caseId,
            automatedScreeningId: req!.automatedScreeningId,
            patientInput: "x",
            proposedDraft: "x",
          }),
      ),
    );

    // Clinicians are told a request is waiting, without details.
    const alerts = outbox.slice(before).filter((m) => m.templateKey === "staff_letter_request");
    expect(alerts.length).toBeGreaterThan(0);
    for (const m of alerts) expect(m.body).not.toMatch(/Finley|Testcase|excuse|PHQ|GAD/i);

    // Nothing is issued until a clinician approves.
    expect(await as(system, (ctx) => issuedFor(ctx, "work_excuse_letter", req!.id))).toBeNull();
    // Before taking the request a clinician sees no clinical content.
    const limited = await as(staffActor(s, "clinician"), (ctx) => workExcuseDetail(ctx, req!.id));
    expect(limited.limited).toBe(true);
    expect(JSON.stringify(limited)).not.toMatch(/Finley|letter_body|PHQ|GAD/);
    await rejects(
      as(staffActor(s, "clinician"), (ctx) => approveWorkExcuse(ctx, req!.id, {}, true)),
      "forbidden",
    ); // not assigned
    await rejects(
      as(staffActor(s, "support"), (ctx) => claimWorkExcuse(ctx, req!.id)),
      "forbidden",
    );
    await as(staffActor(s, "clinician"), (ctx) => claimWorkExcuse(ctx, req!.id));
    const detail = await as(staffActor(s, "clinician"), (ctx) => workExcuseDetail(ctx, req!.id));
    if (detail.limited) throw new Error("expected full detail after claiming");
    expect(detail.isAssignedToMe).toBe(true);
    expect(detail.proposed.letter_body).toContain("Finley Testcase");
    expect(detail.summary?.scores.length).toBe(2);
    const fields = { ...detail.proposed } as unknown as Record<string, string>;
    await rejects(
      as(staffActor(s, "clinician", { stepUp: false }), (ctx) =>
        approveWorkExcuse(ctx, req!.id, fields, true),
      ),
      "step_up_required",
    );
    await rejects(
      as(staffActor(s, "clinician", { mfa: false }), (ctx) =>
        approveWorkExcuse(ctx, req!.id, fields, true),
      ),
      "mfa_required",
    );
    await rejects(
      as(staffActor(s, "clinician"), (ctx) => approveWorkExcuse(ctx, req!.id, fields, false)),
      "invalid",
    );
    await rejects(
      as(staffActor(s, "clinician2"), (ctx) => approveWorkExcuse(ctx, req!.id, fields, true)),
      "forbidden",
    );
    expect(await as(system, (ctx) => issuedFor(ctx, "work_excuse_letter", req!.id))).toBeNull();

    // The clinician edits and approves: their version is signed, the PDF issued and delivered.
    const mailBefore = outbox.length;
    const edited = {
      ...fields,
      letter_body: `${fields.letter_body}\n\nClinician edit (fictional).`,
    };
    await as(staffActor(s, "clinician"), (ctx) => approveWorkExcuse(ctx, req!.id, edited, true));
    const letter = await as(system, (ctx) => issuedFor(ctx, "work_excuse_letter", req!.id));
    expect(letter).toMatchObject({
      kind: "work_excuse_letter",
      status: "valid",
      issuerClinicianId: s.clinicianIds.clinician,
    });
    const pdf = await as(p.actor, (ctx) => authorizeFileDownload(ctx, letter!.fileId));
    expect(verifyPdfSignature(pdf.data).ok).toBe(true);
    const v = await verifyDocument(letter!.publicId);
    expect(v).toMatchObject({ found: true, status: "valid", kind: "work_excuse_letter" });
    expect(v.issuer?.clinician).toBeTruthy();
    // Only initials and the excused dates, so a recipient can spot an edited copy; no name or health details.
    expect(JSON.stringify(v)).not.toMatch(/Finley|Testcase|PHQ|GAD/);
    expect(v.detail).toEqual([
      "Patient initials: F. T.",
      expect.stringMatching(/^Excused from work: .+ through .+$/),
    ]);
    await rejects(
      as(system, (ctx) =>
        ctx.tx
          .update(issuedDocuments)
          .set({ publicDetail: ["Patient initials: X. Y."] })
          .where(eq(issuedDocuments.id, letter!.id)),
      ),
    );
    for (const m of outbox.slice(mailBefore).filter((x) => x.to === p.email))
      expect(`${m.subject}\n${m.body}`).not.toMatch(PHI_IN_EMAIL);

    // Decided requests cannot be approved or declined again.
    await rejects(
      as(staffActor(s, "clinician"), (ctx) => approveWorkExcuse(ctx, req!.id, edited, true)),
      "conflict",
    );
    await rejects(
      as(staffActor(s, "clinician"), (ctx) =>
        declineWorkExcuse(ctx, req!.id, "Changed my mind about this.", false),
      ),
      "conflict",
    );
    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.letter).toMatchObject({ status: "approved" });
  });

  it("can be declined with a message and needs an issued record first", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Gray");
    await as(p.actor, (ctx) => chooseInstruments(ctx, p.caseId, ["gad7"]));
    await rejects(
      as(p.actor, (ctx) =>
        requestWorkExcuse(ctx, p.caseId, { setting: "work", startDate: today(), endDate: today() }),
      ),
      "invalid",
    );
    await as(p.actor, (ctx) => submitSameDayMeasure(ctx, p.caseId, "gad7", answers("gad7", 7, 0)));
    await as(p.actor, (ctx) => saveFunctioning(ctx, p.caseId, WORK));
    await as(p.actor, (ctx) => completeSameDayScreening(ctx, p.caseId));
    const out = await as(p.actor, (ctx) =>
      requestWorkExcuse(ctx, p.caseId, {
        setting: "work",
        startDate: today(),
        endDate: plusDays(60),
      }),
    );
    expect(out.errors.endDate).toBeDefined();
    await as(p.actor, (ctx) =>
      requestWorkExcuse(ctx, p.caseId, {
        setting: "work",
        startDate: today(),
        endDate: plusDays(1),
      }),
    );
    const [req] = await as(system, (ctx) =>
      ctx.tx.select().from(workExcuseRequests).where(eq(workExcuseRequests.caseId, p.caseId)),
    );
    await as(staffActor(s, "clinician"), (ctx) => claimWorkExcuse(ctx, req!.id));
    await rejects(
      as(staffActor(s, "clinician"), (ctx) => declineWorkExcuse(ctx, req!.id, "short", true)),
      "invalid",
    );
    await as(staffActor(s, "clinician"), (ctx) =>
      declineWorkExcuse(
        ctx,
        req!.id,
        "A full assessment is the better next step for this request.",
        true,
      ),
    );
    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.letter).toMatchObject({
      status: "declined",
      recommendAssessment: true,
      declineMessage: "A full assessment is the better next step for this request.",
    });
    expect(await as(system, (ctx) => issuedFor(ctx, "work_excuse_letter", req!.id))).toBeNull();
  });

  it("issues a school letter when the patient asks for school, and the verify page says school", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Indigo");
    await finish(p);
    await as(p.actor, (ctx) =>
      requestWorkExcuse(ctx, p.caseId, {
        setting: "school",
        startDate: today(),
        endDate: plusDays(1),
        returnDate: plusDays(2),
      }),
    );
    const [req] = await as(system, (ctx) =>
      ctx.tx.select().from(workExcuseRequests).where(eq(workExcuseRequests.caseId, p.caseId)),
    );
    await as(staffActor(s, "clinician"), (ctx) => claimWorkExcuse(ctx, req!.id));
    const detail = await as(staffActor(s, "clinician"), (ctx) => workExcuseDetail(ctx, req!.id));
    if (detail.limited) throw new Error("expected full detail after claiming");
    expect(detail.input.setting).toBe("school");
    expect(detail.proposed.excused_setting).toBe("school");
    expect(detail.proposed.letter_body).toMatch(/excused from school/);
    const fields = { ...detail.proposed } as unknown as Record<string, string>;
    await rejects(
      as(staffActor(s, "clinician"), (ctx) =>
        approveWorkExcuse(ctx, req!.id, { ...fields, excused_setting: "gym" }, true),
      ),
      "invalid",
    );
    await as(staffActor(s, "clinician"), (ctx) => approveWorkExcuse(ctx, req!.id, fields, true));
    const letter = await as(system, (ctx) => issuedFor(ctx, "work_excuse_letter", req!.id));
    expect(letter).toMatchObject({ status: "valid" });
    const [doc] = await as(system, (ctx) =>
      ctx.tx.select().from(documents).where(eq(documents.caseId, p.caseId)),
    );
    expect(doc!.title).toBe("School Excuse Letter");
    const v = await verifyDocument(letter!.publicId);
    expect(v.detail).toEqual([
      "Patient initials: I. T.",
      expect.stringMatching(/^Excused from school: .+ through .+$/),
    ]);
  });
});

describe("asking about a full assessment", () => {
  it("is opt-in after the record is issued, alerts staff without details, and can be marked contacted", async () => {
    const s = await staff();
    const p = await verifiedAndPaid("Hollis");
    await rejects(
      as(p.actor, (ctx) => requestAssessmentFollowUp(ctx, p.caseId)),
      "invalid",
    );
    await finish(p);
    const before = outbox.length;
    await as(p.actor, (ctx) => requestAssessmentFollowUp(ctx, p.caseId));
    await as(p.actor, (ctx) => requestAssessmentFollowUp(ctx, p.caseId));
    const alerts = outbox.slice(before).filter((m) => m.templateKey === "staff_follow_up_request");
    expect(alerts.length).toBeGreaterThan(0);
    for (const m of alerts) expect(m.body).not.toContain("Hollis");
    const view = await as(p.actor, (ctx) => sameDayOverview(ctx, p.caseId));
    expect(view.screening.followUpRequestedAt).toBeInstanceOf(Date);
    const q = await as(staffActor(s, "clinician"), (ctx) => sameDayQueues(ctx));
    expect(q.followUps.some((f) => f.caseId === p.caseId)).toBe(true);
    await rejects(
      as(p.actor, (ctx) => markFollowUpHandled(ctx, p.caseId)),
      "forbidden",
    );
    await as(staffActor(s, "clinician"), (ctx) => markFollowUpHandled(ctx, p.caseId));
    const after = await as(staffActor(s, "clinician"), (ctx) => sameDayQueues(ctx));
    expect(after.followUps.some((f) => f.caseId === p.caseId)).toBe(false);
  });
});
