import type { CSSProperties } from "react";
import { Badge, type Tone } from "@/components/ui";
import { OPS_FLAG_LABEL, type OpsFlag } from "@/server/services/ops";
import { STATUS_STAFF_LABEL } from "@/domain/cases/state-machine";
import type { CaseStatus } from "@/domain/constants";

/* Small presentational helpers shared by the ops overview, board, case list and workspace. */

export const ALERT_FLAGS: readonly OpsFlag[] = ["safety", "deadline_soon", "aging"];
export const QUIET_FLAGS: readonly OpsFlag[] = ["completed", "upcoming_appointments"];

export function flagTone(f: OpsFlag): Tone {
  if (ALERT_FLAGS.includes(f)) return "alert";
  if (QUIET_FLAGS.includes(f)) return "info";
  return "action";
}

export function FlagBadges({ flags, max }: { flags: readonly OpsFlag[]; max?: number }) {
  if (!flags.length) return <span className="muted small">—</span>;
  const shown = max ? flags.slice(0, max) : flags;
  return (
    <span className="row" style={{ "--gap": "4px" } as CSSProperties}>
      {shown.map((f) => (
        <Badge key={f} tone={flagTone(f)}>
          {OPS_FLAG_LABEL[f]}
        </Badge>
      ))}
      {max && flags.length > max ? <span className="muted small">+{flags.length - max} more</span> : null}
    </span>
  );
}

const STATUS_TONE: Partial<Record<CaseStatus, Tone>> = {
  submitted: "info",
  clinical_review: "progress",
  provider_review: "progress",
  provider_signature: "progress",
  info_requested: "action",
  appointment_needed: "action",
  awaiting_documents: "action",
  intake_incomplete: "action",
  completed: "done",
  delivered: "done",
  safety_hold: "alert",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{STATUS_STAFF_LABEL[status]}</Badge>;
}

/** Whole days since a date, as "today", "1 day", "5 days". */
export function age(from: Date, now = Date.now()): string {
  const d = Math.floor((now - from.getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "1 day" : `${d} days`;
}

export function PriorityBadge({ priority }: { priority: "normal" | "urgent" }) {
  return priority === "urgent" ? <Badge tone="alert">Urgent</Badge> : null;
}
