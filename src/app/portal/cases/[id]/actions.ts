"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { cancelCaseByPatient } from "@/server/services/cases";
import { fulfillRequest, openRequests } from "@/server/services/clinical";
import { uploadEmployerForm, uploadSupporting } from "@/server/services/files";
import { loadCase } from "@/server/services/cases";
import { handle, formFile, type ActionState } from "@/server/web/action";
import { invalid, notFound } from "@/domain/errors";

/** Responds to a clinician/staff request with text and/or an upload linked to the request. */
export async function respondToRequest(caseId: string, requestId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const file = await formFile(fd, "file");
    const response = String(fd.get("response") ?? "").trim().slice(0, 4000);
    await run(actor, async (ctx) => {
      await loadCase(ctx, caseId, "owner");
      const req = (await openRequests(ctx, caseId)).find((r) => r.id === requestId);
      if (!req) throw notFound("Request");
      if (req.kind !== "information" && !file) throw invalid("Choose a file to upload.");
      if (file) {
        if (req.kind === "employer_form") await uploadEmployerForm(ctx, caseId, file, req.id);
        else await uploadSupporting(ctx, caseId, file, req.id);
      }
      await fulfillRequest(ctx, req.id, response || null);
    });
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath("/portal");
    return { message: "Thank you. Your response was sent to your care team." };
  }, fd);
}

export async function cancelCase(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    if (fd.get("confirm") !== "yes") return { error: "Please confirm that you want to cancel this request.", fieldErrors: { confirm: "Check this box to confirm." } };
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => cancelCaseByPatient(ctx, caseId));
    revalidatePath("/portal");
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}`);
}
