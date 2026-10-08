"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { loadCase, patientChecklist } from "@/server/services/cases";
import { attestLocation, submitIdentityDocument } from "@/server/services/identity";
import { handle, formFile, type ActionState } from "@/server/web/action";

async function identityStepDone(actor: Parameters<typeof run>[0], caseId: string) {
  return run(actor, async (ctx) => {
    const { row } = await loadCase(ctx, caseId, "owner");
    const steps = await patientChecklist(ctx, row);
    const s = steps.find((x) => x.key === "identity");
    return s?.state === "done" || s?.state === "waiting";
  });
}

export async function uploadId(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const file = await formFile(fd, "idFile");
    if (!file) return { error: "Choose a photo of your ID to upload.", fieldErrors: { idFile: "Choose a file." } };
    await run(actor, (ctx) => submitIdentityDocument(ctx, caseId, file));
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/verify`);
    done = await identityStepDone(actor, caseId);
    return { message: "Your ID was uploaded. A team member will review it; you can keep going." };
  }, fd);
  if (!res.error && done) redirect(`/portal/cases/${caseId}/consents/payment`);
  return res;
}

export async function confirmLocation(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let done = false;
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const state = String(fd.get("state") ?? "");
    if (!/^[A-Z]{2}$/.test(state)) return { error: "Choose the state you are in right now.", fieldErrors: { state: "Choose a state." } };
    const out = await run(actor, (ctx) => attestLocation(ctx, caseId, state, "verification"));
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/verify`);
    if (!out.matches) {
      return {
        ok: false,
        error:
          "Our clinicians can provide care only while you are physically located in a state where they are licensed, and in the state you confirmed during screening. If you have moved or are traveling, please message support.",
      };
    }
    done = await identityStepDone(actor, caseId);
    return { message: "Thank you. Your location is confirmed." };
  }, fd);
  if (!res.error && done) redirect(`/portal/cases/${caseId}/consents/payment`);
  return res;
}
