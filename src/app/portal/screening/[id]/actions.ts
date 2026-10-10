"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { withActor } from "@/server/db/actor";
import { requestMeta } from "@/server/request";
import { sendVerificationEmail } from "@/server/services/email-verification";
import {
  acknowledgeAndCheckout,
  chooseInstruments,
  completeSameDayScreening,
  requestAssessmentFollowUp,
  saveFunctioning,
  submitSameDayMeasure,
} from "@/server/services/same-day";
import { requestWorkExcuse } from "@/server/services/work-excuse";
import { formAnswers, formFields, handle, type ActionState } from "@/server/web/action";

const base = (id: string) => `/portal/screening/${id}`;

/** Sends a fresh email confirmation link to the signed-in patient's own address. */
export async function resendVerificationAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { session } = await requirePatientSession();
    const out = await withActor({ kind: "system", reason: "email verification" }, (ctx) => sendVerificationEmail(ctx, session.userId), await requestMeta());
    revalidatePath(base(caseId));
    return { message: out === "already_verified" ? "Your email is already confirmed." : "Sent. Open the link in the email to confirm your address." };
  }, fd);
}

/** Records the acknowledgement and opens checkout (the Good Faith Estimate shown is passed back to bind the charge). */
export async function payAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let url = "";
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    if (fd.get("acknowledge") !== "yes") {
      return { ok: false, error: "Please confirm you understand what this screening is.", fieldErrors: { acknowledge: "Check this box to continue." } };
    }
    url = await run(actor, (ctx) => acknowledgeAndCheckout(ctx, caseId, String(fd.get("estimateId") ?? "")));
  }, fd);
  if (res.error || !url) {
    revalidatePath(`${base(caseId)}/pay`);
    return res;
  }
  redirect(url);
}

export async function chooseInstrumentsAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const chosen = fd.getAll("instruments").map(String);
    if (!chosen.length) return { ok: false, error: "Choose at least one questionnaire.", fieldErrors: { instruments: "Choose the PHQ-9, the GAD-7, or both." } };
    await run(actor, (ctx) => chooseInstruments(ctx, caseId, chosen));
    revalidatePath(base(caseId));
  }, fd);
  return res.error ? res : { message: "Saved." };
}

/** Scores are computed and stored server side; only whether a safety answer was given comes back. */
export async function submitQuestionnaireAction(caseId: string, key: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let go = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const fields = formFields(fd);
    const raw: Record<string, number> = {};
    for (const [k, v] of Object.entries(fields)) if (/^\d+$/.test(v)) raw[k] = Number(v);
    const out = await run(actor, (ctx) => submitSameDayMeasure(ctx, caseId, key, raw));
    if (out.missing.length) {
      return {
        ok: false,
        error: "Please answer every question.",
        fieldErrors: Object.fromEntries(out.missing.map((m) => [m, "Choose an answer."])),
        values: fields,
      };
    }
    revalidatePath(base(caseId));
    if (out.safety) return { data: { safety: true } };
    go = true;
  }, fd);
  if (go && !res.error) redirect(base(caseId));
  return res;
}

export async function saveWorkAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let go = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const answers = formAnswers(fd);
    const out = await run(actor, (ctx) => saveFunctioning(ctx, caseId, answers));
    if (Object.keys(out.errors).length) return { ok: false, error: "Please answer the highlighted questions.", fieldErrors: out.errors, values: answers };
    revalidatePath(base(caseId));
    if (out.safety) return { data: { safety: true } };
    go = true;
  }, fd);
  if (go && !res.error) redirect(base(caseId));
  return res;
}

export async function completeAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => completeSameDayScreening(ctx, caseId));
    revalidatePath(base(caseId));
    revalidatePath("/portal/documents");
    done = true;
  }, fd);
  if (done && !res.error) redirect(`${base(caseId)}?finished=1`);
  return res;
}

export async function requestLetterAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let go = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const fields = formFields(fd);
    const out = await run(actor, (ctx) => requestWorkExcuse(ctx, caseId, fields));
    if (Object.keys(out.errors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: out.errors, values: fields };
    revalidatePath(base(caseId));
    go = true;
  }, fd);
  if (go && !res.error) redirect(`${base(caseId)}?letter=requested`);
  return res;
}

export async function requestFollowUpAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => requestAssessmentFollowUp(ctx, caseId));
    revalidatePath(base(caseId));
    return { message: "Thank you. We will contact you to arrange your assessment." };
  }, fd);
}
