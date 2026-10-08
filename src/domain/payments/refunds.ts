import type { CaseStatus } from "../constants";

export type RefundTrigger =
  | "before_intake_submitted"
  | "after_intake_before_review"
  | "clinician_out_of_scope"
  | "emergency_routed"
  | "no_show"
  | "late_cancel"
  | "after_determination";

export interface RefundRule {
  trigger: RefundTrigger;
  refundPercent: number;
  note: string;
}

/** Infers the default refund trigger from where the case is. Staff can choose another trigger. */
export function defaultTriggerFor(status: CaseStatus): RefundTrigger {
  switch (status) {
    case "started":
    case "intake_incomplete":
    case "awaiting_documents":
      return "before_intake_submitted";
    case "submitted":
      return "after_intake_before_review";
    case "safety_hold":
      return "emergency_routed";
    case "completed":
    case "delivered":
    case "closed":
    case "provider_signature":
      return "after_determination";
    default:
      return "after_intake_before_review";
  }
}

/**
 * Policy amount for a trigger, capped at what remains refundable. Anything above the policy
 * amount is an out-of-policy refund that requires a second approver.
 */
export function policyRefundCents(rules: readonly RefundRule[], trigger: RefundTrigger, paidCents: number, alreadyRefundedCents: number): number {
  const rule = rules.find((r) => r.trigger === trigger);
  const pct = rule ? rule.refundPercent : 0;
  const amount = Math.floor((paidCents * pct) / 100);
  return Math.max(0, Math.min(amount, paidCents - alreadyRefundedCents));
}

export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}
