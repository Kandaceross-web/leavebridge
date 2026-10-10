import { createPrivateKey, X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderIssuedPdf } from "@/server/issued-pdf";
import { documentSigner, generateDevelopmentSigner, signPdf, verifyPdfSignature } from "@/server/signing";

const issuedAt = new Date("2026-10-09T15:04:00Z");

async function signedRecord() {
  const doc = await renderIssuedPdf({
    title: "Automated Mental Health Screening Record",
    subtitle: "Automated screening record. Not a clinician examination.",
    documentNumber: "LB-ABCD-EFGH-JKMN-PQRS-TVWX",
    issuedAt,
    verifyUrl: "http://localhost:3000/verify/LB-ABCD-EFGH-JKMN-PQRS-TVWX",
    brand: "LeaveBridge Health",
    practice: "Example Practice (fictional)",
    facts: [{ label: "Name", value: "Avery Testcase (fictional)" }],
    sections: [{ heading: "Questionnaire results", lines: ["PHQ-9 total score: 4 of 27."] }],
    closing: ["Fictional test document."],
  });
  return signPdf(doc, { reason: "Issued", name: "LeaveBridge Health", location: "Online", contactInfo: "verify page", signingTime: issuedAt });
}

describe("digital signatures on issued documents", () => {
  it("signs the whole file with the configured certificate and verifies it", async () => {
    const { bytes, fingerprint } = await signedRecord();
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.toString("latin1")).toContain("/SubFilter /adbe.pkcs7.detached");
    const check = verifyPdfSignature(bytes);
    expect(check).toMatchObject({ ok: true, fingerprint });
    expect(fingerprint).toBe(documentSigner().fingerprint);
    expect(fingerprint).toMatch(/^[0-9A-F]{64}$/);
  });

  it("detects any change to the signed bytes", async () => {
    const { bytes } = await signedRecord();
    const text = bytes.toString("latin1");
    // Change one character of visible content (the date in the document's metadata or body).
    const at = text.indexOf("2026");
    expect(at).toBeGreaterThan(0);
    const tampered = Buffer.from(bytes);
    tampered[at + 3] = "7".charCodeAt(0);
    expect(verifyPdfSignature(tampered)).toEqual({ ok: false, reason: "digest_mismatch" });
  });

  it("rejects an incremental update appended after signing (for example an edited date)", async () => {
    const { bytes } = await signedRecord();
    const appended = Buffer.concat([bytes, Buffer.from("\n1 0 obj\n<< /Title (Changed) >>\nendobj\n%%EOF\n", "latin1")]);
    expect(verifyPdfSignature(appended)).toEqual({ ok: false, reason: "not_whole_file" });
  });

  it("rejects a corrupted signature value", async () => {
    const { bytes } = await signedRecord();
    // Overwrite part of the signature contents: the structure or the signature check fails.
    const text = bytes.toString("latin1");
    const start = text.indexOf("/Contents <") + "/Contents <".length;
    const forged = Buffer.from(bytes);
    for (let i = start + 200; i < start + 260; i++) forged[i] = "A".charCodeAt(0);
    const check = verifyPdfSignature(forged);
    expect(check.ok).toBe(false);
  });

  it("generates a valid, distinct, clearly labelled development certificate (never used in production)", () => {
    const a = generateDevelopmentSigner();
    const b = generateDevelopmentSigner();
    expect(a.certPem).not.toBe(b.certPem);
    const cert = new X509Certificate(a.certPem);
    expect(cert.checkPrivateKey(createPrivateKey(a.keyPem))).toBe(true);
    expect(cert.subject).toMatch(/DEVELOPMENT/);
    expect(cert.verify(cert.publicKey)).toBe(true);
    expect(cert.keyUsage ?? []).toBeDefined();
  });

  it("reports unsigned PDFs", async () => {
    const plain = await PDFDocument.create();
    plain.addPage();
    expect(verifyPdfSignature(Buffer.from(await plain.save()))).toEqual({ ok: false, reason: "no_signature" });
  });
});
