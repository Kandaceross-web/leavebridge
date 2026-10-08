"use server";

import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { verifyAuditChainAs } from "@/server/services/admin-queries";

export async function verifyChainAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin", "compliance"]);
    const broken = await run(actor, (ctx) => verifyAuditChainAs(ctx));
    if (broken === null) return { message: `Chain intact (checked ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC).` };
    return { ok: false, error: `Chain broken: the first row that fails verification is #${broken}. Escalate to security; do not modify the table.` };
  }, fd);
}
