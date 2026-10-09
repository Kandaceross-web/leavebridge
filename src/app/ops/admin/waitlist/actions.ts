"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { WAITLIST_ROLES, notifyWaitlist } from "@/server/services/waitlist";
import { invalid } from "@/domain/errors";
import { str } from "../_lib/form";

export async function notifyWaitlistAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(WAITLIST_ROLES);
    if (!/^[A-Z]{2}$/.test(code)) throw invalid("Unknown state.");
    if (!str(fd, "confirm")) return { ok: false, error: "Confirm before sending.", fieldErrors: { confirm: "Check this box to send the emails." } };
    const { sent, failed } = await run(actor, (ctx) => notifyWaitlist(ctx, code));
    revalidatePath("/ops/admin/waitlist");
    const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
    return failed
      ? { message: `Emailed ${people(sent)}. ${people(failed)} could not be emailed and are still listed; try again later.` }
      : { message: `Emailed ${people(sent)}. Their addresses have been deleted.` };
  }, fd);
}
