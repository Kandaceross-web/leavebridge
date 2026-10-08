"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { clearServiceReviewTag, serviceSchema, setPrice, updateService } from "@/server/services/admin";
import { serviceExtrasSchema, updateServiceExtras } from "@/server/services/admin-queries";
import { invalid } from "@/domain/errors";
import { bool, int, str, uuid } from "../_lib/form";

export async function updateServiceAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = serviceSchema.parse({
      name: str(fd, "name"),
      summary: str(fd, "summary"),
      description: str(fd, "description"),
      enabled: bool(fd, "enabled"),
      requiresSession: bool(fd, "requiresSession"),
      requiresIdentityVerification: bool(fd, "requiresIdentityVerification"),
      requiresEmployerForm: bool(fd, "requiresEmployerForm"),
      sessionMinutes: int(fd, "sessionMinutes"),
    });
    const extras = serviceExtrasSchema.parse({ minAge: int(fd, "minAge"), displayOrder: int(fd, "displayOrder") });
    await run(actor, async (ctx) => {
      await updateService(ctx, uuid(id), input);
      await updateServiceExtras(ctx, id, extras);
    });
    revalidatePath("/ops/admin/services");
    return { message: "Service saved." };
  }, fd);
}

export async function clearServiceTagAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    await run(actor, (ctx) => clearServiceReviewTag(ctx, uuid(id)));
    revalidatePath("/ops/admin/services");
    revalidatePath("/ops/admin/reviews");
    return { message: "Review tag cleared." };
  }, fd);
}

export async function setPriceAction(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const amount = str(fd, "amount").trim().replace(/^\$/, "");
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(amount)) return { error: "Please check the highlighted fields.", fieldErrors: { amount: "Enter an amount in dollars, for example 275 or 275.00." }, values: { amount, effectiveFrom: str(fd, "effectiveFrom") } };
    const day = str(fd, "effectiveFrom");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw invalid("Choose an effective date.");
    const cents = Math.round(Number(amount) * 100);
    await run(actor, (ctx) => setPrice(ctx, uuid(id), cents, new Date(`${day}T00:00:00Z`)));
    revalidatePath("/ops/admin/services");
    return { message: "New price recorded." };
  }, fd);
}
