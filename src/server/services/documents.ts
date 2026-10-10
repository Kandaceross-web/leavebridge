import "server-only";
import { actorUserId } from "@/domain/actor";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import type { Ctx } from "../db/actor";
import { aiSuggestions, clinicians, deliveries, determinations, documents, documentVersions, files, intakes, patients, signatures } from "../db/schema";
import { audit } from "../audit";
import { decrypt, decryptJson, encrypt, encryptJson, sha256Hex } from "../crypto";
import { getSetting } from "../settings";
import { aiProvider, type RecordSource } from "../providers/ai";
import { storage } from "../providers/storage";
import { PDF_NAVY, textPdf } from "../pdf";
import { checkCanServe } from "./jurisdiction";
import { getCaseRow, loadCase, notifyPatient, transition } from "./cases";
import { storeUpload } from "./files";
import { DOCUMENT_DISCLAIMER, DOCUMENT_TEMPLATES } from "@/config/document-templates";
import { requireAssignedClinician, requireRole, requireStaffMfa, requireStepUp } from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { DOCUMENT_KINDS, type DocumentKind } from "@/domain/constants";

const CLINICAL = ["clinician", "clinical_director"] as const;
export interface DocContent {
  fields: Record<string, string>;
  /** Field keys whose value came from a record pre-fill, with the source label. */
  sources: Record<string, string>;
}

/** Stable serialization so the signature hash binds to exact content. */
export function contentHash(content: DocContent, attachmentSha: string | null): string {
  const keys = Object.keys(content.fields).sort();
  return sha256Hex(JSON.stringify({ fields: keys.map((k) => [k, content.fields[k]]), attachment: attachmentSha }));
}

async function latestDetermination(ctx: Ctx, caseId: string) {
  const [d] = await ctx.tx.select().from(determinations).where(eq(determinations.caseId, caseId)).orderBy(desc(determinations.createdAt)).limit(1);
  return d ?? null;
}

async function recordPrefill(ctx: Ctx, caseId: string) {
  const row = await getCaseRow(ctx, caseId);
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.id, row.patientId)).limit(1);
  const [intake] = await ctx.tx.select().from(intakes).where(eq(intakes.caseId, caseId)).limit(1);
  const answers = decryptJson<Record<string, string>>(intake?.answers, {});
  return {
    "patient.name": p ? `${p.legalFirstName} ${p.legalLastName}` : "",
    "patient.dob": p?.dateOfBirth ? decrypt(p.dateOfBirth) : "",
    "case.leaveType": row.requestedLeaveType ?? "",
    "case.reference": row.reference,
    "intake.job_title": typeof answers["job_title"] === "string" ? answers["job_title"] : "",
    "intake.essential_functions": typeof answers["essential_functions"] === "string" ? answers["essential_functions"] : "",
  } as Record<string, string>;
}

export async function createDocument(ctx: Ctx, caseId: string, kind: string, employerFormId: string | null) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  if (!(DOCUMENT_KINDS as readonly string[]).includes(kind) || kind === "work_excuse_letter") throw invalid("Unknown document type.");
  const { row } = await loadCase(ctx, caseId, "clinical");
  requireAssignedClinician(ctx.actor, row.assignedClinicianId);
  const d = await latestDetermination(ctx, row.id);
  if (kind !== "determination_letter" && d?.decision !== "DOCUMENTATION_CLINICALLY_SUPPORTED") {
    throw invalid("Leave documentation can be prepared only after you record that documentation is clinically supported.");
  }
  if (!["provider_review", "provider_signature", "completed"].includes(row.status)) throw conflict("Documents can't be created at this stage.");
  const tpl = DOCUMENT_TEMPLATES[kind as DocumentKind];
  const prefill = await recordPrefill(ctx, row.id);
  const content: DocContent = { fields: {}, sources: {} };
  for (const f of tpl.fields) {
    if (f.fromRecord && prefill[f.fromRecord]) {
      content.fields[f.key] = prefill[f.fromRecord]!;
      content.sources[f.key] = f.fromRecord;
    } else content.fields[f.key] = "";
  }
  const [doc] = await ctx.tx.insert(documents).values({ caseId: row.id, kind: kind as DocumentKind, title: tpl.title, employerFormId, createdBy: ctx.actor.userId }).returning();
  const [v] = await ctx.tx
    .insert(documentVersions)
    .values({ documentId: doc!.id, versionNo: 1, content: encryptJson(content), contentHash: contentHash(content, null), origin: "clinician", createdBy: ctx.actor.userId })
    .returning();
  await ctx.tx.update(documents).set({ currentVersionId: v!.id }).where(eq(documents.id, doc!.id));
  if (row.status === "completed") await transition(ctx, row, "provider_review", "additional documentation");
  await audit(ctx, { action: "document.created", subjectType: "document", subjectId: doc!.id, caseId: row.id, metadata: { kind } });
  return doc!.id;
}

