import "server-only";
import { cookies } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db/client";
import { clinicians, patients, sessions, userRoles, users } from "../db/schema";
import { randomToken, sha256Hex } from "../crypto";
import { env } from "../env";
import { getSetting } from "../settings";
import type { Actor } from "@/domain/actor";
import { STAFF_ROLES, type Role } from "@/domain/constants";

export const SESSION_COOKIE = env.APP_ENV === "production" || env.APP_ENV === "staging" ? "__Host-lb_session" : "lb_session";
const secureCookies = env.APP_ORIGIN.startsWith("https://");

export interface SessionInfo {
  tokenHash: string;
  userId: string;
  email: string;
  roles: Role[];
  patientId: string | null;
  clinicianId: string | null;
  firstName: string | null;
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  stepUpAt: Date | null;
  isStaff: boolean;
}

export async function activeRoles(userId: string): Promise<Role[]> {
  const rows = await db.select({ role: userRoles.role }).from(userRoles).where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));
  return rows.map((r) => r.role);
}

export async function createSession(userId: string, opts: { mfaVerified: boolean; ipHash: string | null }): Promise<void> {
  const roles = await activeRoles(userId);
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
  const sec = await getSetting(db, "security");
  const token = randomToken(32);
  const now = new Date();
  await db.insert(sessions).values({
    tokenHash: sha256Hex(token),
    userId,
    expiresAt: new Date(now.getTime() + sec.absoluteHours * 3_600_000),
    idleTimeoutSeconds: (isStaff ? sec.staffIdleMinutes : sec.patientIdleMinutes) * 60,
    mfaVerifiedAt: opts.mfaVerified ? now : null,
    ipHash: opts.ipHash,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: sec.absoluteHours * 3600,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, sha256Hex(token)));
  jar.delete(SESSION_COOKIE);
}

/** Loads and validates the session for this request (memoized per request). */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const [row] = await db
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  if (!row) return null;
  const now = Date.now();
  const { s, u } = row;
  if (s.revokedAt || s.expiresAt.getTime() < now || s.lastSeenAt.getTime() + s.idleTimeoutSeconds * 1000 < now || u.status !== "active") {
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
  }
  const roles = await activeRoles(u.id);
  // Patients table has RLS; read the profile inside a scoped transaction.
  const profile = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.actor_kind', 'system', true)`);
    const [p] = await tx.select({ id: patients.id, first: patients.legalFirstName, preferred: patients.preferredName }).from(patients).where(eq(patients.userId, u.id)).limit(1);
    const [c] = await tx.select({ id: clinicians.id, name: clinicians.displayName }).from(clinicians).where(eq(clinicians.userId, u.id)).limit(1);
    return { p, c };
  });
  return {
    tokenHash,
    userId: u.id,
    email: u.email,
    roles,
    patientId: profile.p?.id ?? null,
    clinicianId: profile.c?.id ?? null,
    firstName: profile.p ? (profile.p.preferred ?? profile.p.first) : (profile.c?.name ?? null),
    mfaEnrolled: Boolean(u.mfaEnabledAt),
    mfaVerified: Boolean(s.mfaVerifiedAt),
    stepUpAt: s.stepUpAt,
    isStaff: roles.some((r) => STAFF_ROLES.includes(r)),
  };
});

export function actorFromSession(s: SessionInfo | null): Actor {
  if (!s) return { kind: "anonymous" };
  if (s.isStaff) {
    return {
      kind: "staff",
      userId: s.userId,
      roles: s.roles.filter((r) => r !== "patient"),
      clinicianId: s.clinicianId,
      mfa: s.mfaVerified,
      stepUpAt: s.stepUpAt,
    };
  }
  if (s.patientId) return { kind: "patient", userId: s.userId, patientId: s.patientId, mfa: s.mfaVerified, stepUpAt: s.stepUpAt };
  return { kind: "anonymous" };
}

export async function markSessionMfa(tokenHash: string) {
  await db.update(sessions).set({ mfaVerifiedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
}

export async function markSessionStepUp(tokenHash: string) {
  await db.update(sessions).set({ stepUpAt: new Date() }).where(eq(sessions.tokenHash, tokenHash));
}
