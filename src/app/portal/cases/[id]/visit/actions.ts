"use server";

import { requirePatientSession, run } from "@/server/auth/guards";
import { joinAppointment } from "@/server/services/scheduling";
import { handle, type ActionState } from "@/server/web/action";

/**
 * Join check for the signed-in patient (STR-03, CLN-13): re-attest location, then, if allowed, return video join
 * credentials for this patient's own attendee only. Nothing here is logged.
 */
export async function joinVisit(appointmentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const state = String(fd.get("state") ?? "");
    if (!/^[A-Z]{2}$/.test(state)) return { ok: false, error: "Choose the state you are in right now.", fieldErrors: { state: "Choose a state." } };
    const outcome = await run(actor, (ctx) => joinAppointment(ctx, appointmentId, state));
    return { data: { outcome } };
  }, fd);
}
