"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import {
  addComplianceReview,
  complianceReviewSchema,
  jurisdictionConfigSchema,
  setJurisdictionActive,
  updateJurisdiction,
} from "@/server/services/admin";
import { invalid } from "@/domain/errors";
import { bool, str } from "../_lib/form";

const checkCode = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) throw invalid("Unknown state.");
  return code;
};

export async function updateJurisdictionAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = jurisdictionConfigSchema.parse({
      telehealthAuthorized: bool(fd, "telehealthAuthorized"),
      requiredDisclosures: str(fd, "requiredDisclosures"),
      specialRestrictions: str(fd, "specialRestrictions"),
      complianceNotes: str(fd, "complianceNotes"),
      nextReviewDueOn: str(fd, "nextReviewDueOn"),
    });
    await run(actor, (ctx) => updateJurisdiction(ctx, checkCode(code), input));
    revalidatePath(`/ops/admin/jurisdictions/${code}`);
    revalidatePath("/ops/admin/jurisdictions");
    return { message: "State configuration saved." };
  }, fd);
}

export async function setJurisdictionActiveAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const active = str(fd, "active") === "1";
    await run(actor, (ctx) => setJurisdictionActive(ctx, checkCode(code), active));
    revalidatePath(`/ops/admin/jurisdictions/${code}`);
    revalidatePath("/ops/admin/jurisdictions");
    return { message: active ? "State activated." : "State deactivated." };
  }, fd);
}

export async function addJurisdictionReviewAction(code: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "compliance"]);
    const input = complianceReviewSchema.parse({
      subjectType: "jurisdiction",
      subjectId: checkCode(code),
      reviewType: str(fd, "reviewType"),
      reviewerName: str(fd, "reviewerName"),
      outcome: str(fd, "outcome"),
      notes: str(fd, "notes"),
      reviewedOn: str(fd, "reviewedOn"),
      nextDueOn: str(fd, "nextDueOn"),
    });
    await run(actor, (ctx) => addComplianceReview(ctx, input));
    revalidatePath(`/ops/admin/jurisdictions/${code}`);
    revalidatePath("/ops/admin/jurisdictions");
    revalidatePath("/ops/admin/reviews");
    return { message: "Review recorded." };
  }, fd);
}
