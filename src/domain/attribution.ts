import { z } from "zod";

/**
 * First-party marketing attribution. Answers "where did this person come from?" without any
 * third-party pixel. Collected only on marketing pages and the screening entry page, stored in a
 * first-party cookie, then copied onto the screening (and the case, if one is created).
 *
 * Privacy rules (SEC-05, LEG-14):
 *  - Only campaign parameters, the referring host and the landing path are kept. Never full
 *    referrer URLs, never query strings other than the allow-listed campaign keys, never IPs.
 *  - Ad click ids (gclid, msclkid, fbclid) are recorded as *which* network sent the click, never
 *    the id value, so nothing here can be matched back by an ad platform.
 *  - Nothing in this module is sent to any third party.
 */

export const CHANNELS = ["paid_search", "paid_social", "organic_search", "organic_social", "email", "partner", "referral", "direct", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

const token = z
  .string()
  .max(80)
  .regex(/^[\w .:/+-]*$/u);

export const touchSchema = z.object({
  channel: z.enum(CHANNELS),
  source: token.nullable(),
  medium: token.nullable(),
  campaign: token.nullable(),
  term: token.nullable(),
  content: token.nullable(),
  clickNetwork: z.enum(["google", "microsoft", "meta"]).nullable(),
  referrerHost: token.nullable(),
  landingPath: token.nullable(),
  at: z.string().max(40),
});
export type Touch = z.infer<typeof touchSchema>;

export const attributionSchema = z.object({ first: touchSchema, last: touchSchema });
export type Attribution = z.infer<typeof attributionSchema> & { entry?: string | null };

export const ATTRIBUTION_COOKIE = "lb_attr";
export const ATTRIBUTION_MAX_AGE = 90 * 86_400;

const SEARCH_HOSTS = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|baidu|yandex|startpage)\.[a-z.]+$/i;
const SOCIAL_HOSTS = /(^|\.)(facebook|fb|instagram|linkedin|lnkd|t|twitter|x|reddit|tiktok|youtube|youtu|pinterest|threads|nextdoor)\.[a-z.]+$|^t\.co$/i;
const EMAIL_HOSTS = /(^|\.)(mail\.google|outlook\.live|mail\.yahoo)\.[a-z.]+$/i;

/** Normalizes a campaign value: trims, lowercases, drops anything outside a safe character set. */
export function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v
    .trim()
    .toLowerCase()
    .replace(/[^\w .:/+-]/gu, "")
    .slice(0, 80);
  // A value that looks like an email address or a long number is not a campaign name; drop it.
  if (!s || /@/.test(v) || /\d{7,}/.test(s)) return null;
  return s;
}

function hostOf(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "").slice(0, 80);
  } catch {
    return null;
  }
}

/** Builds a touch from what a landing request carries. Returns null when there is no signal. */
export function touchFromRequest(input: { params: URLSearchParams; referrer: string | null; ownHosts: string[]; landingPath: string; now?: Date }): Touch | null {
  const p = input.params;
  const source = clean(p.get("utm_source"));
  const medium = clean(p.get("utm_medium"));
  const campaign = clean(p.get("utm_campaign"));
  const term = clean(p.get("utm_term"));
  const content = clean(p.get("utm_content"));
  const ref = clean(p.get("ref"));
  const clickNetwork = p.has("gclid") || p.has("gbraid") || p.has("wbraid") ? "google" : p.has("msclkid") ? "microsoft" : p.has("fbclid") ? "meta" : null;
  let referrerHost = hostOf(input.referrer);
  if (referrerHost && input.ownHosts.some((h) => h.replace(/^www\./, "") === referrerHost)) referrerHost = null;

  if (!source && !medium && !campaign && !clickNetwork && !referrerHost && !ref) return null;

  let channel: Channel;
  const m = medium ?? "";
  if (clickNetwork === "google" || clickNetwork === "microsoft" || /^(cpc|ppc|paid[-_ ]?search|sem)$/.test(m)) channel = "paid_search";
  else if (clickNetwork === "meta" || /^(paid[-_ ]?social|social[-_ ]?paid|cpm|display)$/.test(m)) channel = "paid_social";
  else if (/^e-?mail$|newsletter/.test(m)) channel = "email";
  else if (ref || /^(partner|referral[-_ ]?partner|employer)$/.test(m)) channel = "partner";
  else if (/^(social|organic[-_ ]?social)$/.test(m)) channel = "organic_social";
  else if (/^organic$/.test(m)) channel = "organic_search";
  else if (source || medium || campaign) channel = "other";
  else if (referrerHost && SEARCH_HOSTS.test(referrerHost)) channel = "organic_search";
  else if (referrerHost && SOCIAL_HOSTS.test(referrerHost)) channel = "organic_social";
  else if (referrerHost && EMAIL_HOSTS.test(referrerHost)) channel = "email";
  else channel = "referral";

  return {
    channel,
    source: source ?? (ref ? "partner-link" : referrerHost),
    medium,
    campaign: campaign ?? (ref ? `ref:${ref}` : null),
    term,
    content,
    clickNetwork,
    referrerHost,
    landingPath: clean(input.landingPath),
    at: (input.now ?? new Date()).toISOString(),
  };
}

export function directTouch(landingPath: string, now = new Date()): Touch {
  return { channel: "direct", source: null, medium: null, campaign: null, term: null, content: null, clickNetwork: null, referrerHost: null, landingPath: clean(landingPath), at: now.toISOString() };
}

export function encodeAttribution(a: { first: Touch; last: Touch }): string {
  return Buffer.from(JSON.stringify(a), "utf8").toString("base64url");
}

export function decodeAttribution(raw: string | null | undefined): { first: Touch; last: Touch } | null {
  if (!raw || raw.length > 3000) return null;
  try {
    const parsed = attributionSchema.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Next cookie value after a landing request. First touch is kept for the cookie's lifetime; last
 * touch moves only when the new visit carries a real signal (so a later direct visit does not
 * erase the campaign that brought someone in). Returns null when nothing needs to change.
 */
export function nextAttribution(current: { first: Touch; last: Touch } | null, touch: Touch | null, landingPath: string, now = new Date()): { first: Touch; last: Touch } | null {
  if (current && !touch) return null;
  if (!current) {
    const t = touch ?? directTouch(landingPath, now);
    return { first: t, last: t };
  }
  return { first: current.first, last: touch! };
}

/** Screening entry point label from a CTA link (?entry=home-hero). */
export function cleanEntry(v: string | null | undefined): string | null {
  return v && /^[a-z0-9-]{1,40}$/.test(v) ? v : null;
}

/** What is stored on screenings, cases and contact messages. */
export type StoredAttribution = { first: Touch; last: Touch; entry: string | null };
