/**
 * Content Security Policy for every page (used by src/proxy.ts; no server-only import because the proxy loads it).
 *
 * Video visit pages get exactly what the Amazon Chime SDK for JavaScript needs for audio and video, and only when
 * VIDEO_PROVIDER=chime: HTTPS and WebSocket connections to Chime's signaling, TURN and media hosts (*.chime.aws), and
 * blob: workers (the SDK runs its audio-redundancy transform in a worker built from a blob URL). Voice Focus and
 * background filters are not used, so no sdkassets scripts and no WebAssembly are allowed.
 */
export const VISIT_PATHS = [/^\/portal\/cases\/[0-9a-f-]{36}\/visit\/?$/i, /^\/ops\/visits\/[0-9a-f-]{36}\/?$/i];

export const isVisitPath = (pathname: string) => VISIT_PATHS.some((re) => re.test(pathname));

export const CHIME_CONNECT_SOURCES = ["https://*.chime.aws", "wss://*.chime.aws"] as const;

export function buildCsp(opts: { nonce: string; isDev: boolean; analyticsOrigin?: string; chime?: boolean }): string {
  const { nonce, isDev, chime } = opts;
  const analytics = opts.analyticsOrigin ? ` ${opts.analyticsOrigin}` : "";
  const video = chime ? ` ${CHIME_CONNECT_SOURCES.join(" ")}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}${analytics}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${analytics}${video}`,
    // child-src is the fallback for browsers without worker-src.
    ...(chime ? ["worker-src blob:", "child-src blob:"] : []),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
