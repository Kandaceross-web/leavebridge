"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { draftRuleset, publishRuleset, setQuestionnaireEnabled } from "@/server/services/admin";
import { bool, str, uuid } from "../_lib/form";

const ROLES = ["admin", "clinical_director"] as const;

export async function setQuestionnaireEnabledAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(ROLES);
    const enabled = str(fd, "enabled") === "1";
    await run(actor, (ctx) => setQuestionnaireEnabled(ctx, uuid(str(fd, "id")), enabled));
    revalidatePath("/ops/admin/questionnaires");
    return { message: enabled ? "Enabled." : "Disabled." };
  }, fd);
}

export async function draftRulesetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(ROLES);
    const json = str(fd, "definition");
    if (json.length > 200_000) return { error: "The rules are too large.", values: { definition: json } };
    await run(actor, (ctx) => draftRuleset(ctx, json));
    revalidatePath("/ops/admin/questionnaires");
    revalidatePath("/ops/admin/reviews");
    return { message: "Draft ruleset saved with a clinical review tag." };
  }, fd);
}

export async function publishRulesetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(ROLES);
    await run(actor, (ctx) => publishRuleset(ctx, uuid(str(fd, "id")), bool(fd, "clearTag")));
    revalidatePath("/ops/admin/questionnaires");
    revalidatePath("/ops/admin/reviews");
    return { message: "Ruleset published. Each screening records the ruleset version it used." };
  }, fd);
}
