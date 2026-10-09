"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { startCheckout } from "@/server/services/payments";
import { handle, type ActionState } from "@/server/web/action";

export async function beginCheckout(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let url = "";
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    if (fd.get("understand") !== "yes") return { ok: false, error: "Please confirm you understand what payment covers.", fieldErrors: { understand: "Check this box to continue." } };
    url = await run(actor, (ctx) => startCheckout(ctx, caseId, String(fd.get("estimateId") ?? "")));
  }, fd);
  if (res.error || !url) {
    // A changed estimate is issued on the next render; show it rather than the stale one.
    revalidatePath(`/portal/cases/${caseId}/checkout`);
    return res;
  }
  redirect(url);
}
