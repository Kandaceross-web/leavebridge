"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { submitCase, syncPreSubmissionStatus, loadCase } from "@/server/services/cases";
import { uploadEmployerForm, uploadSupporting } from "@/server/services/files";
import { handle, formFile, type ActionState } from "@/server/web/action";

export async function uploadDocument(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async (): Promise<ActionState> => {
    const { actor } = await requirePatientSession();
    const kind = String(fd.get("kind") ?? "");
    if (kind !== "employer_form" && kind !== "supporting") return { ok: false, error: "Choose what kind of document this is.", fieldErrors: { kind: "Choose a document type." } };
    const file = await formFile(fd, "file");
    if (!file) return { ok: false, error: "Choose a file to upload.", fieldErrors: { file: "Choose a file." } };
    await run(actor, async (ctx) => {
      if (kind === "employer_form") await uploadEmployerForm(ctx, caseId, file);
      else await uploadSupporting(ctx, caseId, file);
      const { row } = await loadCase(ctx, caseId, "owner");
      await syncPreSubmissionStatus(ctx, row);
    });
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/documents`);
    return { message: "Uploaded. Thank you." };
  }, fd);
}

export async function submitForReview(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => submitCase(ctx, caseId));
    revalidatePath("/portal");
    revalidatePath(`/portal/cases/${caseId}`);
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}`);
}
