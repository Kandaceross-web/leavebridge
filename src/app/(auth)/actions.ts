"use server";

import { redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { requestMeta, clientIpKey } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { createSession, destroySession, getSession, markSessionMfa, markSessionStepUp } from "@/server/auth/session";
import { signInSchema, signUp, signUpSchema, verifyCredentials, verifyStepUp, verifyTotpForUser, beginTotpEnrollment, userMfaState } from "@/server/services/accounts";
import { clearScreeningCookie, currentScreening } from "@/server/services/screening";
import { handle, formFields, type ActionState } from "@/server/web/action";
import { DomainError } from "@/domain/errors";

const system = { kind: "system" as const, reason: "auth" };

/** Only same-site relative paths are allowed as post-login destinations. */
function safeNext(next: string | undefined, fallback: string) {
  return next && /^\/(portal|ops)(\/|$|\?)/.test(next) && !next.startsWith("//") ? next : fallback;
}

export async function signInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "/portal";
  const res = await handle(async () => {
    const meta = await requestMeta();
    await rateLimit("signIn", await clientIpKey());
    const input = signInSchema.parse(formFields(fd));
    const { userId } = await withActor(system, (ctx) => verifyCredentials(ctx, input.email, input.password), meta);
    const mfa = await withActor(system, (ctx) => userMfaState(ctx, userId));
    await createSession(userId, { mfaVerified: false, ipHash: meta.ipHash });
    const s = await getSession();
    if (s?.isStaff || mfa.enabled) dest = `/mfa${fd.get("next") ? `?next=${encodeURIComponent(String(fd.get("next")))}` : ""}`;
    else dest = safeNext(String(fd.get("next") ?? ""), "/portal");
  }, fd);
  if (res.error) return res;
  redirect(dest);
}

export async function signUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let caseId = "";
  const res = await handle(async () => {
    const meta = await requestMeta();
    await rateLimit("signUp", await clientIpKey());
    const screening = await withActor({ kind: "anonymous" }, (ctx) => currentScreening(ctx));
    if (!screening || screening.status !== "completed" || !["AVAILABLE", "NEEDS_REVIEW"].includes(screening.outcome ?? "")) {
      throw new DomainError("invalid", "Please complete the availability questions before creating an account.");
    }
    const input = signUpSchema.parse(formFields(fd));
    const out = await withActor(system, (ctx) => signUp(ctx, input, screening), meta);
    caseId = out.caseId;
    await createSession(out.userId, { mfaVerified: false, ipHash: meta.ipHash });
    await clearScreeningCookie();
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}?welcome=1`);
}

export async function mfaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "/ops";
  const res = await handle(async () => {
    const s = await getSession();
    if (!s) redirect("/sign-in");
    await rateLimit("mfa", s.userId);
    const code = String(fd.get("code") ?? "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) throw new DomainError("invalid", "Enter the 6-digit code from your authenticator app.");
    const ok = await withActor(system, (ctx) => verifyTotpForUser(ctx, s.userId, code), await requestMeta());
    if (!ok) throw new DomainError("invalid", "That code didn't work. Check the time on your device and try again.");
    await markSessionMfa(s.tokenHash);
    dest = safeNext(String(fd.get("next") ?? ""), s.isStaff ? "/ops" : "/portal");
  }, fd);
  if (res.error) return res;
  redirect(dest);
}

export async function enrollmentSecret(): Promise<{ secret: string; email: string } | null> {
  const s = await getSession();
  if (!s) return null;
  const state = await withActor(system, (ctx) => userMfaState(ctx, s.userId));
  if (state.enabled) return null;
  const secret = await withActor(system, (ctx) => beginTotpEnrollment(ctx, s.userId));
  return { secret, email: state.email };
}

export async function stepUpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest = "/ops";
  const res = await handle(async () => {
    const s = await getSession();
    if (!s) redirect("/sign-in");
    await rateLimit("mfa", s.userId);
    const ok = await withActor(system, (ctx) => verifyStepUp(ctx, s.userId, String(fd.get("password") ?? "")), await requestMeta());
    if (!ok) throw new DomainError("invalid", "That password didn't match.");
    await markSessionStepUp(s.tokenHash);
    dest = safeNext(String(fd.get("next") ?? ""), s.isStaff ? "/ops" : "/portal");
  }, fd);
  if (res.error) return res;
  redirect(dest);
}

export async function signOutAction() {
  await destroySession();
  redirect("/sign-in?signed_out=1");
}
