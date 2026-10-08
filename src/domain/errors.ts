/**
 * Domain errors carry a safe, user-presentable message. They never include input values,
 * so they can be shown in the UI and logged by class name without leaking PHI.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: "not_found" | "forbidden" | "conflict" | "invalid" | "unauthenticated" | "step_up_required" | "mfa_required" | "rate_limited",
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (what = "Record") => new DomainError("not_found", `${what} not found.`);
export const forbidden = (msg = "You do not have access to this.") => new DomainError("forbidden", msg);
export const conflict = (msg: string) => new DomainError("conflict", msg);
export const invalid = (msg: string) => new DomainError("invalid", msg);

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
