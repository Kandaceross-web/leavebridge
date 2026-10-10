import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { db } from "../db/client";
import { cases, issuedDocuments } from "../db/schema";
import type { IssuedDocumentKind } from "../db/schema";
import { audit } from "../audit";
import { encrypt, sha256Hex } from "../crypto";
import { env } from "../env";
import {
  letterDateTime,
  renderIssuedPdf,
  renderLetterPdf,
  type IssuedPdfInput,
  type LetterPdfInput,
} from "../issued-pdf";
import { getSetting } from "../settings";
import { signPdf, verifyPdfSignature } from "../signing";
import { loadCase, notifyPatient, type CaseRow } from "./cases";
import { storeUpload } from "./files";
import { actorUserId } from "@/domain/actor";
import { requireRole, requireStaffMfa, requireStepUp } from "@/domain/policy";
import { conflict, forbidden, invalid, notFound } from "@/domain/errors";
import { formatDocumentNumber, normalizeDocumentNumber } from "@/domain/same-day/rules";

/**
 * Issued, verifiable documents: unique non-guessable number, server-clock issue time, QR code to
 * the public verification page, digital signature over the whole PDF, encrypted storage with the
 * file hash in the database, and revocation with reason and audit. One document per source: issuing
 * twice for the same screening or letter request returns the first document unchanged, so a patient
 * cannot regenerate a record or change its dates.
 */
export type IssuedDocumentRow = typeof issuedDocuments.$inferSelect;

export const ISSUED_KIND_LABEL: Record<IssuedDocumentKind, string> = {
  automated_screening_record: "Automated Mental Health Screening Record",
  work_excuse_letter: "Work Excuse Letter",
};

export const verifyUrlFor = (publicId: string) => `${env.APP_ORIGIN}/verify/${publicId}`;

/** The database clock (not the request) sets the issue time. */
async function serverNow(ctx: Ctx): Promise<Date> {
  const res = await ctx.tx.execute<{ now: string | Date }>(sql`select clock_timestamp() as now`);
  const v = res.rows[0]!.now;
  // Whole seconds: the same instant is printed, signed and stored.
  const d = new Date(v);
  d.setMilliseconds(0);
  return d;
}

export async function issuedFor(
  ctx: Ctx,
  kind: IssuedDocumentKind,
  sourceId: string,
): Promise<IssuedDocumentRow | null> {
  const [row] = await ctx.tx
    .select()
    .from(issuedDocuments)
    .where(and(eq(issuedDocuments.kind, kind), eq(issuedDocuments.sourceId, sourceId)))
    .limit(1);
  return row ?? null;
}

export interface IssueInput {
  caseRow: CaseRow;
  kind: IssuedDocumentKind;
  sourceId: string;
  title: string;
  subtitle: string;
  facts: IssuedPdfInput["facts"];
  sections: IssuedPdfInput["sections"];
  closing: string[];
  issuerClinicianId: string | null;
  fileName: string;
  /** Short lines shown on the public verification page; letters only. No health information. */
  publicDetail?: string[];
  /**
   * Clinical correspondence layout (letters). When set, the letter layout replaces subtitle, facts,
   * sections and closing on the PDF; the issuing practice and signing time are added to the signature.
   */
  letter?: Omit<LetterPdfInput, "documentNumber" | "issuedAt" | "verifyUrl" | "brand" | "status">;
}

/** Renders, signs, stores and registers a document. Idempotent per (kind, source). */
export async function issueDocument(ctx: Ctx, input: IssueInput): Promise<IssuedDocumentRow> {
  const existing = await issuedFor(ctx, input.kind, input.sourceId);
  if (existing) return existing;
  const [brand, sameDay] = [
    await getSetting(ctx.tx, "brand"),
    await getSetting(ctx.tx, "sameDayScreening"),
  ];
  const publicId = formatDocumentNumber(randomBytes(13));
  const issuedAt = await serverNow(ctx);
  const verifyUrl = verifyUrlFor(publicId);
  const pdfDoc = input.letter
    ? await renderLetterPdf({
        ...input.letter,
        status: "Verified Clinical Documentation",
        documentNumber: publicId,
        issuedAt,
        verifyUrl,
        brand: brand.name,
        signature: {
          name: input.letter.signature.name,
          lines: [
            ...input.letter.signature.lines,
            `Issuing Practice: ${sameDay.practiceName}`,
            `Electronically Signed: ${letterDateTime(issuedAt)}`,
          ],
        },
      })
    : await renderIssuedPdf({
        title: input.title,
        subtitle: input.subtitle,
        documentNumber: publicId,
        issuedAt,
        verifyUrl,
        brand: brand.name,
        practice: sameDay.practiceName,
        facts: input.facts,
        sections: input.sections,
        closing: input.closing,
      });
  const { bytes, fingerprint } = await signPdf(pdfDoc, {
    reason: `${input.title} ${publicId}`,
    name: sameDay.practiceName,
    location: new URL(env.APP_ORIGIN).host,
    contactInfo: brand.supportEmail,
    signingTime: issuedAt,
  });
  const file = await storeUpload(ctx, {
    caseId: input.caseRow.id,
    patientId: input.caseRow.patientId,
    category: "generated",
    name: input.fileName,
    data: bytes,
  });
  const [row] = await ctx.tx
    .insert(issuedDocuments)
    .values({
      publicId,
      caseId: input.caseRow.id,
      kind: input.kind,
      sourceId: input.sourceId,
      fileId: file.id,
      sha256: sha256Hex(bytes),
      signingCertFingerprint: fingerprint,
      issuedAt,
      issuedByUserId: actorUserId(ctx.actor),
      issuerClinicianId: input.issuerClinicianId,
      issuerPractice: sameDay.practiceName,
      publicDetail: input.publicDetail?.length ? input.publicDetail : null,
    })
    .returning();
  await audit(ctx, {
    action: "issued_document.issued",
    subjectType: "issued_document",
    subjectId: row!.id,
    caseId: input.caseRow.id,
    metadata: { kind: input.kind },
  });
  return row!;
}

