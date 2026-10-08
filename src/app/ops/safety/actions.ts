"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { acknowledgeSafety, releaseSafetyHold } from "@/server/services/clinical";
import { invalid } from "@/domain/errors";

export async function acknowledgeSafetyAction(eventId: string, caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
    const note = String(fd.get("note") ?? "");
    if (!note.trim()) return { ok: false, error: "Document the follow-up taken.", fieldErrors: { note: "Describe the follow-up you took." } };
    await run(actor, (ctx) => acknowledgeSafety(ctx, eventId, note, fd.get("hold") === "on"));
    revalidatePath("/ops/safety");
    revalidatePath(`/ops/cases/${caseId}`, "layout");
    return { message: "Follow-up recorded." };
  }, fd);
}

export async function releaseHoldAction(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
    const note = String(fd.get("note") ?? "").trim();
    if (!note) throw invalid("Add a short note explaining why the hold is released.");
    await run(actor, (ctx) => releaseSafetyHold(ctx, caseId, note));
    revalidatePath("/ops/safety");
    revalidatePath(`/ops/cases/${caseId}`, "layout");
    return { message: "Safety hold released. The case is back in clinical review." };
  }, fd);
}
