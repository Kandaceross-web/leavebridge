"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { draftConsentVersion, publishConsentVersion } from "@/server/services/admin";
import { reviewTag, str, uuid } from "../_lib/form";

export async function draftConsentAction(documentId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const body = str(fd, "bodyMd");
    if (body.length > 50_000) return { error: "The consent text is too long.", values: { bodyMd: body } };
    await run(actor, (ctx) => draftConsentVersion(ctx, uuid(documentId), body, reviewTag(fd)));
    revalidatePath("/ops/admin/consents");
    revalidatePath("/ops/admin/reviews");
    return { message: "Draft version saved." };
  }, fd);
}

export async function publishConsentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    await run(actor, (ctx) => publishConsentVersion(ctx, uuid(str(fd, "versionId"))));
    revalidatePath("/ops/admin/consents");
    revalidatePath("/ops/admin/reviews");
    return { message: "Version published. New signatures use this version." };
  }, fd);
}
