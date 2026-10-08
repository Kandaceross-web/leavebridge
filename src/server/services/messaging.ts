import "server-only";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { cases, clinicians, messageReads, messages, messageThreads, notifications, patients, releaseAuthorizations, users } from "../db/schema";
import { audit } from "../audit";
import { decrypt, encrypt, encryptOptional } from "../crypto";
import { getSetting } from "../settings";
import { loadCase, notifyPatient } from "./cases";
import { forbidden, invalid, notFound } from "@/domain/errors";

/**
 * Secure messaging. Clinical threads are visible to the patient, the assigned clinician and
 * clinical directors; administrative threads to the patient and operations staff.
 * Messaging is not monitored in real time and is never for emergencies.
 */
export async function caseThreads(ctx: Ctx, caseId: string) {
  const { row, access } = await loadCase(ctx, caseId, ctx.actor.kind === "patient" ? "owner" : "operational");
  const threads = await ctx.tx.select().from(messageThreads).where(eq(messageThreads.caseId, row.id));
  const canClinical = access === "owner" || access === "clinical";
  return { row, threads: threads.filter((t) => t.category === "administrative" || canClinical), canClinical };
}

async function ensureThread(ctx: Ctx, caseId: string, category: "clinical" | "administrative") {
  const [t] = await ctx.tx.select().from(messageThreads).where(and(eq(messageThreads.caseId, caseId), eq(messageThreads.category, category))).limit(1);
  if (t) return t;
  const [created] = await ctx.tx.insert(messageThreads).values({ caseId, category }).returning();
  return created!;
}

export async function threadMessages(ctx: Ctx, caseId: string, category: "clinical" | "administrative") {
  const { row, canClinical } = await caseThreads(ctx, caseId);
  if (category === "clinical" && !canClinical) throw forbidden();
  const [t] = await ctx.tx.select().from(messageThreads).where(and(eq(messageThreads.caseId, row.id), eq(messageThreads.category, category))).limit(1);
  if (!t) return [];
  const rows = await ctx.tx
    .select({ m: messages, email: users.email })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderUserId))
    .where(eq(messages.threadId, t.id))
    .orderBy(messages.createdAt);
  const userId = ctx.actor.kind === "patient" || ctx.actor.kind === "staff" ? ctx.actor.userId : null;
  if (userId) {
    await ctx.tx.insert(messageReads).values({ threadId: t.id, userId, lastReadAt: new Date() }).onConflictDoUpdate({ target: [messageReads.threadId, messageReads.userId], set: { lastReadAt: new Date() } });
  }
  const senderIds = [...new Set(rows.map((r) => r.m.senderUserId))];
  const clin = senderIds.length ? await ctx.tx.select({ userId: clinicians.userId, name: clinicians.displayName, cred: clinicians.credentials }).from(clinicians).where(inArray(clinicians.userId, senderIds)) : [];
  const pats = senderIds.length ? await ctx.tx.select({ userId: patients.userId, first: patients.legalFirstName, pref: patients.preferredName }).from(patients).where(inArray(patients.userId, senderIds)) : [];
  return rows.map(({ m }) => {
    const c = clin.find((x) => x.userId === m.senderUserId);
    const p = pats.find((x) => x.userId === m.senderUserId);
    return {
      id: m.id,
      body: decrypt(m.body),
      createdAt: m.createdAt,
      mine: m.senderUserId === userId,
      sender: c ? `${c.name}, ${c.cred}` : p ? (p.pref ?? p.first) : "LeaveBridge care team",
      fromPatient: Boolean(p),
    };
  });
}

export async function sendMessage(ctx: Ctx, caseId: string, category: "clinical" | "administrative", body: string) {
  const features = await getSetting(ctx.tx, "features");
  if (!features.messaging) throw invalid("Secure messaging is not available right now.");
  const { row, canClinical } = await caseThreads(ctx, caseId);
  if (category === "clinical" && !canClinical) throw forbidden();
  if (ctx.actor.kind === "staff" && category === "clinical" && row.assignedClinicianId !== ctx.actor.clinicianId && !ctx.actor.roles.includes("clinical_director")) {
    throw forbidden("Only the assigned clinician can reply in the clinical thread.");
  }
  const text = body.trim();
  if (!text || text.length > 5000) throw invalid("Messages must be 1–5000 characters.");
  if (ctx.actor.kind !== "patient" && ctx.actor.kind !== "staff") throw forbidden();
  const t = await ensureThread(ctx, row.id, category);
  await ctx.tx.insert(messages).values({ threadId: t.id, senderUserId: ctx.actor.userId, body: encrypt(text) });
  await ctx.tx.update(messageThreads).set({ lastMessageAt: new Date() }).where(eq(messageThreads.id, t.id));
  await ctx.tx.update(cases).set({ lastActivityAt: new Date() }).where(eq(cases.id, row.id));
  await audit(ctx, { action: "message.sent", subjectType: "message_thread", subjectId: t.id, caseId: row.id, metadata: { category } });
  if (ctx.actor.kind === "staff") await notifyPatient(ctx, row, "new_message");
  else if (category === "clinical" && row.assignedClinicianId) {
    const [c] = await ctx.tx.select({ userId: clinicians.userId }).from(clinicians).where(eq(clinicians.id, row.assignedClinicianId)).limit(1);
    if (c) await ctx.tx.insert(notifications).values({ userId: c.userId, templateKey: "new_message", channel: "in_app", title: "New patient message", body: `Case ${row.reference}`, linkPath: `/ops/cases/${row.id}?tab=messages`, status: "sent", sentAt: new Date() });
  }
}

