"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { approveAccessGrant, revokeAccessGrant } from "@/server/services/admin";
import { str, uuid } from "../_lib/form";

export async function approveGrantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "clinical_director"]);
    await run(actor, (ctx) => approveAccessGrant(ctx, uuid(str(fd, "grantId"))));
    revalidatePath("/ops/admin/access");
    return { message: "Access approved until the expiry shown." };
  }, fd);
}

export async function revokeGrantAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "clinical_director", "compliance"]);
    await run(actor, (ctx) => revokeAccessGrant(ctx, uuid(str(fd, "grantId"))));
    revalidatePath("/ops/admin/access");
    return { message: "Access revoked." };
  }, fd);
}
