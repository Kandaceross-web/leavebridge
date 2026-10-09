/**
 * When a booked video visit can be joined: from a few minutes before the start until a grace period after the
 * scheduled end (late starts and reconnects). Outside it, the join check refuses and no video credentials are issued.
 */
export const VISIT_OPENS_MINUTES_BEFORE = 15;
export const VISIT_CLOSES_MINUTES_AFTER = 30;

export type VisitWindowState = "early" | "open" | "closed";

export function visitWindow(appt: { startsAt: Date; endsAt: Date }, now: Date = new Date()): { state: VisitWindowState; opensAt: Date; closesAt: Date } {
  const opensAt = new Date(appt.startsAt.getTime() - VISIT_OPENS_MINUTES_BEFORE * 60_000);
  const closesAt = new Date(appt.endsAt.getTime() + VISIT_CLOSES_MINUTES_AFTER * 60_000);
  const t = now.getTime();
  const state: VisitWindowState = t < opensAt.getTime() ? "early" : t > closesAt.getTime() ? "closed" : "open";
  return { state, opensAt, closesAt };
}