async function loadDocForClinician(ctx: Ctx, documentId: string) {
  requireRole(ctx.actor, CLINICAL);
  const [doc] = await ctx.tx.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) throw notFound("Document");
  const { row } = await loadCase(ctx, doc.caseId, "clinical");
  return { doc, caseRow: row };
}

export async function documentDetail(ctx: Ctx, documentId: string) {
  const { doc, caseRow } = await loadDocForClinician(ctx, documentId);
  const versions = await ctx.tx.select().from(documentVersions).where(eq(documentVersions.documentId, doc.id)).orderBy(desc(documentVersions.versionNo));
  const current = versions.find((v) => v.id === doc.currentVersionId) ?? versions[0]!;
  const suggestions = await ctx.tx.select().from(aiSuggestions).where(eq(aiSuggestions.documentId, doc.id)).orderBy(desc(aiSuggestions.createdAt));
  const [sig] = doc.signedVersionId ? await ctx.tx.select().from(signatures).where(eq(signatures.documentVersionId, doc.signedVersionId)).limit(1) : [];
  const [attachment] = doc.attachmentFileId ? await ctx.tx.select().from(files).where(eq(files.id, doc.attachmentFileId)).limit(1) : [];
  return {
    doc,
    caseRow,
    template: DOCUMENT_TEMPLATES[doc.kind],
    content: decryptJson<DocContent>(current.content, { fields: {}, sources: {} }),
    currentVersion: current,
    versions: versions.map((v) => ({ id: v.id, versionNo: v.versionNo, origin: v.origin, createdAt: v.createdAt, contentHash: v.contentHash })),
    suggestions: suggestions.map((s) => ({ ...s, text: decrypt(s.text) })),
    signature: sig ?? null,
    attachment: attachment ?? null,
  };
}

/** Each save is a new immutable clinician-authored version. Signed documents cannot be edited. */
export async function saveDocumentVersion(ctx: Ctx, documentId: string, fields: Record<string, string>) {
  const { doc, caseRow } = await loadDocForClinician(ctx, documentId);
  requireAssignedClinician(ctx.actor, caseRow.assignedClinicianId);
  if (doc.status === "signed" || doc.status === "delivered" || doc.status === "voided") throw conflict("A signed document can't be edited. Create a new document instead.");
  const tpl = DOCUMENT_TEMPLATES[doc.kind];
  const [cur] = await ctx.tx.select().from(documentVersions).where(eq(documentVersions.id, doc.currentVersionId!)).limit(1);
  const prev = decryptJson<DocContent>(cur!.content, { fields: {}, sources: {} });
  const content: DocContent = { fields: {}, sources: {} };
  for (const f of tpl.fields) {
    const value = (fields[f.key] ?? "").slice(0, 8000);
    content.fields[f.key] = value;
    if (prev.sources[f.key] && prev.fields[f.key] === value) content.sources[f.key] = prev.sources[f.key]!;
  }
  const [att] = doc.attachmentFileId ? await ctx.tx.select({ sha: files.sha256 }).from(files).where(eq(files.id, doc.attachmentFileId)).limit(1) : [];
  const [v] = await ctx.tx
    .insert(documentVersions)
    .values({ documentId: doc.id, versionNo: cur!.versionNo + 1, content: encryptJson(content), contentHash: contentHash(content, att?.sha ?? null), origin: "clinician", createdBy: actorUserId(ctx.actor)! })
    .returning();
  await ctx.tx.update(documents).set({ currentVersionId: v!.id, status: "draft", updatedAt: new Date() }).where(eq(documents.id, doc.id));
  await audit(ctx, { action: "document.version_saved", subjectType: "document", subjectId: doc.id, caseId: doc.caseId, metadata: { versionNo: v!.versionNo } });
}

