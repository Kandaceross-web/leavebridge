/**
 * Optional error reporting to Sentry (SEC-11, owner decision Q43). Off unless SENTRY_DSN is set and SENTRY_BAA_SIGNED=1,
 * which states that Sentry has signed a BAA with the practice.
 *
 * Only what is needed to find a bug is sent: the error class, Next's error digest, the route *pattern* (e.g.
 * /portal/cases/[id], never the real path or query), the request method and the stack frames (function, file, line).
 * Never sent: error messages (they can echo input), request paths, headers, cookies, bodies, users or IP addresses.
 * There is no browser reporting. Sent with plain fetch to Sentry's envelope endpoint, so no SDK collects anything else.
 */

export interface ErrorReport {
  errorName: string;
  digest?: string;
  routePattern?: string;
  routeType?: string;
  method?: string;
  frames: { function?: string; filename?: string; lineno?: number; colno?: number }[];
}

interface Dsn {
  key: string;
  envelopeUrl: string;
  dsn: string;
}

export function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.split("/").filter(Boolean).at(-1);
    if (u.protocol !== "https:" || !u.username || !projectId || !/^\d+$/.test(projectId)) return null;
    return { key: u.username, dsn, envelopeUrl: `${u.origin}/api/${projectId}/envelope/` };
  } catch {
    return null;
  }
}

export function reportingConfig(e: Record<string, string | undefined> = process.env): Dsn | null {
  if (e.SENTRY_BAA_SIGNED !== "1") return null;
  return parseDsn(e.SENTRY_DSN);
}

/** Stack frames only; the first stack line (the message) is dropped. */
export function stackFrames(stack: string | undefined): ErrorReport["frames"] {
  if (!stack) return [];
  const frames: ErrorReport["frames"] = [];
  for (const line of stack.split("\n").slice(1)) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
    if (!m) continue;
    const filename = m[2]!.replace(/^.*?(\/(?:src|\.next|node_modules)\/)/, "$1");
    frames.push({ function: m[1]?.slice(0, 120), filename: filename.slice(0, 200), lineno: Number(m[3]), colno: Number(m[4]) });
  }
  return frames.slice(0, 50).reverse(); // Sentry expects the most recent call last
}

export function buildReport(err: unknown, request?: { method?: string }, context?: { routePath?: string; routeType?: string }): ErrorReport {
  const e = (typeof err === "object" && err !== null ? err : {}) as { name?: unknown; digest?: unknown; stack?: unknown };
  return {
    errorName: typeof e.name === "string" ? e.name.slice(0, 80) : "Error",
    digest: typeof e.digest === "string" ? e.digest.slice(0, 80) : undefined,
    routePattern: context?.routePath?.slice(0, 200),
    routeType: context?.routeType,
    method: request?.method,
    frames: stackFrames(typeof e.stack === "string" ? e.stack : undefined),
  };
}

export function envelope(report: ErrorReport, cfg: Dsn, appEnv: string, now = new Date()): string {
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: now.toISOString(),
    platform: "node",
    level: "error",
    environment: appEnv,
    server_name: "app",
    tags: { route: report.routePattern ?? "unknown", routeType: report.routeType ?? "unknown", method: report.method ?? "unknown", digest: report.digest ?? "none" },
    exception: { values: [{ type: report.errorName, value: "(message withheld)", stacktrace: { frames: report.frames } }] },
  };
  return [JSON.stringify({ event_id: eventId, dsn: cfg.dsn, sent_at: now.toISOString() }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
}

export async function reportError(err: unknown, request?: { method?: string }, context?: { routePath?: string; routeType?: string }): Promise<void> {
  const cfg = reportingConfig();
  if (!cfg) return;
  try {
    await fetch(cfg.envelopeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${cfg.key}, sentry_client=leavebridge/1.0` },
      body: envelope(buildReport(err, request, context), cfg, process.env.APP_ENV ?? "development"),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Reporting must never break a request.
  }
}
