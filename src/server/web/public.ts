import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db } from "../db/client";
import { clinicians, contentEntries, jurisdictions, organizations, prices, services } from "../db/schema";
import { getSettings } from "../settings";
import { env } from "../env";

/**
 * Read-only data for public marketing pages. These tables hold configuration only (no PHI and
 * no row-level security), so they are read directly. Memoized per request.
 */

export const siteSettings = cache(() => getSettings(db, ["brand", "pricing", "refundPolicy", "turnaround", "crisis", "features"]));

export const isProduction = env.APP_ENV === "production";

export const enabledServices = cache(async () => {
  const now = new Date();
  const rows = await db.select().from(services).where(eq(services.enabled, true)).orderBy(asc(services.displayOrder));
  const out = [];
  for (const s of rows) {
    const [p] = await db
      .select()
      .from(prices)
      .where(and(eq(prices.serviceId, s.id), eq(prices.payerType, "self_pay"), lte(prices.effectiveFrom, now), or(isNull(prices.effectiveTo), gt(prices.effectiveTo, now))))
      .orderBy(desc(prices.effectiveFrom))
      .limit(1);
    out.push({ ...s, priceCents: p?.amountCents ?? null });
  }
  return out;
});

export const allServices = cache(() => db.select().from(services).orderBy(asc(services.displayOrder)));

/** The launch price shown in marketing copy: the primary enabled service's current price. */
export const launchPriceCents = cache(async () => (await enabledServices())[0]?.priceCents ?? null);

export const activeStates = cache(() => db.select({ code: jurisdictions.code, name: jurisdictions.name }).from(jurisdictions).where(eq(jurisdictions.isActive, true)).orderBy(asc(jurisdictions.name)));

export const publishedFaq = cache(() =>
  db.select().from(contentEntries).where(and(eq(contentEntries.kind, "faq"), eq(contentEntries.status, "published"))).orderBy(asc(contentEntries.category), asc(contentEntries.sortOrder)),
);

export const legalPages = cache(() =>
  db.select({ key: contentEntries.key, title: contentEntries.title }).from(contentEntries).where(and(eq(contentEntries.kind, "legal"), eq(contentEntries.status, "published"))).orderBy(asc(contentEntries.sortOrder)),
);

export const legalPage = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  const [row] = await db.select().from(contentEntries).where(and(eq(contentEntries.key, `legal.${slug}`), eq(contentEntries.status, "published"))).limit(1);
  return row ?? null;
});

export const publicClinicians = cache(() =>
  db.select({ id: clinicians.id, displayName: clinicians.displayName, credentials: clinicians.credentials, bio: clinicians.bio }).from(clinicians).where(and(eq(clinicians.publicProfile, true), eq(clinicians.status, "active"))).orderBy(asc(clinicians.displayName)),
);

export const referralOrg = cache(async (code: string) => {
  if (!/^[a-z0-9-]{3,40}$/i.test(code)) return null;
  const rows = await db.select({ id: organizations.id, name: organizations.name, kind: organizations.kind, headline: organizations.landingHeadline, code: organizations.referralCode, active: organizations.active }).from(organizations);
  return rows.find((r) => r.active && r.code.toLowerCase() === code.toLowerCase()) ?? null;
});

const slugOk = (slug: string) => /^[a-z0-9-]{2,80}$/.test(slug);

export const publishedResources = cache(() =>
  db
    .select({ key: contentEntries.key, title: contentEntries.title, category: contentEntries.category, bodyMd: contentEntries.bodyMd, updatedAt: contentEntries.updatedAt })
    .from(contentEntries)
    .where(and(eq(contentEntries.kind, "resource"), eq(contentEntries.status, "published")))
    .orderBy(asc(contentEntries.sortOrder)),
);

export const resourcePage = cache(async (slug: string) => {
  if (!slugOk(slug)) return null;
  const [row] = await db.select().from(contentEntries).where(and(eq(contentEntries.kind, "resource"), eq(contentEntries.key, `resource.${slug}`), eq(contentEntries.status, "published"))).limit(1);
  return row ?? null;
});

/** The first paragraph of a guide, used as its summary and meta description. */
export function summaryOf(bodyMd: string): string {
  const first = bodyMd.replace(/\r/g, "").split(/\n{2,}/).find((b) => b.trim() && !/^[#>-]/.test(b.trim())) ?? "";
  return first.replace(/\*\*|\[([^\]]+)\]\([^)]+\)/g, "$1").trim().slice(0, 300);
}

export const stateSlug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

/**
 * State pages: a published "state" content entry whose slug matches a configured jurisdiction.
 * A state with no real state-specific content has no page, so there are no doorway pages.
 */
export const statePages = cache(async () => {
  const [rows, states] = await Promise.all([
    db.select().from(contentEntries).where(and(eq(contentEntries.kind, "state"), eq(contentEntries.status, "published"))).orderBy(asc(contentEntries.sortOrder)),
    db.select({ code: jurisdictions.code, name: jurisdictions.name, isActive: jurisdictions.isActive }).from(jurisdictions),
  ]);
  return rows.flatMap((row) => {
    const slug = row.key.replace(/^state\./, "");
    const state = states.find((s) => stateSlug(s.name) === slug);
    return state ? [{ ...row, slug, state }] : [];
  });
});

export const statePage = cache(async (slug: string) => (slugOk(slug) ? ((await statePages()).find((p) => p.slug === slug) ?? null) : null));
