"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { addComplianceReview, complianceReviewSchema } from "@/server/services/admin";
import { str } from "../_lib/form";

export async function addReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "compliance"]);
    const input = complianceReviewSchema.parse({
      subjectType: str(fd, "subjectType"),
      subjectId: str(fd, "subjectId").trim(),
      reviewType: str(fd, "reviewType"),
      reviewerName: str(fd, "reviewerName"),
      outcome: str(fd, "outcome"),
      notes: str(fd, "notes"),
      reviewedOn: str(fd, "reviewedOn"),
      nextDueOn: str(fd, "nextDueOn"),
    });
    if (input.subjectType === "jurisdiction") input.subjectId = input.subjectId.toUpperCase();
    await run(actor, (ctx) => addComplianceReview(ctx, input));
    revalidatePath("/ops/admin/reviews");
    if (input.subjectType === "jurisdiction") revalidatePath(`/ops/admin/jurisdictions/${input.subjectId}`);
    return { message: "Review recorded." };
  }, fd);
}
