"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { SECURITY_REVIEW_ROLES, recordSecurityReview } from "@/server/services/security-review";
import { str } from "../_lib/form";

export async function recordSecurityReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession([...SECURITY_REVIEW_ROLES]);
    const summary = await run(actor, (ctx) => recordSecurityReview(ctx, { note: str(fd, "note") }));
    revalidatePath("/ops");
    revalidatePath("/ops/admin/security-review");
    revalidatePath("/ops/admin/reviews");
    if (summary.chainBrokenAt !== null) {
      return { ok: false, error: `Review recorded, but the audit chain check failed at row #${summary.chainBrokenAt}. Escalate it; do not modify the table.` };
    }
    return { message: "Monthly security review recorded. The next one is due in 30 days." };
  }, fd);
}
