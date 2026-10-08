"use server";

import { revalidatePath } from "next/cache";
import { requirePatientSession, run } from "@/server/auth/guards";
import { sendMessage } from "@/server/services/messaging";
import { handle, type ActionState } from "@/server/web/action";

export async function send(caseId: string, category: "clinical" | "administrative", _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => sendMessage(ctx, caseId, category, String(fd.get("body") ?? "")));
    revalidatePath(`/portal/cases/${caseId}/messages`);
    return { message: "Message sent." };
  }, fd);
}
