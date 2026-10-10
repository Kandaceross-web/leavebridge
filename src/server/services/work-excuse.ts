import "server-only";
import { eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import {
  automatedScreenings,
  clinicians,
  deliveries,
  documents,
  documentVersions,
  patients,
  signatures,
  workExcuseRequests,
} from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, encrypt, encryptJson } from "../crypto";
import { getSetting } from "../settings";
import { assignClinician } from "./clinical";
import { contentHash, type DocContent } from "./documents";
import { getCaseRow, loadCase, notifyPatient } from "./cases";
import { issueDocument, issuedFor } from "./issued-documents";
import { checkCanServe } from "./jurisdiction";
import { alertClinicalStaff } from "./staff-alerts";
import { LETTER_DECIDER, LETTER_TITLES, isExcuseSetting } from "@/config/same-day";
import { DOCUMENT_TEMPLATES } from "@/config/document-templates";
import {
  hasRole,
  requireAssignedClinician,
  requireRole,
  requireStaffMfa,
  requireStepUp,
} from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import {
  longDate,
  nameInitials,
  proposedLetter,
  validateLetterRequest,
  type FunctioningAnswers,
  type LetterFields,
  type LetterRequestInput,
  type ScreeningSummary,
} from "@/domain/same-day/rules";

/**
 * Work excuse letters. A separate request from a completed screening, at most one per screening
 * (unique in the database). The system prepares a proposed letter from the patient's request and
 * record; it goes to the clinician queue. Nothing is signed or issued until the assigned clinician
 * approves it with MFA, a fresh password step-up and an attestation; the clinician can edit or
 * decline. Approval saves the clinician's own version, binds an electronic signature to its exact
 * content hash (database-guarded), then issues a digitally signed PDF and tells the patient it is
 * ready. No stored signature image is used.
 */
const CLINICAL = ["clinician", "clinical_director"] as const;
const LETTER = DOCUMENT_TEMPLATES.work_excuse_letter;

export type WorkExcuseRow = typeof workExcuseRequests.$inferSelect;

/** Patient: request a letter for an issued, still-valid screening record. */
export async function requestWorkExcuse(
  ctx: Ctx,
  caseId: string,
  raw: Record<string, string | undefined>,
): Promise<{ errors: Record<string, string> }> {
  if (ctx.actor.kind !== "patient") throw forbidden();
  const setting = await getSetting(ctx.tx, "workExcuseLetter");
  if (!setting.enabled) throw invalid("Letter requests are not available right now.");
  const { row } = await loadCase(ctx, caseId, "owner");
  if (row.kind !== "automated_screening") throw notFound("Screening");
  const [s] = await ctx.tx
    .select()
    .from(automatedScreenings)
    .where(eq(automatedScreenings.caseId, row.id))
    .limit(1);
  if (!s || s.status !== "issued" || !s.completedAt)
    throw invalid("A letter can be requested after your screening record is issued.");
  const record = await issuedFor(ctx, "automated_screening_record", s.id);
  if (!record || record.status !== "valid")
    throw invalid("A letter can't be requested for this screening.");
  const [existing] = await ctx.tx
    .select({ id: workExcuseRequests.id })
    .from(workExcuseRequests)
    .where(eq(workExcuseRequests.automatedScreeningId, s.id))
    .limit(1);
  if (existing)
    throw conflict(
      "A letter has already been requested for this screening. Each screening can have one letter request.",
    );
  const { input, errors } = validateLetterRequest(raw, s.completedAt);
  if (!input) return { errors };
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, row.patientId)).limit(1);
  const sameDay = await getSetting(ctx.tx, "sameDayScreening");
  const draft = proposedLetter({
    patientName: p ? `${p.legalFirstName} ${p.legalLastName}` : "",
    screeningDate: s.completedAt,
    practice: sameDay.practiceName,
    request: input,
  });
  const [req] = await ctx.tx
    .insert(workExcuseRequests)
    .values({
      caseId: row.id,
      automatedScreeningId: s.id,
      patientInput: encryptJson(input),
      proposedDraft: encryptJson(draft),
    })
    .returning();
  await audit(ctx, {
    action: "letter.requested",
    subjectType: "work_excuse_request",
    subjectId: req!.id,
    caseId: row.id,
  });
  await alertClinicalStaff(ctx, "letter_request", row.id);
  return { errors: {} };
}

