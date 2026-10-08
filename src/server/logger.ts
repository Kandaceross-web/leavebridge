import "server-only";

/**
 * Operational logger with a field allow-list. Anything not on the list is dropped before
 * the line is written, so a careless `log.info("x", { answers })` cannot leak PHI.
 * Security-relevant events belong in the audit log (src/server/audit.ts), not here.
 */
const ALLOWED_FIELDS = new Set([
  "requestId",
  "route",
  "method",
  "status",
  "durationMs",
  "event",
  "errorName",
  "errorCode",
  "provider",
  "job",
  "count",
  "caseRef",
  "entity",
  "entityId",
  "outcome",
]);

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function sanitize(fields: Fields | undefined): Fields {
  const out: Fields = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

function write(level: Level, message: string, fields?: Fields) {
  if (process.env.APP_ENV === "test" && level === "debug") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg: message.slice(0, 200), ...sanitize(fields) });
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(line + "\n");
}

export const log = {
  debug: (m: string, f?: Fields) => write("debug", m, f),
  info: (m: string, f?: Fields) => write("info", m, f),
  warn: (m: string, f?: Fields) => write("warn", m, f),
  /** Logs only the error class and code, never the message (messages can contain input). */
  error: (m: string, err?: unknown, f?: Fields) => {
    const e = err as { name?: string; code?: string } | undefined;
    write("error", m, { ...f, errorName: e?.name ?? "Unknown", errorCode: e?.code });
  },
};

export const __testing = { sanitize };
