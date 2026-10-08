import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Icon } from "@/components/ui";
import { REVIEW_TAGS } from "@/domain/constants";
import { isDomainError } from "@/domain/errors";
import type { ActionState } from "@/server/web/action";
import s from "./admin.module.css";

export const REVIEW_TAG_OPTIONS = REVIEW_TAGS.map((t) => ({ value: t, label: t }));

export const label = (v: string) => v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Detail pages: not_found/forbidden become a 404 so the existence of a record is not revealed. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  }
}

/** One-button form posting to a server action, with optional hidden fields. Shows the result inline. */
export function InlineAction({
  action,
  children,
  fields,
  variant = "secondary",
  pendingText,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  fields?: Record<string, string>;
  variant?: "primary" | "secondary" | "danger" | "sage" | "quiet";
  pendingText?: string;
}) {
  return (
    <ActionForm action={action} className={s.inline}>
      {Object.entries(fields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton size="sm" variant={variant} pendingText={pendingText}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}

export function CheckItem({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li>
      <Icon name={ok ? "check" : "x"} label={ok ? "Passes" : "Does not pass"} />
      <span>{children}</span>
    </li>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return (
    <span className={s.yesno}>
      <Icon name={value ? "check" : "x"} />
      {value ? "Yes" : "No"}
    </span>
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  return <pre className={s.pre}>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>;
}

export const REVIEW_TYPE_OPTIONS = ["state_rule", "legal", "clinical", "security", "owner"].map((v) => ({ value: v, label: label(v) }));
export const OUTCOME_OPTIONS = [
  { value: "approved", label: "Signed off" },
  { value: "changes_requested", label: "Changes requested" },
];
