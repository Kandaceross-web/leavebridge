import "server-only";
import { cookies } from "next/headers";
import { ATTRIBUTION_COOKIE, cleanEntry, decodeAttribution, type StoredAttribution } from "@/domain/attribution";

/** Reads the first-party attribution cookie set by src/proxy.ts. Null when absent or invalid. */
export async function readAttribution(entry?: string | null): Promise<StoredAttribution | null> {
  const a = decodeAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  const e = cleanEntry(entry);
  if (!a) return e ? { first: emptyTouch(), last: emptyTouch(), entry: e } : null;
  return { ...a, entry: e };
}

function emptyTouch() {
  return { channel: "direct" as const, source: null, medium: null, campaign: null, term: null, content: null, clickNetwork: null, referrerHost: null, landingPath: null, at: new Date().toISOString() };
}
