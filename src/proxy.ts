import { NextResponse, type NextRequest } from "next/server";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, decodeAttribution, encodeAttribution, nextAttribution, touchFromRequest } from "@/domain/attribution";
import { buildCsp, isVisitPath } from "@/server/web/csp";

/**
 * Runs before every page request:
 *  - generates a per-request CSP nonce (strict script policy, no third-party scripts in the app),
 *  - assigns a request id for audit correlation,
 *  - in HOST_MODE=split, keeps marketing pages on the site host and everything that can touch
 *    PHI (screening, accounts, portal, ops) on the app host,
 *  - marks app responses no-store so PHI is never cached by browsers or shared caches,
 *  - records first-party campaign attribution (marketing pages and the screening entry only).
 */
const APP_PREFIXES = ["/start", "/sign-in", "/sign-up", "/sign-out", "/mfa", "/step-up", "/forgot-password", "/verify", "/verify-email", "/portal", "/ops", "/api"];

const isAppPath = (p: string) => APP_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostMode = process.env.HOST_MODE ?? "single";
  if (hostMode === "split") {
    const app = new URL(process.env.APP_ORIGIN ?? "http://localhost:3000");
    const site = new URL(process.env.SITE_ORIGIN ?? "http://localhost:3000");
    const host = request.headers.get("host") ?? "";
    if (host === site.host && isAppPath(pathname)) return NextResponse.redirect(new URL(pathname + search, app), 308);
    if (host === app.host && !isAppPath(pathname) && pathname !== "/" && !pathname.startsWith("/_next")) {
      return NextResponse.redirect(new URL(pathname + search, site), 308);
    }
    if (host === app.host && pathname === "/") return NextResponse.redirect(new URL("/portal", app), 307);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const analyticsOrigin = !isAppPath(pathname) && process.env.SITE_ANALYTICS_SRC ? new URL(process.env.SITE_ANALYTICS_SRC).origin : undefined;
  // Chime's signaling and media hosts are allowed on the two video visit pages only (see src/server/web/csp.ts).
  const chime = process.env.VIDEO_PROVIDER === "chime" && isVisitPath(pathname);
  const csp = buildCsp({ nonce, isDev, analyticsOrigin, chime });

  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Request-Id", requestId);
  recordAttribution(request, response);
  if (isAppPath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

/**
 * First-party attribution cookie. Only on page loads of marketing pages or /start (where ads and
 * referral links land); never on the portal, ops or API. See src/domain/attribution.ts.
 */
function recordAttribution(request: NextRequest, response: NextResponse) {
  const { pathname, searchParams } = request.nextUrl;
  if (request.method !== "GET" || (isAppPath(pathname) && pathname !== "/start")) return;
  if (!(request.headers.get("accept") ?? "").includes("text/html")) return;
  const ownHosts = [process.env.APP_ORIGIN, process.env.SITE_ORIGIN].flatMap((o) => {
    try {
      return o ? [new URL(o).hostname.toLowerCase()] : [];
    } catch {
      return [];
    }
  });
  const current = decodeAttribution(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
  const touch = touchFromRequest({ params: searchParams, referrer: request.headers.get("referer"), ownHosts: [...ownHosts, request.nextUrl.hostname], landingPath: pathname });
  const next = nextAttribution(current, touch, pathname);
  if (!next) return;
  response.cookies.set(ATTRIBUTION_COOKIE, encodeAttribution(next), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: ATTRIBUTION_MAX_AGE,
    // In HOST_MODE=split, set ATTRIBUTION_COOKIE_DOMAIN to the parent domain so the app host can read it.
    ...(process.env.ATTRIBUTION_COOKIE_DOMAIN ? { domain: process.env.ATTRIBUTION_COOKIE_DOMAIN } : {}),
  });
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|fonts).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