async function requestRow(ctx: Ctx, requestId: string): Promise<WorkExcuseRow> {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw notFound("Request");
  const [r] = await ctx.tx
    .select()
    .from(workExcuseRequests)
    .where(eq(workExcuseRequests.id, requestId))
    .limit(1);
  if (!r) throw notFound("Request");
  return r;
}

/** A clinician authorized for the patient's state takes the request (assigns the case to themselves). */
export async function claimWorkExcuse(ctx: Ctx, requestId: string) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  if (!ctx.actor.clinicianId) throw forbidden("Only a clinician can review letter requests.");
  const r = await requestRow(ctx, requestId);
  if (r.status !== "requested") throw conflict("This request has already been decided.");
  const row = await getCaseRow(ctx, r.caseId);
  if (row.assignedClinicianId === ctx.actor.clinicianId) return;
  if (row.assignedClinicianId && !hasRole(ctx.actor, ["clinical_director"]))
    throw forbidden("Another clinician is reviewing this request.");
  await assignClinician(ctx, row.id, ctx.actor.clinicianId);
  await audit(ctx, {
    action: "letter.assigned",
    subjectType: "work_excuse_request",
    subjectId: r.id,
    caseId: row.id,
  });
}

/** What an unassigned clinician sees before taking a request: no clinical content. */
export interface WorkExcuseSummary {
  limited: true;
  request: Pick<WorkExcuseRow, "id" | "status" | "createdAt">;
  row: { id: string; reference: string; jurisdictionCode: string | null };
}

/**
 * Everything the clinician needs to decide: request, proposed letter, screening results. Clinical
 * access only (the assigned clinician or a clinical director); other clinicians see a limited view
 * from which they can take the request.
 */
export async function workExcuseDetail(ctx: Ctx, requestId: string) {
  requireRole(ctx.actor, CLINICAL);
  const r = await requestRow(ctx, requestId);
  const loaded = await loadCase(ctx, r.caseId, "operational");
  if (loaded.access !== "clinical") {
    const out: WorkExcuseSummary = {
      limited: true,
      request: { id: r.id, status: r.status, createdAt: r.createdAt },
      row: {
        id: loaded.row.id,
        reference: loaded.row.reference,
        jurisdictionCode: loaded.row.jurisdictionCode,
      },
    };
    return out;
  }
  const { row } = loaded;
  const [s] = await ctx.tx
    .select()
    .from(automatedScreenings)
    .where(eq(automatedScreenings.id, r.automatedScreeningId))
    .limit(1);
  const [doc] = r.documentId
    ? await ctx.tx.select().from(documents).where(eq(documents.id, r.documentId)).limit(1)
    : [];
  const [current] = doc?.currentVersionId
    ? await ctx.tx
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, doc.currentVersionId))
        .limit(1)
    : [];
  const issued = await issuedFor(ctx, "work_excuse_letter", r.id);
  return {
    limited: false as const,
    request: r,
    row,
    input: withSetting(
      decryptJson<LetterRequestInput>(r.patientInput, {
        setting: "work",
        startDate: "",
        endDate: "",
        returnDate: null,
        note: "",
      }),
    ),
    proposed: withDraftSetting(
      decryptJson<LetterFields>(r.proposedDraft, {
        patient_name: "",
        excused_setting: "work",
        excused_from: "",
        excused_through: "",
        return_date: "",
        letter_body: "",
      }),
    ),
    current: current
      ? decryptJson<DocContent>(current.content, { fields: {}, sources: {} }).fields
      : null,
    summary: decryptJson<ScreeningSummary | null>(s?.summary, null),
    functioning: decryptJson<FunctioningAnswers | null>(s?.functioning, null),
    screeningCompletedAt: s?.completedAt ?? null,
    issued,
    declineMessage: r.declineMessage ? decrypt(r.declineMessage) : null,
    isAssignedToMe:
      ctx.actor.kind === "staff" &&
      !!ctx.actor.clinicianId &&
      row.assignedClinicianId === ctx.actor.clinicianId,
  };
}

