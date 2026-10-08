import "server-only";
import { eq, inArray } from "drizzle-orm";
import { SETTING_DEFS, SETTING_KEYS, type SettingKey, type SettingValue } from "@/config/settings";
import { settings } from "./db/schema";
import type { DbOrTx } from "./db/client";
import type { Ctx } from "./db/actor";
import { audit } from "./audit";
import { requireRole } from "@/domain/policy";

/** Reads a setting: DB override if valid, otherwise the typed default. */
export async function getSetting<K extends SettingKey>(tx: DbOrTx, key: K): Promise<SettingValue<K>> {
  const def = SETTING_DEFS[key];
  const [row] = await tx.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (row) {
    const parsed = def.schema.safeParse(row.value);
    if (parsed.success) return parsed.data as SettingValue<K>;
  }
  return def.default as SettingValue<K>;
}

export async function getSettings<K extends SettingKey>(tx: DbOrTx, keys: K[]): Promise<{ [P in K]: SettingValue<P> }> {
  const rows = await tx.select().from(settings).where(inArray(settings.key, keys));
  const out = {} as { [P in K]: SettingValue<P> };
  for (const key of keys) {
    const def = SETTING_DEFS[key];
    const row = rows.find((r) => r.key === key);
    const parsed = row ? def.schema.safeParse(row.value) : null;
    out[key] = (parsed?.success ? parsed.data : def.default) as SettingValue<K>;
  }
  return out;
}

export async function updateSetting<K extends SettingKey>(ctx: Ctx, key: K, value: unknown, reviewTag: string | null) {
  requireRole(ctx.actor, ["admin"]);
  if (!SETTING_KEYS.includes(key)) throw new Error("Unknown setting");
  const parsed = SETTING_DEFS[key].schema.parse(value);
  const actorId = ctx.actor.kind === "staff" ? ctx.actor.userId : null;
  await ctx.tx
    .insert(settings)
    .values({ key, value: parsed, reviewTag: (reviewTag as never) ?? null, updatedBy: actorId })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed, reviewTag: (reviewTag as never) ?? null, updatedBy: actorId, updatedAt: new Date() } });
  await audit(ctx, { action: "config.updated", subjectType: "setting", subjectId: key, metadata: { reviewTag: reviewTag ?? "none" } });
}

/** Effective review tag: an override's explicit tag (or null = cleared) wins over the default's. */
export async function settingReviewStatus(tx: DbOrTx) {
  const rows = await tx.select().from(settings);
  return SETTING_KEYS.map((key) => {
    const row = rows.find((r) => r.key === key);
    return {
      key,
      label: SETTING_DEFS[key].label,
      reviewTag: row ? row.reviewTag : SETTING_DEFS[key].reviewTag,
      reviewNote: SETTING_DEFS[key].reviewNote,
      overridden: Boolean(row),
    };
  });
}
