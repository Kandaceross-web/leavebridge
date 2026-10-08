"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { createStaffUser, setRole, setUserStatus, staffSchema } from "@/server/services/admin";
import { STAFF_ROLES, type Role } from "@/domain/constants";
import { forbidden, invalid } from "@/domain/errors";
import { str, uuid } from "../_lib/form";

export async function createStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const input = staffSchema.parse({ email: str(fd, "email"), initialPassword: str(fd, "initialPassword"), role: str(fd, "role") });
    await run(actor, (ctx) => createStaffUser(ctx, input));
    revalidatePath("/ops/admin/staff");
    return { message: "Staff account created. They enroll two-step verification on first sign-in." };
  }, fd);
}

export async function setRoleAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const role = str(fd, "role") as Role;
    if (!STAFF_ROLES.includes(role)) throw invalid("Choose a role.");
    const grant = str(fd, "grant") === "1";
    if (!grant && role === "admin" && userId === actor.userId) throw forbidden("You can't remove your own admin role.");
    await run(actor, (ctx) => setRole(ctx, uuid(userId), role, grant));
    revalidatePath("/ops/admin/staff");
    return { message: grant ? "Role granted." : "Role revoked." };
  }, fd);
}

export async function setUserStatusAction(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const status = str(fd, "status");
    if (status !== "active" && status !== "disabled") throw invalid("Unknown status.");
    await run(actor, (ctx) => setUserStatus(ctx, uuid(userId), status));
    revalidatePath("/ops/admin/staff");
    return { message: status === "active" ? "Account enabled." : "Account disabled." };
  }, fd);
}
