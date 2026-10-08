"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { orgSchema, saveOrganization } from "@/server/services/admin";
import { bool, echoAlso, str, uuid } from "../_lib/form";

export async function saveOrganizationAction(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = orgSchema.parse({
      name: str(fd, "name"),
      kind: str(fd, "kind"),
      referralCode: str(fd, "referralCode"),
      landingHeadline: str(fd, "landingHeadline"),
      active: bool(fd, "active"),
    });
    await run(actor, (ctx) => saveOrganization(ctx, id ? uuid(id) : null, input));
    revalidatePath("/ops/admin/organizations");
    return { message: id ? "Organization saved." : "Organization added." };
  }, fd);
  return echoAlso(res, fd, ["referralCode"]);
}
