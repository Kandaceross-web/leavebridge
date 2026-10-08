import "server-only";
import { REVIEW_TAGS, type ReviewTag } from "@/domain/constants";
import { invalid } from "@/domain/errors";
import type { ActionState } from "@/server/web/action-state";

/* Small FormData readers shared by the admin console's server actions. */

export const str = (fd: FormData, name: string): string => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

/** Checkbox value: present means checked. */
export const bool = (fd: FormData, name: string): boolean => fd.get(name) !== null && fd.get(name) !== "";

/** Integer from a text field; NaN is passed through so zod reports the field. */
export const int = (fd: FormData, name: string): number => {
  const v = str(fd, name).trim();
  return v === "" ? Number.NaN : Number(v);
};

/** Review tag select: "" means none; anything else must be a known tag. */
export function reviewTag(fd: FormData, name = "reviewTag"): ReviewTag | null {
  const v = str(fd, name);
  if (!v) return null;
  if (!(REVIEW_TAGS as readonly string[]).includes(v)) throw invalid("Unknown review tag.");
  return v as ReviewTag;
}

/** Bound id arguments are encrypted by Next, but still shape-check them. */
export function uuid(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw invalid("Invalid id.");
  return id;
}

/**
 * handle() drops echoed values whose names contain "code" (to avoid echoing one-time codes), which
 * also drops fields like jurisdictionCode. Restore those non-secret fields after a failed submit.
 */
export function echoAlso(res: ActionState, fd: FormData, keys: string[]): ActionState {
  if (res.error && res.values) for (const k of keys) res.values[k] = str(fd, k);
  return res;
}
