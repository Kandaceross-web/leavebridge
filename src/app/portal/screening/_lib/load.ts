import "server-only";
import { requirePatientSession, run } from "@/server/auth/guards";
import { withActor, type Ctx } from "@/server/db/actor";
import { isEmailVerified } from "@/server/services/email-verification";
import { sameDayOverview } from "@/server/services/same-day";
import { orNotFound } from "../../_lib/load";

export type SameDayView = Awaited<ReturnType<typeof sameDayOverview>>;

/** The patient's own same-day screening plus anything else the page needs, in one transaction. 404 otherwise. */
export async function ownedScreening<T = undefined>(id: string, extra?: (ctx: Ctx, view: SameDayView) => Promise<T>) {
  const { actor, session } = await requirePatientSession();
  const out = await orNotFound(
    run(actor, async (ctx) => {
      const view = await sameDayOverview(ctx, id);
      const more = extra ? await extra(ctx, view) : (undefined as T);
      return { view, extra: more };
    }),
  );
  // The users table is internal; read the verification flag as the system for this one user.
  const emailVerified = await withActor({ kind: "system", reason: "email verification status" }, (ctx) => isEmailVerified(ctx, session.userId));
  return { actor, session, ...out, emailVerified };
}

export const screeningHref = (id: string) => `/portal/screening/${id}`;
