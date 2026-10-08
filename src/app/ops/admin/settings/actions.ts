"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { updateSetting } from "@/server/settings";
import { SETTING_DEFS, SETTING_KEYS, type SettingKey } from "@/config/settings";
import { invalid } from "@/domain/errors";
import { bool, reviewTag, str } from "../_lib/form";
import { fieldKind } from "./shape";

export async function saveSettingAction(key: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["admin"]);
    if (!(SETTING_KEYS as string[]).includes(key)) throw invalid("Unknown setting.");
    const k = key as SettingKey;
    const shape = SETTING_DEFS[k].default as Record<string, unknown>;
    const value: Record<string, unknown> = {};
    const fieldErrors: Record<string, string> = {};
    for (const [name, def] of Object.entries(shape)) {
      const kind = fieldKind(def);
      const raw = str(fd, name);
      if (kind === "boolean") value[name] = bool(fd, name);
      else if (kind === "number") value[name] = raw.trim() === "" ? Number.NaN : Number(raw);
      else if (kind === "lines") value[name] = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      else if (kind === "json") {
        try {
          value[name] = JSON.parse(raw);
        } catch {
          fieldErrors[name] = "This is not valid JSON.";
        }
      } else value[name] = raw;
    }
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors, values: Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string> };
    }
    await run(actor, (ctx) => updateSetting(ctx, k, value, reviewTag(fd)));
    revalidatePath("/ops/admin/settings");
    revalidatePath("/ops/admin/reviews");
    return { message: `${SETTING_DEFS[k].label} saved.` };
  }, fd);
}
