import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db/client";
import { DomainError } from "@/domain/errors";

/**
 * Fixed-window rate limiter backed by Postgres so limits hold across instances.
 * The edge WAF provides coarse limits; these protect specific actions.
 */
export const LIMITS = {
  signIn: { max: 10, windowSeconds: 15 * 60 },
  signUp: { max: 5, windowSeconds: 60 * 60 },
  screening: { max: 60, windowSeconds: 60 * 60 },
  contact: { max: 5, windowSeconds: 60 * 60 },
  upload: { max: 30, windowSeconds: 60 * 60 },
  mfa: { max: 10, windowSeconds: 15 * 60 },
  message: { max: 30, windowSeconds: 60 * 60 },
  /** "Email me a link to continue": per screening, so the box cannot be used to flood an address. */
  continueLink: { max: 3, windowSeconds: 24 * 60 * 60 },
} as const;

export async function rateLimit(bucket: keyof typeof LIMITS, key: string): Promise<void> {
  const { max, windowSeconds } = LIMITS[bucket];
  const id = `${bucket}:${key}`;
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limit_buckets (key, count, reset_at)
    values (${id}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limit_buckets.reset_at < now() then 1 else rate_limit_buckets.count + 1 end,
      reset_at = case when rate_limit_buckets.reset_at < now() then now() + make_interval(secs => ${windowSeconds}) else rate_limit_buckets.reset_at end
    returning count`);
  const count = Number(result.rows[0]?.count ?? 0);
  if (count > max) throw new DomainError("rate_limited", "Too many attempts. Please wait a few minutes and try again.");
}