/** Requests made before the school option existed carry no setting; they were work requests. */
function withSetting(input: LetterRequestInput): LetterRequestInput {
  return { ...input, setting: isExcuseSetting(input.setting) ? input.setting : "work" };
}

function withDraftSetting(draft: LetterFields): LetterFields {
  return {
    ...draft,
    excused_setting: isExcuseSetting(draft.excused_setting) ? draft.excused_setting : "work",
  };
}

function cleanFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of LETTER.fields)
    out[f.key] = (fields[f.key] ?? "").trim().slice(0, f.kind === "textarea" ? 6000 : 200);
  const missing = LETTER.fields.filter((f) => f.required && !out[f.key]);
  if (missing.length) throw invalid(`Complete: ${missing.map((m) => m.label).join(", ")}.`);
  for (const k of ["excused_from", "excused_through", "return_date"]) {
    if (out[k] && !/^\d{4}-\d{2}-\d{2}$/.test(out[k]!))
      throw invalid("Use the date pickers for the letter dates.");
  }
  out.excused_setting = out.excused_setting!.toLowerCase();
  if (!isExcuseSetting(out.excused_setting))
    throw invalid("The letter must excuse the patient from work or from school.");
  if (out.excused_through! < out.excused_from!)
    throw invalid("The last day must be on or after the first day.");
  if (out.return_date && out.return_date <= out.excused_through!)
    throw invalid("The return date must be after the last day.");
  return out;
}

/**
 * Approve and sign. The submitted fields become a new clinician-authored version; the signature row
 * binds to that version's content hash (database trigger checks it and that the signer is the active
 * clinician); then the signed PDF is issued and delivered to the patient portal.
 */
