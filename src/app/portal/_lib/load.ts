import "server-only";
import { notFound } from "next/navigation";
import { isDomainError } from "@/domain/errors";
import { requirePatientSession, run } from "@/server/auth/guards";
import { loadCase, patientChecklist } from "@/server/services/cases";
import type { Ctx } from "@/server/db/actor";

/** Detail pages never reveal whether a record exists: not_found and forbidden both become a 404. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
}

/** Loads the patient's own case plus anything else the page needs in the same transaction. */
export async function ownedCase<T = undefined>(id: string, extra?: (ctx: Ctx, row: Awaited<ReturnType<typeof loadCase>>["row"]) => Promise<T>) {
  const { actor, session } = await requirePatientSession();
  return orNotFound(
    run(actor, async (ctx) => {
      const { row } = await loadCase(ctx, id, "owner");
      const steps = await patientChecklist(ctx, row);
      const more = extra ? await extra(ctx, row) : (undefined as T);
      return { actor, session, row, steps, extra: more };
    }),
  );
}
