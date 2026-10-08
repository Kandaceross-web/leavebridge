import "server-only";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { hmac } from "./crypto";

/** Request metadata for audit records. IPs are stored only as keyed hashes. */
export async function requestMeta(): Promise<{ requestId: string; ipHash: string | null }> {
  const h = await headers();
  const requestId = h.get("x-request-id") ?? randomUUID();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  return { requestId, ipHash: ip ? hmac(`ip:${ip}`).slice(0, 32) : null };
}

export async function clientIpKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return hmac(`rl:${ip}`).slice(0, 24);
}
