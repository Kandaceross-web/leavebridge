import "server-only";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { isDomainError } from "@/domain/errors";
import { log } from "../logger";
import type { ActionState } from "./action-state";

export type { ActionState };

/**
 * Wraps a server action body: domain errors become user-facing messages, validation errors map
 * to fields, redirects pass through, and anything unexpected is logged by error class only
 * (never request content) and shown as a generic message.
 */
export async function handle(fn: () => Promise<ActionState | void>, fd?: FormData): Promise<ActionState> {
  try {
    const res = await fn();
    return { ok: true, at: Date.now(), ...(res ?? {}) };
  } catch (err) {
    unstable_rethrow(err);
    if (isDomainError(err) && (err.code === "step_up_required" || err.code === "mfa_required")) {
      // Sensitive actions send the user to re-authenticate, then back to the page they were on.
      const back = await returnPath();
      redirect(`${err.code === "step_up_required" ? "/step-up" : "/mfa"}?next=${encodeURIComponent(back)}`);
    }
    const values = fd ? echoValues(fd) : undefined;
    if (isDomainError(err)) return { error: err.message, at: Date.now(), values };
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] ??= issue.message;
      }
      return { error: "Please check the highlighted fields.", fieldErrors, at: Date.now(), values };
    }
    log.error("action failed", err);
    return { error: "Something went wrong. Please try again, or contact support if it keeps happening.", at: Date.now(), values };
  }
}

/** Reads text fields from FormData (files are skipped). */
export function formFields(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

/** Reads text fields keeping multi-value keys as arrays. */
export function formAnswers(fd: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || k.startsWith("$ACTION")) continue;
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

/** Reads one uploaded file into memory (size is re-checked by the scanner). */
export async function formFile(fd: FormData, key: string): Promise<{ name: string; data: Buffer } | null> {
  const f = fd.get(key);
  if (!f || typeof f === "string" || f.size === 0) return null;
  return { name: f.name.slice(0, 200), data: Buffer.from(await f.arrayBuffer()) };
}

/** Text values to restore after a failed submit. Passwords and codes are never echoed. */
function echoValues(fd: FormData): Record<string, string | string[]> {
  const out = formAnswers(fd);
  for (const k of Object.keys(out)) if (/password|secret|token|^code$|^otp|totp/i.test(k)) delete out[k];
  return out;
}

async function returnPath(): Promise<string> {
  const h = await headers();
  const ref = h.get("referer");
  try {
    const u = ref ? new URL(ref) : null;
    if (u && /^\/(portal|ops)(\/|$)/.test(u.pathname)) return u.pathname + u.search;
  } catch {
    // fall through
  }
  return "/ops";
}