export async function attachCompletedForm(ctx: Ctx, documentId: string, file: { name: string; data: Buffer }) {
  const { doc, caseRow } = await loadDocForClinician(ctx, documentId);
  requireAssignedClinician(ctx.actor, caseRow.assignedClinicianId);
  if (doc.status === "signed" || doc.status === "delivered") throw conflict("This document is already signed.");
  const stored = await storeUpload(ctx, { caseId: caseRow.id, patientId: caseRow.patientId, category: "generated", name: file.name, data: file.data });
  if (stored.mimeType !== "application/pdf") throw invalid("Attach the completed form as a PDF.");
  await ctx.tx.update(documents).set({ attachmentFileId: stored.id }).where(eq(documents.id, doc.id));
  // Re-save the current content so the version hash includes the attachment.
  const [cur] = await ctx.tx.select().from(documentVersions).where(eq(documentVersions.id, doc.currentVersionId!)).limit(1);
  await saveDocumentVersion(ctx, doc.id, decryptJson<DocContent>(cur!.content, { fields: {}, sources: {} }).fields);
}

/**
 * AI drafting assistance. Suggestions are stored separately from the document, must cite record
 * sources that actually exist, are limited to fields the template allows, and are labeled
 * DRAFT — CLINICIAN REVIEW REQUIRED until the clinician accepts them into their own version.
 */
export async function generateSuggestions(ctx: Ctx, documentId: string): Promise<number> {
  const features = await getSetting(ctx.tx, "features");
  const ai = aiProvider();
  if (!features.aiDrafting || !ai.enabled) throw invalid("AI drafting assistance is turned off.");
  const { doc, caseRow } = await loadDocForClinician(ctx, documentId);
  requireAssignedClinician(ctx.actor, caseRow.assignedClinicianId);
  const tpl = DOCUMENT_TEMPLATES[doc.kind];
  const allowed = tpl.fields.filter((f) => f.aiAllowed);
  if (!allowed.length) return 0;
  const [intake] = await ctx.tx.select().from(intakes).where(eq(intakes.caseId, caseRow.id)).limit(1);
  const answers = decryptJson<Record<string, string | string[]>>(intake?.answers, {});
  const LABELS: Record<string, string> = {
    presenting_concern: "Presenting concern",
    work_examples: "Work functioning and limitations examples",
    daily_activities: "Daily activities and functional limitations",
    essential_functions: "Essential job functions",
    current_providers: "Current providers and treatment",
  };
  const sources: RecordSource[] = Object.entries(LABELS)
    .filter(([k]) => typeof answers[k] === "string" && (answers[k] as string).trim())
    .map(([k, label]) => ({ ref: `intake.${k}`, label, text: answers[k] as string }));
  const validRefs = new Set(sources.map((s) => s.ref));
  const raw = await ai.suggestFields(allowed.map((f) => ({ key: f.key, label: f.label })), sources);
  let stored = 0;
  for (const s of raw) {
    if (!allowed.some((f) => f.key === s.fieldKey)) continue;
    const refs = (s.sourceRefs ?? []).filter((r) => validRefs.has(r));
    if (!refs.length || !s.text?.trim()) continue; // uncited suggestions are discarded
    await ctx.tx.insert(aiSuggestions).values({ documentId: doc.id, fieldKey: s.fieldKey, text: encrypt(s.text.slice(0, 4000)), sourceRefs: refs, provider: ai.name });
    stored++;
  }
  await audit(ctx, { action: "ai.suggestion_generated", subjectType: "document", subjectId: doc.id, caseId: caseRow.id, metadata: { count: stored, provider: ai.name } });
  return stored;
}

export async function decideSuggestion(ctx: Ctx, suggestionId: string, accept: boolean) {
  const [s] = await ctx.tx.select().from(aiSuggestions).where(eq(aiSuggestions.id, suggestionId)).limit(1);
  if (!s || s.acceptedAt || s.rejectedAt) throw invalid("This suggestion was already handled.");
  const { doc, caseRow } = await loadDocForClinician(ctx, s.documentId);
  requireAssignedClinician(ctx.actor, caseRow.assignedClinicianId);
  if (!accept) {
    await ctx.tx.update(aiSuggestions).set({ rejectedAt: new Date() }).where(eq(aiSuggestions.id, s.id));
    return;
  }
  const [cur] = await ctx.tx.select().from(documentVersions).where(eq(documentVersions.id, doc.currentVersionId!)).limit(1);
  const content = decryptJson<DocContent>(cur!.content, { fields: {}, sources: {} });
  content.fields[s.fieldKey] = decrypt(s.text);
  await ctx.tx.update(aiSuggestions).set({ acceptedBy: actorUserId(ctx.actor)!, acceptedAt: new Date() }).where(eq(aiSuggestions.id, s.id));
  await audit(ctx, { action: "ai.suggestion_accepted", subjectType: "document", subjectId: doc.id, caseId: caseRow.id, metadata: { field: s.fieldKey } });
  // Accepting places the text into a new clinician-authored draft the clinician can still edit.
  await saveDocumentVersion(ctx, doc.id, content.fields);
}

