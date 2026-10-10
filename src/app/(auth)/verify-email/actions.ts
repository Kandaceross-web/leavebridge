"use server";

import { redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { clientIpKey, requestMeta } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { confirmEmail } from "@/server/services/email-verification";

/** Uses the link (bound argument, never a form field) and marks the address confirmed. */
export async function confirmEmailAction(token: string): Promise<void> {
  await rateLimit("screening", await clientIpKey());
  const ok = await withActor({ kind: "system", reason: "email verification" }, (ctx) => confirmEmail(ctx, token), await requestMeta());
  redirect(ok ? "/verify-email/done" : `/verify-email/${encodeURIComponent(token)}`);
}
