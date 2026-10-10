"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffSession, run } from "@/server/auth/guards";
import { revokeIssuedDocument } from "@/server/services/issued-documents";
import { decideHeldScreening, resolveRefundFlag } from "@/server/services/same-day";
import { approveWorkExcuse, claimWorkExcuse, declineWorkExcuse } from "@/server/services/work-excuse";
import { formFields, handle, type ActionState } from "@/server/web/action";
import { DOCUMENT_TEMPLATES } from "@/config/document-templates";

const CLINICAL = ["clinician", "clinical_director"] as const;

function refresh(caseId?: string) {
  revalidatePath("/ops/same-day");
  revalidatePath("/ops/safety");
  if (caseId) revalidatePath(`/ops/same-day/${caseId}`);
}

export async function decideHeldAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async (): Promise<ActionState> => {
    const { actor } = await requireStaffSession(CLINICAL);
    const decision = fd.get("decision") === "issue" ? "issue" : fd.get("decision") === "close" ? "close" : null;
    if (!decision) return { ok: false, error: "Choose whether to issue the record or close the screening.", fieldErrors: { decision: "Choose one." } };
    const note = String(fd.get("note") ?? "");
    if (!note.trim()) return { ok: false, error: "Describe the follow-up and your decision.", fieldErrors: { note: "Required." } };
    await run(actor, (ctx) => decideHeldScreening(ctx, caseId, decision, note));
    refresh(caseId);
    return { message: decision === "issue" ? "Record issued and the patient notified." : "Screening closed without a record. The patient was notified." };
  }, fd);
}

export async function resolveRefundAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "billing"]);
    await run(actor, (ctx) => resolveRefundFlag(ctx, caseId));
    refresh(caseId);
    return { message: "Marked as decided." };
  }, fd);
}

export async function revokeAction(documentId: string, caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["clinician", "clinical_director", "admin"]);
    if (fd.get("confirm") !== "on") return { ok: false, error: "Confirm the revocation.", fieldErrors: { confirm: "Required." } };
    await run(actor, (ctx) => revokeIssuedDocument(ctx, documentId, String(fd.get("reason") ?? "")));
    refresh(caseId);
    return { message: "Revoked. The verification page now shows it as revoked." };
  }, fd);
}

export async function claimLetterAction(requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(CLINICAL);
    await run(actor, (ctx) => claimWorkExcuse(ctx, requestId));
    revalidatePath(`/ops/same-day/letters/${requestId}`);
    return { message: "Assigned to you." };
  }, fd);
}

export async function approveLetterAction(requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(CLINICAL);
    const fields = formFields(fd);
    const values: Record<string, string> = {};
    for (const f of DOCUMENT_TEMPLATES.work_excuse_letter.fields) values[f.key] = fields[f.key] ?? "";
    await run(actor, (ctx) => approveWorkExcuse(ctx, requestId, values, fd.get("attest") === "on"));
    done = true;
  }, fd);
  if (done && !res.error) {
    refresh();
    redirect(`/ops/same-day/letters/${requestId}?approved=1`);
  }
  return res;
}

export async function declineLetterAction(requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(CLINICAL);
    await run(actor, (ctx) => declineWorkExcuse(ctx, requestId, String(fd.get("message") ?? ""), fd.get("recommend") === "on"));
    refresh();
    revalidatePath(`/ops/same-day/letters/${requestId}`);
    return { message: "Declined. The patient was notified to check their portal." };
  }, fd);
}
