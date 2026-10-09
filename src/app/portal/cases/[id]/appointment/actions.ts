"use server";

import { revalidatePath } from "next/cache";
import { requirePatientSession, run } from "@/server/auth/guards";
import { bookAppointment, cancelAppointment } from "@/server/services/scheduling";
import { handle, type ActionState } from "@/server/web/action";

export async function book(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const slot = String(fd.get("slot") ?? "");
    if (!slot) return { ok: false, error: "Choose a time.", fieldErrors: { slot: "Choose a time." } };
    await run(actor, (ctx) => bookAppointment(ctx, caseId, slot));
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/appointment`);
    revalidatePath("/portal");
    return { message: "Your appointment is booked." };
  }, fd);
}

export async function cancelAppt(caseId: string, appointmentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const reason = String(fd.get("reason") ?? "").trim();
    if (!reason) return { ok: false, error: "Tell us briefly why you need to cancel.", fieldErrors: { reason: "Add a short reason." } };
    await run(actor, (ctx) => cancelAppointment(ctx, appointmentId, reason));
    revalidatePath(`/portal/cases/${caseId}`);
    revalidatePath(`/portal/cases/${caseId}/appointment`);
    revalidatePath("/portal");
    return { message: "Your appointment was cancelled. Please choose a new time." };
  }, fd);
}