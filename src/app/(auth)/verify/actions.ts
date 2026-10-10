"use server";

import { redirect } from "next/navigation";
import { clientIpKey } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { verifyDocument } from "@/server/services/issued-documents";
import { formFile, handle, type ActionState } from "@/server/web/action";
import { normalizeDocumentNumber } from "@/domain/same-day/rules";

/** Looks up a typed document number. Only the normalized number goes into the URL. */
export async function lookupDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "";
  const res = await handle(async () => {
    await rateLimit("verify", await clientIpKey());
    const id = normalizeDocumentNumber(String(fd.get("documentNumber") ?? ""));
    if (!id) return { ok: false, error: "Check the document number.", fieldErrors: { documentNumber: "Enter the number as printed, for example LB-ABCD-EFGH-JKMN-PQRS-TVWX." } };
    dest = `/verify/${id}`;
  }, fd);
  if (dest) redirect(dest);
  return res;
}

const MAX_PDF = 10 * 1024 * 1024;

/**
 * Compares an uploaded copy with the issued file (hash) and checks its digital signature. The file is
 * read in memory only: it is never stored or logged, and nothing about it is kept.
 */
export async function checkUploadedCopyAction(documentNumber: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    await rateLimit("verifyUpload", await clientIpKey());
    const file = await formFile(fd, "copy");
    if (!file) return { ok: false, error: "Choose the PDF to check.", fieldErrors: { copy: "Choose a PDF file." } };
    if (file.data.length > MAX_PDF || file.data.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return { ok: false, error: "That file is not a PDF we can check.", fieldErrors: { copy: "Choose the PDF exactly as you received it (up to 10 MB)." } };
    }
    const out = await verifyDocument(documentNumber, file.data);
    if (!out.found || !out.file) return { ok: false, error: "No document with this number was found." };
    if (out.file.matches && out.file.signature === "valid") {
      return {
        message:
          out.status === "valid"
            ? "This copy is identical to the issued document and its digital signature is intact."
            : "This copy is identical to the issued document, but the document has been revoked.",
      };
    }
    return { ok: false, error: "This copy does not match the issued document. It may have been changed after it was issued. Ask for the original or contact the issuing practice." };
  }, fd);
}
