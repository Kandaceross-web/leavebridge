"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { getSetting } from "@/server/settings";
import { approveRefund } from "@/server/services/payments";

/** Second-person approval of an out-of-policy refund. The service rejects the original requester. */
export async function approveRefundAction(caseId: string | null, refundId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["billing", "admin"]);
    await run(actor, async (ctx) => {
      const sec = await getSetting(ctx.tx, "security");
      await approveRefund(ctx, refundId, sec.stepUpMinutes);
    });
    revalidatePath("/ops/billing");
    if (caseId) revalidatePath(`/ops/cases/${caseId}`, "layout");
    return { message: "Refund approved and processed." };
  }, fd);
}
