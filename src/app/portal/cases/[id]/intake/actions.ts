"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { saveIntakeSection, submitIntake } from "@/server/services/intake";
import { handle, formAnswers, type ActionState } from "@/server/web/action";

/** Autosaves one section. A safety answer stops here and shows crisis resources (no silent continue). */
export async function saveSection(caseId: string, sectionKey: string, nextHref: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let go = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const answers = formAnswers(fd);
    const out = await run(actor, (ctx) => saveIntakeSection(ctx, caseId, sectionKey, answers));
    revalidatePath(`/portal/cases/${caseId}/intake`);
    const hasErrors = Object.keys(out.errors).length > 0;
    if (out.safety) {
      return {
        ok: !hasErrors,
        error: hasErrors ? "Your answers were saved, but a few questions still need an answer." : undefined,
        fieldErrors: hasErrors ? out.errors : undefined,
        values: hasErrors ? answers : undefined,
        data: { safety: true },
      };
    }
    if (hasErrors) return { ok: false, error: "Your progress was saved. Please answer the highlighted questions.", fieldErrors: out.errors, values: answers };
    go = true;
  }, fd);
  if (go && !res.error) redirect(nextHref.startsWith(`/portal/cases/${caseId}/`) ? nextHref : `/portal/cases/${caseId}/intake`);
  return res;
}

export async function submitIntakeAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => submitIntake(ctx, caseId));
    revalidatePath(`/portal/cases/${caseId}`);
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}/measures`);
}
