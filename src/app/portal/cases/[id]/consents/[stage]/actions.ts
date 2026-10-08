"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { signStageConsents } from "@/server/services/consents";
import { myPatientProfile } from "@/server/services/portal-queries";
import { handle, formAnswers, type ActionState } from "@/server/web/action";

export type PortalConsentStage = "payment" | "intake" | "release";

const NEXT: Record<PortalConsentStage, string> = { payment: "checkout", intake: "intake", release: "releases" };

export async function signConsents(caseId: string, stage: PortalConsentStage, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const versionIds = fd.getAll("versionId").map(String);
    const fieldErrors: Record<string, string> = {};
    for (const v of versionIds) if (fd.get(`ack_${v}`) !== "yes") fieldErrors[`ack_${v}`] = "Check this box to confirm you have read this document.";
    const typedName = String(fd.get("typedName") ?? "");
    if (!typedName.trim()) fieldErrors["typedName"] = "Type your full legal name to sign.";
    if (Object.keys(fieldErrors).length) return { ok: false, error: "Please confirm each document and sign with your full legal name.", fieldErrors, values: formAnswers(fd) };
    await run(actor, async (ctx) => {
      const profile = await myPatientProfile(ctx);
      await signStageConsents(ctx, caseId, stage, { typedName, versionIds, legalName: profile.legalName, sessionMfa: actor.mfa });
    });
    revalidatePath(`/portal/cases/${caseId}`);
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}/${NEXT[stage]}`);
}
