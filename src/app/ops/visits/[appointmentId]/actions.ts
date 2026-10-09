"use server";

import { requireStaffSession, run } from "@/server/auth/guards";
import { clinicianJoinAppointment } from "@/server/services/scheduling";
import { handle, type ActionState } from "@/server/web/action";

/** Join check for the clinician the visit is booked with; returns video join credentials for that clinician only. */
export async function joinVisitAsClinician(appointmentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
    const outcome = await run(actor, (ctx) => clinicianJoinAppointment(ctx, appointmentId));
    return { data: { outcome } };
  }, fd);
}
