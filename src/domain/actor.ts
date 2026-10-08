import type { Role } from "./constants";

/**
 * Who is acting. Every database transaction runs "as" an actor so that Postgres
 * row-level security can enforce patient isolation independently of application code.
 */
export type Actor =
  | { kind: "anonymous" }
  | { kind: "patient"; userId: string; patientId: string; mfa: boolean; stepUpAt: Date | null }
  | {
      kind: "staff";
      userId: string;
      roles: Role[];
      clinicianId: string | null;
      mfa: boolean;
      stepUpAt: Date | null;
    }
  | { kind: "system"; reason: string };

export function actorUserId(actor: Actor): string | null {
  return actor.kind === "patient" || actor.kind === "staff" ? actor.userId : null;
}

export function actorRoleLabel(actor: Actor): string {
  if (actor.kind === "staff") return actor.roles.join(",");
  return actor.kind;
}
