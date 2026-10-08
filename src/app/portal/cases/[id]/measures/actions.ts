"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { submitMeasure } from "@/server/services/intake";
import { handle, formFields, type ActionState } from "@/server/web/action";

/** Scores are computed and stored server side for the clinician; nothing about them comes back here. */
export async function submitMeasureAction(caseId: string, key: string, nextHref: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let go = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const fields = formFields(fd);
    const raw: Record<string, number> = {};
    for (const [k, v] of Object.entries(fields)) if (/^\d+$/.test(v)) raw[k] = Number(v);
    const out = await run(actor, (ctx) => submitMeasure(ctx, caseId, key, raw));
    if (out.missing.length) {
      return {
        ok: false,
        error: "Please answer every question.",
        fieldErrors: Object.fromEntries(out.missing.map((m) => [m, "Choose an answer."])),
        values: fields,
      };
    }
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/measures`);
    if (out.safety) return { data: { safety: true } };
    go = true;
  }, fd);
  if (go && !res.error) redirect(nextHref.startsWith(`/portal/cases/${caseId}/`) ? nextHref : `/portal/cases/${caseId}/measures`);
  return res;
}