export async function markReadyForSignature(ctx: Ctx, documentId: string) {
  const d = await documentDetail(ctx, documentId);
  requireAssignedClinician(ctx.actor, d.caseRow.assignedClinicianId);
  const missing = d.template.fields.filter((f) => f.required && !d.content.fields[f.key]?.trim());
  if (missing.length) throw invalid(`Complete required fields: ${missing.map((m) => m.label).join(", ")}.`);
  if (d.template.requiresAttachment && !d.doc.attachmentFileId) throw invalid("Attach the completed form PDF first.");
  if (d.suggestions.some((s) => !s.acceptedAt && !s.rejectedAt)) throw invalid("Accept or dismiss every AI draft suggestion first.");
  await ctx.tx.update(documents).set({ status: "ready_for_signature" }).where(eq(documents.id, d.doc.id));
  const row = await getCaseRow(ctx, d.caseRow.id);
  if (row.status === "provider_review") await transition(ctx, row, "provider_signature", "documentation ready for signature");
}

async function renderPdf(input: { title: string; template: (typeof DOCUMENT_TEMPLATES)[DocumentKind]; content: DocContent; signer: string; signedAt: Date; hash: string; reference: string; brand: string }): Promise<Buffer> {
  const { write, space, save } = await textPdf();
  write(input.brand, { size: 11, bold: true, color: PDF_NAVY, gap: 2 });
  write(input.title, { size: 16, bold: true, color: PDF_NAVY, gap: 10 });
  write(`Reference: ${input.reference}`, { size: 9 });
  for (const field of input.template.fields) {
    const value = input.content.fields[field.key]?.trim();
    if (!value) continue;
    write(field.label, { size: 9.5, bold: true, gap: 1 });
    write(value, { gap: 8 });
  }
  space(8);
  write(`Electronically signed by ${input.signer} on ${input.signedAt.toUTCString()}.`, { bold: true });
  write(`Content hash: ${input.hash.slice(0, 32)}`, { size: 8 });
  write(DOCUMENT_DISCLAIMER, { size: 8.5, gap: 2 });
  return save({ title: input.title, producer: input.brand });
}

/**
 * Signature: assigned clinician, MFA, fresh step-up, current authorization for the case's state,
 * bound to the exact content hash of a clinician-authored version. The database trigger enforces
 * the hash/origin/clinician rules again, so a bug here cannot produce an invalid signature.
 */
