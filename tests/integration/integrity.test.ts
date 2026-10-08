import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { advanceClinical, advancePatient, as, staffActor, system } from "@/server/fixtures/journey";
import { aiSuggestions, documents, documentVersions } from "@/server/db/schema";
import { encrypt } from "@/server/crypto";
import { decideSuggestion, generateSuggestions, markReadyForSignature, caseDocuments } from "@/server/services/documents";
import { authorizeFileDownload } from "@/server/services/files";
import { newPatient, rejects, staff } from "./helpers";

async function caseAtDocument(first: string) {
  const s = await staff();
  const p = await newPatient(first, "Integrity");
  await advancePatient(p, "submit");
  await advanceClinical(s, p, "determine");
  const { createDocument } = await import("@/server/services/documents");
  const documentId = await as(staffActor(s, "clinician"), (ctx) => createDocument(ctx, p.caseId, "continuous_leave", null));
  return { s, p, documentId };
}

describe("AI cannot finalize clinical decisions", () => {
  it("AI drafting is off by default", async () => {
    const { s, documentId } = await caseAtDocument("Aioff");
    await rejects(as(staffActor(s, "clinician"), (ctx) => generateSuggestions(ctx, documentId)), "invalid");
  });

  it("pending AI suggestions block signature; accepting creates a clinician-authored version", async () => {
    const { s, documentId } = await caseAtDocument("Aiflow");
    const clin = staffActor(s, "clinician");
    const [sug] = await as(system, (ctx) => ctx.tx.insert(aiSuggestions).values({ documentId, fieldKey: "functional_limitations", text: encrypt("Fictional AI draft text"), sourceRefs: ["intake.work_examples"], provider: "stub" }).returning());
    await rejects(as(clin, (ctx) => markReadyForSignature(ctx, documentId)), "invalid");
    await as(clin, (ctx) => decideSuggestion(ctx, sug!.id, true));
    const versions = await as(system, (ctx) => ctx.tx.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)));
    expect(versions.every((v) => v.origin === "clinician")).toBe(true);
  });

  it("the database refuses determinations by non-clinicians and signatures on AI versions", async () => {
    const { s, p, documentId } = await caseAtDocument("Dbguard");
    await rejects(
      as(system, (ctx) => ctx.tx.execute(sql`insert into determinations (case_id, clinician_id, decided_by_user_id, decision, rationale, findings, patient_message, step_up_at) values (${p.caseId}, ${s.clinicianIds.clinician}, ${s.userIds.admin}, 'DOCUMENTATION_CLINICALLY_SUPPORTED', 'x', 'y', 'z', now())`)),
    );
    const [aiVersion] = await as(system, (ctx) => ctx.tx.insert(documentVersions).values({ documentId, versionNo: 99, content: encrypt("{}"), contentHash: "h", origin: "ai_draft", createdBy: s.userIds.clinician }).returning());
    await rejects(
      as(system, (ctx) => ctx.tx.execute(sql`insert into signatures (document_version_id, signer_user_id, clinician_id, content_hash, attestation, step_up_at) values (${aiVersion!.id}, ${s.userIds.clinician}, ${s.clinicianIds.clinician}, 'h', 'x', now())`)),
    );
  });
});

describe("unsigned drafts cannot masquerade as final", () => {
  it("a document cannot be marked signed or delivered without a signed version", async () => {
    const { documentId } = await caseAtDocument("Nosig");
    await rejects(as(system, (ctx) => ctx.tx.update(documents).set({ status: "delivered" }).where(eq(documents.id, documentId))));
  });

  it("patients cannot see drafts, draft versions or unsigned files", async () => {
    const { p, documentId } = await caseAtDocument("Hidden");
    expect(await as(p.actor, (ctx) => caseDocuments(ctx, p.caseId, "patient"))).toEqual([]);
    const visible = await as(p.actor, (ctx) => ctx.tx.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)));
    expect(visible).toEqual([]);
  });

  it("signed-but-undelivered documents cannot be downloaded by the patient", async () => {
    const s = await staff();
    const p = await newPatient("Undelivered", "Integrity");
    await advancePatient(p, "submit");
    await advanceClinical(s, p, "sign");
    const [doc] = await as(system, (ctx) => ctx.tx.select().from(documents).where(eq(documents.caseId, p.caseId)));
    expect(doc!.status).toBe("signed");
    await rejects(as(p.actor, (ctx) => authorizeFileDownload(ctx, doc!.signedFileId!)), "forbidden");
  });
});

describe("append-only records", () => {
  it.each(["audit_events", "determinations", "case_status_history", "signatures", "document_versions"])("%s cannot be updated or deleted", async (table) => {
    await rejects(as(system, (ctx) => ctx.tx.execute(sql.raw(`update ${table} set created_at = created_at where true`))));
    await rejects(as(system, (ctx) => ctx.tx.execute(sql.raw(`delete from ${table} where true`))));
  });
});
