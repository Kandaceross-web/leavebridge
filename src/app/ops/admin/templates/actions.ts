"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { saveTemplate } from "@/server/services/admin";
import { invalid } from "@/domain/errors";
import { bool, str, uuid } from "../_lib/form";

export async function saveTemplateAction(id: string, hasSubject: boolean, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    const body = str(fd, "body").trim();
    const subject = hasSubject ? str(fd, "subject").trim() : null;
    if (!body) throw invalid("The message body is required.");
    if (subject !== null && (subject.length < 3 || subject.length > 200)) throw invalid("Enter a subject between 3 and 200 characters.");
    await run(actor, (ctx) => saveTemplate(ctx, uuid(id), { subject, body, active: bool(fd, "active") }));
    revalidatePath("/ops/admin/templates");
    return { message: "Template saved." };
  }, fd);
}
