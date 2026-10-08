import "server-only";
import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { cases, contactMessages, payments, screenings } from "../db/schema";
import { requireRole } from "@/domain/policy";
import type { StoredAttribution } from "@/domain/attribution";

/**
 * Acquisition funnel by marketing source, from first-party attribution only. For owners deciding
 * where to spend: which channels, campaigns, landing pages and calls to action lead to completed
 * screenings, accounts, payments and delivered documents.
 *
 * Minimum necessary: no names, case references or clinical outcomes. Emergency screenings are
 * excluded entirely. Counts of 1 to 4 are shown as "<5" so small groups cannot be singled out.
 */
export const GROUP_BY = ["channel", "source", "campaign", "landing", "entry", "term"] as const;
export type GroupBy = (typeof GROUP_BY)[number];

export interface FunnelRow {
  key: string;
  started: number;
  completed: number;
  canContinue: number;
  notAvailable: number;
  accounts: number;
  paid: number;
  delivered: number;
  revenueCents: number;
}

const DELIVERED = ["delivered", "closed"];

function keyFor(a: StoredAttribution | null, by: GroupBy, touch: "first" | "last"): string {
  if (!a) return by === "channel" ? "unknown (before tracking)" : "—";
  const t = a[touch];
  switch (by) {
    case "channel":
      return t.channel;
    case "source":
      return `${t.source ?? "(none)"} / ${t.medium ?? "(none)"}`;
    case "campaign":
      return t.campaign ?? "(none)";
    case "landing":
      return t.landingPath ?? "(unknown)";
    case "entry":
      return a.entry ?? "(none)";
    case "term":
      return t.term ?? "(not provided)";
  }
}

export async function acquisitionFunnel(ctx: Ctx, opts: { days: number; by: GroupBy; touch: "first" | "last" }) {
  requireRole(ctx.actor, ["admin"]);
  const since = new Date(Date.now() - opts.days * 86_400_000);
  const rows = await ctx.tx
    .select({ id: screenings.id, status: screenings.status, outcome: screenings.outcome, attribution: screenings.attribution, caseId: cases.id, caseStatus: cases.status })
    .from(screenings)
    .leftJoin(cases, eq(cases.screeningId, screenings.id))
    .where(and(gte(screenings.createdAt, since), sql`coalesce(${screenings.outcome}, '') <> 'EMERGENCY'`))
    .limit(100_000);

  const caseIds = rows.flatMap((r) => (r.caseId ? [r.caseId] : []));
  const paidByCase = new Map<string, number>();
  if (caseIds.length) {
    const paid = await ctx.tx
      .select({ caseId: payments.caseId, cents: sql<number>`sum(${payments.amountCents})::int` })
      .from(payments)
      .where(and(inArray(payments.caseId, caseIds), inArray(payments.status, ["paid", "partially_refunded"])))
      .groupBy(payments.caseId);
    for (const p of paid) paidByCase.set(p.caseId, Number(p.cents));
  }

  const groups = new Map<string, FunnelRow>();
  for (const r of rows) {
    const key = keyFor(r.attribution, opts.by, opts.touch);
    const g = groups.get(key) ?? { key, started: 0, completed: 0, canContinue: 0, notAvailable: 0, accounts: 0, paid: 0, delivered: 0, revenueCents: 0 };
    g.started++;
    if (r.outcome) g.completed++;
    if (r.outcome === "AVAILABLE" || r.outcome === "NEEDS_REVIEW") g.canContinue++;
    if (r.outcome === "NOT_AVAILABLE") g.notAvailable++;
    if (r.caseId) g.accounts++;
    const cents = r.caseId ? paidByCase.get(r.caseId) : undefined;
    if (cents) {
      g.paid++;
      g.revenueCents += cents;
    }
    if (r.caseStatus && DELIVERED.includes(r.caseStatus)) g.delivered++;
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.started - a.started);
  const total = list.reduce<FunnelRow>(
    (t, g) => ({ key: "All sources", started: t.started + g.started, completed: t.completed + g.completed, canContinue: t.canContinue + g.canContinue, notAvailable: t.notAvailable + g.notAvailable, accounts: t.accounts + g.accounts, paid: t.paid + g.paid, delivered: t.delivered + g.delivered, revenueCents: t.revenueCents + g.revenueCents }),
    { key: "All sources", started: 0, completed: 0, canContinue: 0, notAvailable: 0, accounts: 0, paid: 0, delivered: 0, revenueCents: 0 },
  );
  return { rows: list, total };
}

/**
 * Unserved demand: completed screenings from people in states we do not serve yet, by state.
 * The single strongest signal for which state to license next (OWN-02).
 */
export async function unservedDemand(ctx: Ctx, days: number) {
  requireRole(ctx.actor, ["admin"]);
  const since = new Date(Date.now() - days * 86_400_000);
  return ctx.tx
    .select({ state: screenings.stateCode, n: sql<number>`count(*)::int` })
    .from(screenings)
    .where(and(gte(screenings.createdAt, since), eq(screenings.outcome, "NOT_AVAILABLE"), sql`${screenings.stateCode} is not null`))
    .groupBy(screenings.stateCode)
    .orderBy(sql`count(*) desc`);
}

/** Contact and employer inquiries by channel (no message content). */
export async function inquiriesByChannel(ctx: Ctx, days: number) {
  requireRole(ctx.actor, ["admin"]);
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await ctx.tx.select({ topic: contactMessages.topic, attribution: contactMessages.attribution }).from(contactMessages).where(and(gte(contactMessages.createdAt, since), ne(contactMessages.topic, "")));
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.topic} · ${r.attribution?.last.channel ?? "unknown"}`;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return [...out.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
}

/** Shows small counts as "<5". */
export function suppress(n: number): string {
  return n === 0 ? "0" : n < 5 ? "<5" : String(n);
}

/** Percentage of b over a, or an en dash when either side is too small to mean anything. */
export function rate(num: number, den: number): string {
  if (den < 5 || num < 0) return "–";
  return `${Math.round((num / den) * 100)}%`;
}
