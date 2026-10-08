"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePatientSession, run } from "@/server/auth/guards";
import { confirmSimulatedPayment } from "@/server/services/payments";
import { handle, type ActionState } from "@/server/web/action";

/** Development only: the service refuses unless the fake provider is active outside production. */
export async function paySimulated(ref: string, _: ActionState, fd: FormData): Promise<ActionState> {
  let caseId = "";
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    caseId = await run(actor, (ctx) => confirmSimulatedPayment(ctx, ref));
    revalidatePath("/portal");
    revalidatePath(`/portal/cases/${caseId}`);
  }, fd);
  if (res.error || !caseId) return res;
  redirect(`/portal/cases/${caseId}?paid=1`);
}
