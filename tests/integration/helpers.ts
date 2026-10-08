import { withActor } from "@/server/db/actor";
import { loadFixtureStaff } from "@/server/fixtures/reference";
import type { FixtureStaff } from "@/server/fixtures/reference";
import { registerPatient, runScreening, type ScreeningAnswers } from "@/server/fixtures/journey";

let cached: FixtureStaff | null = null;
export async function staff(): Promise<FixtureStaff> {
  cached ??= await withActor({ kind: "system", reason: "test" }, (ctx) => loadFixtureStaff(ctx));
  return cached;
}

export async function newPatient(first = "Test", last = "Patient", overrides: ScreeningAnswers = {}) {
  const { screening, outcome } = await runScreening(overrides);
  if (outcome !== "AVAILABLE" && outcome !== "NEEDS_REVIEW") throw new Error(`Screening outcome ${outcome}`);
  return registerPatient(screening, { first, last });
}

/** Expects a promise to reject with a DomainError code (or any error when code is omitted). */
export async function rejects(p: Promise<unknown>, code?: string) {
  try {
    await p;
  } catch (err) {
    if (code && (err as { code?: string }).code !== code) throw new Error(`Expected ${code}, got ${(err as { code?: string }).code}: ${(err as Error).message}`);
    return err as Error;
  }
  throw new Error("Expected rejection");
}