export async function signDocument(ctx: Ctx, documentId: string, attestation: string) {
  requireRole(ctx.actor, CLINICAL);
  requireStaffMfa(ctx.actor);
  const sec = await getSetting(ctx.tx, "security");
  requireStepUp(ctx.actor, sec.stepUpMinutes);
  const d = await documentDetail(ctx, documentId);
  requireAssignedClinician(ctx.actor, d.caseRow.assignedClinicianId);
  if (d.doc.status !== "ready_for_signature") throw conflict("Mark the document ready for signature first.");
  if (d.currentVersion.origin !== "clinician") throw forbidden("AI-drafted content cannot be signed.");
  if (!attestation.trim()) throw invalid("Confirm the attestation to sign.");
  if (d.caseRow.jurisdictionCode && d.caseRow.serviceId) {
    const can = await checkCanServe(ctx.tx, ctx.actor.clinicianId!, d.caseRow.serviceId, d.caseRow.jurisdictionCode, new Date());
    if (!can.ok) throw forbidden("Your authorization for this state is not currently valid, so you cannot sign.");
  }
  const [clin] = await ctx.tx.select().from(clinicians).where(eq(clinicians.id, ctx.actor.clinicianId!)).limit(1);
  const signedAt = new Date();
  await ctx.tx.insert(signatures).values({
    documentVersionId: d.currentVersion.id,
    signerUserId: ctx.actor.userId,
    clinicianId: ctx.actor.clinicianId!,
    contentHash: d.currentVersion.contentHash,
    attestation: attestation.trim().slice(0, 500),
    stepUpAt: ctx.actor.stepUpAt!,
  });
  const brand = await getSetting(ctx.tx, "brand");
  let pdfBytes: Buffer;
  if (d.template.requiresAttachment && d.attachment) {
    // Append a signature page to the clinician-completed form.
    const original = await PDFDocument.load(await storage().get(d.attachment.storageKey));
    const sigPage = await PDFDocument.load(
      await renderPdf({ title: `${d.template.title} · signature page`, template: d.template, content: d.content, signer: `${clin!.displayName}, ${clin!.credentials}`, signedAt, hash: d.currentVersion.contentHash, reference: d.caseRow.reference, brand: brand.name }),
    );
    for (const p of await original.copyPages(sigPage, sigPage.getPageIndices())) original.addPage(p);
    pdfBytes = Buffer.from(await original.save());
  } else {
    pdfBytes = await renderPdf({ title: d.template.title, template: d.template, content: d.content, signer: `${clin!.displayName}, ${clin!.credentials}`, signedAt, hash: d.currentVersion.contentHash, reference: d.caseRow.reference, brand: brand.name });
  }
  const file = await storeUpload(ctx, { caseId: d.caseRow.id, patientId: d.caseRow.patientId, category: "generated", name: `${d.doc.kind}-${d.caseRow.reference}.pdf`, data: pdfBytes });
  await ctx.tx.update(documents).set({ status: "signed", signedVersionId: d.currentVersion.id, signedFileId: file.id, updatedAt: new Date() }).where(eq(documents.id, d.doc.id));
  await audit(ctx, { action: "document.signed", subjectType: "document", subjectId: d.doc.id, caseId: d.caseRow.id, metadata: { versionNo: d.currentVersion.versionNo } });
  const pending = await ctx.tx.select({ id: documents.id }).from(documents).where(and(eq(documents.caseId, d.caseRow.id), inArray(documents.status, ["draft", "ready_for_signature"])));
  const row = await getCaseRow(ctx, d.caseRow.id);
  if (!pending.length && row.status === "provider_signature") await transition(ctx, row, "completed", "all documentation signed");
}

/** Delivers signed documents to the patient portal. External delivery stays behind its feature flag (LEG-07). */
export async function deliverToPatient(ctx: Ctx, documentId: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin", "support"]);
  const [doc] = await ctx.tx.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) throw notFound("Document");
  const { row } = await loadCase(ctx, doc.caseId, "operational");
  if (doc.status !== "signed" || !doc.signedVersionId) throw conflict("Only signed documents can be delivered.");
  await ctx.tx.insert(deliveries).values({ documentId: doc.id, versionId: doc.signedVersionId, recipientType: "patient", channel: "portal", deliveredBy: ctx.actor.userId });
  await ctx.tx.update(documents).set({ status: "delivered", updatedAt: new Date() }).where(eq(documents.id, doc.id));
  await audit(ctx, { action: "document.delivered", subjectType: "document", subjectId: doc.id, caseId: row.id, metadata: { recipient: "patient" } });
  const undelivered = await ctx.tx.select({ id: documents.id }).from(documents).where(and(eq(documents.caseId, row.id), sql`${documents.status} not in ('delivered','voided')`));
  const fresh = await getCaseRow(ctx, row.id);
  if (!undelivered.length && fresh.status === "completed") await transition(ctx, fresh, "delivered", "documents delivered");
  await notifyPatient(ctx, fresh, "documents_ready");
}

export async function voidDocument(ctx: Ctx, documentId: string) {
  const { doc, caseRow } = await loadDocForClinician(ctx, documentId);
  requireAssignedClinician(ctx.actor, caseRow.assignedClinicianId);
  if (doc.status === "delivered") throw conflict("Delivered documents can't be voided here.");
  await ctx.tx.update(documents).set({ status: "voided" }).where(eq(documents.id, doc.id));
}

export async function caseDocuments(ctx: Ctx, caseId: string, view: "clinical" | "operational" | "patient") {
  await loadCase(ctx, caseId, view === "patient" ? "owner" : view);
  const rows = await ctx.tx.select().from(documents).where(eq(documents.caseId, caseId)).orderBy(documents.createdAt);
  if (view === "patient") return rows.filter((r) => r.status === "delivered");
  return rows;
}