/** Documents issued on a case: the patient (own case) or staff with operational access. */
export async function caseIssuedDocuments(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, "owner");
  return ctx.tx
    .select()
    .from(issuedDocuments)
    .where(eq(issuedDocuments.caseId, caseId))
    .orderBy(desc(issuedDocuments.issuedAt));
}

/** The patient's issued documents across their cases (portal Documents page). */
export async function myIssuedDocuments(ctx: Ctx) {
  if (ctx.actor.kind !== "patient") throw forbidden();
  return ctx.tx
    .select({ d: issuedDocuments, reference: cases.reference })
    .from(issuedDocuments)
    .innerJoin(cases, eq(cases.id, issuedDocuments.caseId))
    .where(eq(cases.patientId, ctx.actor.patientId))
    .orderBy(desc(issuedDocuments.issuedAt));
}

/**
 * Revocation by a clinician or administrator, with a reason (stored encrypted, never public) and a
 * fresh step-up. The public page then reports the document as revoked.
 */
export async function revokeIssuedDocument(ctx: Ctx, documentId: string, reason: string) {
  requireRole(ctx.actor, ["clinician", "clinical_director", "admin"]);
  requireStaffMfa(ctx.actor);
  const sec = await getSetting(ctx.tx, "security");
  requireStepUp(ctx.actor, sec.stepUpMinutes);
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw notFound("Document");
  const [doc] = await ctx.tx
    .select()
    .from(issuedDocuments)
    .where(eq(issuedDocuments.id, documentId))
    .limit(1);
  if (!doc) throw notFound("Document");
  const { row } = await loadCase(ctx, doc.caseId, "operational");
  if (doc.status === "revoked") throw conflict("This document is already revoked.");
  const text = reason.trim();
  if (text.length < 5)
    throw invalid("Give a short reason for revoking (kept in the record, never shown publicly).");
  await ctx.tx
    .update(issuedDocuments)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      revokedBy: ctx.actor.userId,
      revocationReason: encrypt(text.slice(0, 2000)),
    })
    .where(eq(issuedDocuments.id, doc.id));
  await audit(ctx, {
    action: "issued_document.revoked",
    subjectType: "issued_document",
    subjectId: doc.id,
    caseId: row.id,
    metadata: { kind: doc.kind },
  });
  await notifyPatient(ctx, row, "case_update");
}

export interface PublicVerification {
  found: boolean;
  documentNumber: string | null;
  kind?: IssuedDocumentKind;
  kindLabel?: string;
  status?: "valid" | "revoked";
  issuedAt?: Date;
  revokedAt?: Date | null;
  /** Letters only: the signing clinician and practice. */
  issuer?: { clinician: string | null; practice: string };
  /** Letters only: patient initials and excused dates, for comparing against the copy in hand. */
  detail?: string[];
  /** Only when a file was checked. */
  file?: { matches: boolean; signature: "valid" | "invalid" | "absent" };
}

interface VerifyRow {
  kind: IssuedDocumentKind;
  status: "valid" | "revoked";
  issued_at: string | Date;
  revoked_at: string | Date | null;
  issuer_name: string | null;
  issuer_credentials: string | null;
  issuer_practice: string;
  sha256: string;
  signing_cert_fingerprint: string;
  public_detail: string[] | null;
}

/**
 * Public verification. Runs through a security-definer function that returns only the document type,
 * status, dates and (for letters) the issuer. Never a patient name, case, score or diagnosis.
 * Optionally compares an uploaded copy byte for byte and checks its embedded signature.
 */
export async function verifyDocument(
  input: string,
  file: Buffer | null = null,
): Promise<PublicVerification> {
  const publicId = normalizeDocumentNumber(input);
  if (!publicId) return { found: false, documentNumber: null };
  const res = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor_kind', 'anonymous', true)`);
    return tx.execute<VerifyRow & Record<string, unknown>>(
      sql`select * from lb_verify_document(${publicId})`,
    );
  });
  const r = res.rows[0];
  if (!r) return { found: false, documentNumber: publicId };
  const out: PublicVerification = {
    found: true,
    documentNumber: publicId,
    kind: r.kind,
    kindLabel: ISSUED_KIND_LABEL[r.kind],
    status: r.status,
    issuedAt: new Date(r.issued_at),
    revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
    issuer: {
      clinician:
        r.kind === "work_excuse_letter" && r.issuer_name
          ? `${r.issuer_name}${r.issuer_credentials ? `, ${r.issuer_credentials}` : ""}`
          : null,
      practice: r.issuer_practice,
    },
    detail: r.public_detail ?? [],
  };
  if (file) {
    const check = verifyPdfSignature(file);
    out.file = {
      matches: sha256Hex(file) === r.sha256,
      signature: check.ok
        ? check.fingerprint === r.signing_cert_fingerprint
          ? "valid"
          : "invalid"
        : check.reason === "no_signature"
          ? "absent"
          : "invalid",
    };
  }
  return out;
}
