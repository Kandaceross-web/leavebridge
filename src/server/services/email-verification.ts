import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { emailVerificationTokens, users } from "../db/schema";
import { audit } from "../audit";
import { hmac, randomToken } from "../crypto";
import { env } from "../env";
import { log } from "../logger";
import { messageProvider } from "../providers/messaging";
import { rateLimit } from "../rate-limit";
import { getSetting } from "../settings";
import { forbidden } from "@/domain/errors";

/**
 * Email verification for the Same-Day Mental Health Assessment (payment requires a verified address,
 * because the finished record is announced by email). Same pattern as the continue link: a random
 * single-use token, only its HMAC stored, a neutral email with the brand, the link and its expiry.
 * Runs as the system actor (the token table is internal only).
 */
export const VERIFY_EMAIL_KEY = "email_verification";

const tokenHash = (token: string) => hmac(`verify-email:${token}`);
const wellFormed = (token: string) => /^[A-Za-z0-9_-]{20,100}$/.test(token);

export function verificationEmail(brandName: string, link: string, hours: number): { subject: string; body: string } {
  return {
    subject: `Confirm your email for ${brandName}`,
    body: [
      `Please confirm this email address for your ${brandName} account:`,
      link,
      `The link works once and expires in ${hours} hours. If you did not create an account, you can ignore this email.`,
    ].join("\n\n"),
  };
}

export async function isEmailVerified(ctx: Ctx, userId: string): Promise<boolean> {
  const [u] = await ctx.tx.select({ at: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  return Boolean(u?.at);
}

/** Sends a verification link, replacing any unused earlier link. Rate limited per user. */
export async function sendVerificationEmail(ctx: Ctx, userId: string): Promise<"sent" | "already_verified"> {
  if (ctx.actor.kind !== "system") throw forbidden();
  const [u] = await ctx.tx.select({ email: users.email, verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw forbidden();
  if (u.verifiedAt) return "already_verified";
  await rateLimit("verifyEmail", userId);
  const setting = await getSetting(ctx.tx, "sameDayScreening");
  const brand = await getSetting(ctx.tx, "brand");
  const token = randomToken(32);
  await ctx.tx.delete(emailVerificationTokens).where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
  await ctx.tx.insert(emailVerificationTokens).values({ userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + setting.emailLinkHours * 3_600_000) });
  const { subject, body } = verificationEmail(brand.name, `${env.APP_ORIGIN}/verify-email/${token}`, setting.emailLinkHours);
  try {
    await messageProvider("email").send({ channel: "email", to: u.email, subject, body, templateKey: VERIFY_EMAIL_KEY });
  } catch (err) {
    log.error("verification email failed", err, { event: VERIFY_EMAIL_KEY, provider: "email" });
  }
  await audit(ctx, { action: "email.verification_sent", subjectType: "user", subjectId: userId });
  return "sent";
}

/** Whether a link would still work, without using it. */
export async function verificationLinkUsable(ctx: Ctx, token: string): Promise<boolean> {
  if (!wellFormed(token)) return false;
  const [row] = await ctx.tx
    .select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, tokenHash(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
}

/** Uses a link once and marks the address verified. Returns false for unknown, used or expired links. */
export async function confirmEmail(ctx: Ctx, token: string): Promise<boolean> {
  if (ctx.actor.kind !== "system") throw forbidden();
  if (!wellFormed(token)) return false;
  const [row] = await ctx.tx
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.tokenHash, tokenHash(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .returning();
  if (!row) return false;
  await ctx.tx.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(and(eq(users.id, row.userId), isNull(users.emailVerifiedAt)));
  await audit(ctx, { action: "email.verified", subjectType: "user", subjectId: row.userId });
  return true;
}
