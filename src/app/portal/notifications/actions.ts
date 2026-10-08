"use server";

import { revalidatePath } from "next/cache";
import { requirePatientSession, run } from "@/server/auth/guards";
import { markNotificationsRead } from "@/server/services/messaging";
import { handle, type ActionState } from "@/server/web/action";

export async function markAllRead(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => markNotificationsRead(ctx));
    revalidatePath("/portal", "layout");
    return { message: "All notifications marked as read." };
  }, fd);
}
