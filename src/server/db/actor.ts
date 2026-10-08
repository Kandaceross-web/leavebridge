import "server-only";
import { sql } from "drizzle-orm";
import { db, type Tx } from "./client";

import type { Actor } from "@/domain/actor";
export type { Actor };

/** Request-scoped context passed to every domain function. */
export interface Ctx {
  tx: Tx;
  actor: Actor;
  requestId: string | null;
  ipHash: string | null;
}

export async function withActor<T>(
  actor: Actor,
  fn: (ctx: Ctx) => Promise<T>,
  meta: { requestId?: string | null; ipHash?: string | null } = {},
): Promise<T> {
  return db.transaction(async (tx) => {
    const patientId = actor.kind === "patient" ? actor.patientId : "";
    await tx.execute(
      sql`select set_config('app.actor_kind', ${actor.kind}, true), set_config('app.patient_id', ${patientId}, true)`,
    );
    return fn({ tx, actor, requestId: meta.requestId ?? null, ipHash: meta.ipHash ?? null });
  });
}

export const systemActor = (reason: string): Actor => ({ kind: "system", reason });

export { actorUserId, actorRoleLabel } from "@/domain/actor";
