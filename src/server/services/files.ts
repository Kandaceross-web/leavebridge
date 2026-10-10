import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { cases, deliveries, documents, employerForms, files, issuedDocuments } from "../db/schema";
import { audit } from "../audit";
import { decrypt, encrypt, sha256Hex } from "../crypto";
import { scanUpload } from "../providers/scan";
import { storage } from "../providers/storage";
import { loadCase } from "./cases";
import type { FileCategory } from "@/domain/constants";
import { forbidden, invalid, notFound } from "@/domain/errors";

export type FileRow = typeof files.$inferSelect;

/**
 * Validates, scans, encrypts and stores an upload. Rejected files are recorded (for the audit
 * trail) but never stored. Exact duplicates for the same patient are detected so people are not
 * asked to upload the same document twice.
 */
export async function storeUpload(ctx: Ctx, input: { caseId: string | null; patientId: string; category: FileCategory; name: string; data: Buffer; documentRequestId?: string | null }): Promise<FileRow> {
  const uploader = ctx.actor.kind === "patient" || ctx.actor.kind === "staff" ? ctx.actor.userId : null;
  if (!uploader) throw forbidden();
  const sha256 = sha256Hex(input.data);
  const result = await scanUpload(input.data);
  const safeName = input.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "upload";
  if (!result.ok) {
    await audit(ctx, { action: "file.rejected", subjectType: "case", subjectId: input.caseId ?? undefined, caseId: input.caseId, metadata: { reason: result.reason.slice(0, 60) } });
    throw invalid(result.reason);
  }
  if (input.caseId) {
    const [dup] = await ctx.tx
      .select()
      .from(files)
      .where(and(eq(files.patientId, input.patientId), eq(files.sha256, sha256), eq(files.caseId, input.caseId), eq(files.category, input.category)))
      .limit(1);
    if (dup) return dup;
  }
  const key = await storage().put(input.data, input.category);
  const [row] = await ctx.tx
    .insert(files)
    .values({
      caseId: input.caseId,
      patientId: input.patientId,
      uploadedBy: uploader,
      category: input.category,
      storageKey: key,
      sha256,
      mimeType: result.mime,
      sizeBytes: input.data.length,
      scanStatus: "clean",
      originalName: encrypt(safeName),
      documentRequestId: input.documentRequestId ?? null,
    })
    .returning();
  await audit(ctx, { action: "file.uploaded", subjectType: "file", subjectId: row!.id, caseId: input.caseId, metadata: { category: input.category, mime: result.mime } });
  return row!;
}

/** Patient uploads an employer/leave form. Creates the employer_form record staff review. */
export async function uploadEmployerForm(ctx: Ctx, caseId: string, file: { name: string; data: Buffer }, documentRequestId: string | null = null) {
  const { row } = await loadCase(ctx, caseId, "owner");
  if (["closed", "cancelled"].includes(row.status)) throw invalid("This case is closed.");
  const stored = await storeUpload(ctx, { caseId: row.id, patientId: row.patientId, category: "employer_form", name: file.name, data: file.data, documentRequestId });
  const [existing] = await ctx.tx.select({ id: employerForms.id }).from(employerForms).where(eq(employerForms.fileId, stored.id)).limit(1);
  if (!existing) await ctx.tx.insert(employerForms).values({ caseId: row.id, fileId: stored.id });
  await ctx.tx.update(cases).set({ lastActivityAt: new Date() }).where(eq(cases.id, row.id));
  return stored;
}

export async function uploadSupporting(ctx: Ctx, caseId: string, file: { name: string; data: Buffer }, documentRequestId: string | null = null) {
  const { row } = await loadCase(ctx, caseId, "owner");
  if (["closed", "cancelled"].includes(row.status)) throw invalid("This case is closed.");
  return storeUpload(ctx, { caseId: row.id, patientId: row.patientId, category: "supporting", name: file.name, data: file.data, documentRequestId });
}

export function displayName(f: FileRow): string {
  try {
    return decrypt(f.originalName);
  } catch {
    return "document";
  }
}

/**
 * Authorizes and audits a download. Patients can download their own uploads and only the signed
 * version of completed documents; staff need operational access for identity files and clinical
 * access for everything else.
 */
export async function authorizeFileDownload(ctx: Ctx, fileId: string): Promise<{ data: Buffer; mime: string; name: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw notFound("File");
  const [f] = await ctx.tx.select().from(files).where(eq(files.id, fileId)).limit(1);
  if (!f || f.scanStatus !== "clean") throw notFound("File");
  if (f.caseId) {
    const level = ctx.actor.kind === "patient" ? "owner" : f.category === "identity" ? "operational" : "clinical";
    await loadCase(ctx, f.caseId, level);
  } else if (ctx.actor.kind === "patient" ? ctx.actor.patientId !== f.patientId : true) {
    throw forbidden();
  }
  if (ctx.actor.kind === "patient" && f.category === "generated") {
    // An issued (signed) screening record or letter: the stored file, unchanged, and only while it is valid.
    const [issued] = await ctx.tx.select({ kind: issuedDocuments.kind, status: issuedDocuments.status }).from(issuedDocuments).where(eq(issuedDocuments.fileId, f.id)).limit(1);
    if (issued && issued.status !== "valid") throw forbidden("This document has been revoked and can no longer be downloaded.");
    if (issued?.kind !== "automated_screening_record") {
      // Otherwise only the rendered signed version of a document delivered to the patient.
      const [doc] = await ctx.tx
        .select({ id: documents.id })
        .from(deliveries)
        .innerJoin(documents, eq(documents.id, deliveries.documentId))
        .where(and(eq(documents.signedFileId, f.id), eq(deliveries.recipientType, "patient")))
        .limit(1);
      if (!doc) throw forbidden();
      await ctx.tx.update(deliveries).set({ accessCount: sql`${deliveries.accessCount} + 1`, firstAccessedAt: sql`coalesce(${deliveries.firstAccessedAt}, now())` }).where(eq(deliveries.documentId, doc.id));
    }
  }
  const data = await storage().get(f.storageKey);
  await audit(ctx, { action: "file.downloaded", subjectType: "file", subjectId: f.id, caseId: f.caseId, metadata: { category: f.category } });
  return { data, mime: f.mimeType, name: displayName(f) };
}

export async function caseFiles(ctx: Ctx, caseId: string, opts: { includeIdentity: boolean }) {
  await loadCase(ctx, caseId, "owner");
  const rows = await ctx.tx.select().from(files).where(eq(files.caseId, caseId)).orderBy(files.createdAt);
  return rows.filter((r) => opts.includeIdentity || r.category !== "identity").map((r) => ({ ...r, name: displayName(r) }));
}