/** Unread counts per category for the current user across a set of cases. */
export async function unreadCount(ctx: Ctx, caseIds: string[]): Promise<number> {
  if (!caseIds.length || (ctx.actor.kind !== "patient" && ctx.actor.kind !== "staff")) return 0;
  const userId = ctx.actor.userId;
  const res = await ctx.tx.execute<{ n: number }>(sql`
    select count(*)::int as n from messages m
    join message_threads t on t.id = m.thread_id
    left join message_reads r on r.thread_id = t.id and r.user_id = ${userId}
    where t.case_id in (${sql.join(caseIds.map((id) => sql`${id}::uuid`), sql`, `)})
      and m.sender_user_id <> ${userId}
      and (r.last_read_at is null or m.created_at > r.last_read_at)`);
  return Number(res.rows[0]?.n ?? 0);
}

// ---- Notifications center ---------------------------------------------------------

export async function myNotifications(ctx: Ctx, limit = 30) {
  if (ctx.actor.kind !== "patient" && ctx.actor.kind !== "staff") return [];
  return ctx.tx.select().from(notifications).where(and(eq(notifications.userId, ctx.actor.userId), eq(notifications.channel, "in_app"))).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function unreadNotifications(ctx: Ctx) {
  if (ctx.actor.kind !== "patient" && ctx.actor.kind !== "staff") return 0;
  const [r] = await ctx.tx.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, ctx.actor.userId), eq(notifications.channel, "in_app"), isNull(notifications.readAt)));
  return Number(r?.n ?? 0);
}

export async function markNotificationsRead(ctx: Ctx) {
  if (ctx.actor.kind !== "patient" && ctx.actor.kind !== "staff") return;
  await ctx.tx.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, ctx.actor.userId), isNull(notifications.readAt)));
}

// ---- Release authorizations -------------------------------------------------------

export async function listReleases(ctx: Ctx, caseId: string) {
  await loadCase(ctx, caseId, ctx.actor.kind === "patient" ? "owner" : "operational");
  return ctx.tx.select().from(releaseAuthorizations).where(eq(releaseAuthorizations.caseId, caseId)).orderBy(desc(releaseAuthorizations.createdAt));
}

/** The patient names a recipient and scope. External sending remains behind a feature flag (LEG-07). */
export async function createRelease(ctx: Ctx, caseId: string, input: { recipientType: "employer" | "hr" | "leave_administrator" | "tpa"; recipientName: string; recipientContact: string; scope: string[]; expiresOn: string; typedName: string; legalName: string }) {
  if (ctx.actor.kind !== "patient") throw forbidden();
  const { row } = await loadCase(ctx, caseId, "owner");
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  if (norm(input.typedName) !== norm(input.legalName)) throw invalid("Type your full legal name to sign the authorization.");
  if (!input.recipientName.trim()) throw invalid("Name the recipient.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) || input.expiresOn <= new Date().toISOString().slice(0, 10)) throw invalid("Choose an expiration date in the future.");
  if (!input.scope.length) throw invalid("Choose at least one document type to share.");
  const [r] = await ctx.tx
    .insert(releaseAuthorizations)
    .values({ caseId: row.id, patientId: row.patientId, recipientType: input.recipientType, recipientName: input.recipientName.trim().slice(0, 200), recipientContact: encryptOptional(input.recipientContact.trim() || null), scope: input.scope, expiresOn: input.expiresOn })
    .returning({ id: releaseAuthorizations.id });
  await audit(ctx, { action: "release.authorized", subjectType: "release_authorization", subjectId: r!.id, caseId: row.id, metadata: { recipientType: input.recipientType } });
}

export async function revokeRelease(ctx: Ctx, releaseId: string) {
  const [r] = await ctx.tx.select().from(releaseAuthorizations).where(eq(releaseAuthorizations.id, releaseId)).limit(1);
  if (!r) throw notFound("Authorization");
  await loadCase(ctx, r.caseId, "owner");
  await ctx.tx.update(releaseAuthorizations).set({ revokedAt: new Date() }).where(and(eq(releaseAuthorizations.id, r.id), isNull(releaseAuthorizations.revokedAt)));
  await audit(ctx, { action: "release.revoked", subjectType: "release_authorization", subjectId: r.id, caseId: r.caseId });
}

export async function activeReleaseCount(ctx: Ctx, caseId: string) {
  const [r] = await ctx.tx.select({ n: sql<number>`count(*)::int` }).from(releaseAuthorizations).where(and(eq(releaseAuthorizations.caseId, caseId), isNull(releaseAuthorizations.revokedAt), gt(releaseAuthorizations.expiresOn, new Date().toISOString().slice(0, 10))));
  return Number(r?.n ?? 0);
}

