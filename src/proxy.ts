import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every page request:
 *  - generates a per-request CSP nonce (strict script policy, no third-party scripts in the app),
 *  - assigns a request id for audit correlation,
 *  - in HOST_MODE=split, keeps marketing pages on the site host and everything that can touch
 *    PHI (screening, accounts, portal, ops) on the app host,
 *  - marks app responses no-store so PHI is never cached by browsers or shared caches.
 */
const APP_PREFIXES = ["/start", "/sign-in", "/sign-up", "/sign-out", "/mfa", "/step-up", "/forgot-password", "/portal", "/ops", "/api"];

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
  const analytics = !isAppPath(pathname) && process.env.SITE_ANALYTICS_SRC ? ` ${new URL(process.env.SITE_ANALYTICS_SRC).origin}` : "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}${analytics}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${analytics}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Request-Id", requestId);
  if (isAppPath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
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