export async function approveWorkExcuse(
  ctx: Ctx,
  requestId: string,
  fields: Record<string, string>,
  attested: boolean,
) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const sec = await getSetting(ctx.tx, "security");
  requireStepUp(ctx.actor, sec.stepUpMinutes);
  const r = await requestRow(ctx, requestId);
  if (r.status !== "requested") throw conflict("This request has already been decided.");
  const { row } = await loadCase(ctx, r.caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  const setting = await getSetting(ctx.tx, "workExcuseLetter");
  if (!attested) throw invalid("Confirm the attestation to approve and sign.");
  if (!row.serviceId || !row.jurisdictionCode)
    throw invalid("This screening has no service or state.");
  const can = await checkCanServe(
    ctx.tx,
    ctx.actor.clinicianId!,
    row.serviceId,
    row.jurisdictionCode,
    new Date(),
  );
  if (!can.ok)
    throw forbidden(
      "Your authorization for this patient's state is not currently valid, so you cannot sign.",
    );
  const values = cleanFields(fields);
  const scope = isExcuseSetting(values.excused_setting) ? values.excused_setting : "work";

  // The clinician's own document and version.
  let documentId = r.documentId;
  if (!documentId) {
    const [doc] = await ctx.tx
      .insert(documents)
      .values({
        caseId: row.id,
        kind: "work_excuse_letter",
        title: LETTER_TITLES[scope],
        createdBy: ctx.actor.userId,
      })
      .returning();
    documentId = doc!.id;
    await ctx.tx
      .update(workExcuseRequests)
      .set({ documentId, updatedAt: new Date() })
      .where(eq(workExcuseRequests.id, r.id));
  }
  const versions = await ctx.tx
    .select({ n: documentVersions.versionNo })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId));
  const content: DocContent = { fields: values, sources: {} };
  const hash = contentHash(content, null);
  const [v] = await ctx.tx
    .insert(documentVersions)
    .values({
      documentId,
      versionNo: versions.length + 1,
      content: encryptJson(content),
      contentHash: hash,
      origin: "clinician",
      createdBy: ctx.actor.userId,
    })
    .returning();
  await audit(ctx, {
    action: "letter.version_saved",
    subjectType: "document",
    subjectId: documentId,
    caseId: row.id,
    metadata: { versionNo: v!.versionNo },
  });
  await ctx.tx.insert(signatures).values({
    documentVersionId: v!.id,
    signerUserId: ctx.actor.userId,
    clinicianId: ctx.actor.clinicianId!,
    contentHash: hash,
    attestation: setting.attestation.slice(0, 500),
    stepUpAt: ctx.actor.stepUpAt!,
  });

  const [clin] = await ctx.tx
    .select()
    .from(clinicians)
    .where(eq(clinicians.id, ctx.actor.clinicianId!))
    .limit(1);
  const signer = `${clin!.displayName}, ${clin!.credentials}`;
  const issued = await issueDocument(ctx, {
    caseRow: row,
    kind: "work_excuse_letter",
    sourceId: r.id,
    title: LETTER_TITLES[scope],
    subtitle: "Issued and electronically signed by the clinician named below after their review.",
    facts: [
      { label: "Patient", value: values.patient_name! },
      {
        label: `Excused from ${scope}`,
        value: `${longDate(values.excused_from!)} through ${longDate(values.excused_through!)}`,
      },
      ...(values.return_date
        ? [{ label: `May return to ${scope} on`, value: longDate(values.return_date) }]
        : []),
    ],
    sections: [{ heading: "Letter", lines: values.letter_body!.split(/\n{2,}/) }],
    publicDetail: [
      `Patient initials: ${nameInitials(values.patient_name!)}`,
      `Excused from ${scope}: ${longDate(values.excused_from!)} through ${longDate(values.excused_through!)}`,
    ],
    closing: [
      `Electronically signed by ${signer} on the issue date shown above, after multi-factor sign-in and password re-confirmation.`,
      `Clinician attestation: ${setting.attestation}`,
      `This letter reflects the signing clinician's independent judgment. ${LETTER_DECIDER[scope]}`,
      "To the recipient: scan the QR code or open the verification address above. It shows whether this letter is valid, the patient's initials and the excused dates. If they differ from this copy, the copy was changed and should not be relied on.",
    ],
    issuerClinicianId: ctx.actor.clinicianId!,
    fileName: `${scope}-excuse-letter-${row.reference}.pdf`,
  });
  await ctx.tx
    .update(documents)
    .set({
      currentVersionId: v!.id,
      signedVersionId: v!.id,
      signedFileId: issued.fileId,
      status: "delivered",
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
  await ctx.tx
    .insert(deliveries)
    .values({
      documentId,
      versionId: v!.id,
      recipientType: "patient",
      channel: "portal",
      deliveredBy: ctx.actor.userId,
    });
  await ctx.tx
    .update(workExcuseRequests)
    .set({
      status: "approved",
      decidedBy: ctx.actor.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workExcuseRequests.id, r.id));
  await audit(ctx, {
    action: "letter.approved",
    subjectType: "work_excuse_request",
    subjectId: r.id,
    caseId: row.id,
  });
  await notifyPatient(ctx, row, "documents_ready");
}

/** Decline with a message to the patient; optionally recommend the full clinician-led assessment. */
export async function declineWorkExcuse(
  ctx: Ctx,
  requestId: string,
  message: string,
  recommendAssessment: boolean,
) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const r = await requestRow(ctx, requestId);
  if (r.status !== "requested") throw conflict("This request has already been decided.");
  const { row } = await loadCase(ctx, r.caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  const text = message.trim();
  if (text.length < 10)
    throw invalid("Write a short message to the patient explaining the decision.");
  await ctx.tx
    .update(workExcuseRequests)
    .set({
      status: "declined",
      declineMessage: encrypt(text.slice(0, 4000)),
      recommendAssessment: recommendAssessment ? "yes" : "no",
      decidedBy: ctx.actor.userId,
      decidedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workExcuseRequests.id, r.id));
  await audit(ctx, {
    action: "letter.declined",
    subjectType: "work_excuse_request",
    subjectId: r.id,
    caseId: row.id,
    metadata: { recommendAssessment },
  });
  await notifyPatient(ctx, row, "case_update");
}

/** Ops list helper: the request on a case, if any. */
export async function workExcuseForCase(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, "operational");
  const [r] = await ctx.tx
    .select()
    .from(workExcuseRequests)
    .where(eq(workExcuseRequests.caseId, caseId))
    .limit(1);
  return r ?? null;
}
