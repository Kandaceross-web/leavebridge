import "server-only";
import { redirect } from "next/navigation";
import { actorFromSession, getSession, type SessionInfo } from "./session";
import { withActor, type Ctx } from "../db/actor";
import { requestMeta } from "../request";
import { getSetting } from "../settings";
import { db } from "../db/client";
import type { Actor } from "@/domain/actor";
import type { Role } from "@/domain/constants";

/** Runs a unit of work as the given actor with request metadata attached. */
export async function run<T>(actor: Actor, fn: (ctx: Ctx) => Promise<T>): Promise<T> {
  return withActor(actor, fn, await requestMeta());
}

export async function requirePatientSession(): Promise<{ session: SessionInfo; actor: Extract<Actor, { kind: "patient" }> }> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.isStaff) redirect("/ops");
  const actor = actorFromSession(session);
  if (actor.kind !== "patient") redirect("/sign-in");
  return { session, actor };
}

export async function requireStaffSession(roles?: readonly Role[]): Promise<{ session: SessionInfo; actor: Extract<Actor, { kind: "staff" }> }> {
  const session = await getSession();
  if (!session) redirect("/sign-in?staff=1");
  if (!session.isStaff) redirect("/portal");
  const security = await getSetting(db, "security");
  if (security.requireStaffMfa && !session.mfaVerified) redirect("/mfa");
  const actor = actorFromSession(session);
  if (actor.kind !== "staff") redirect("/sign-in");
  if (roles && !actor.roles.some((r) => roles.includes(r))) redirect("/ops?denied=1");
  return { session, actor };
}
