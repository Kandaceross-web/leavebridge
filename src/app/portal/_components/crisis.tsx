import "server-only";
import { db } from "@/server/db/client";
import { getSetting } from "@/server/settings";

/** Crisis resources from the `crisis` setting (CLN-01/CLN-02 pending review), passed to SafetyGate. */
export async function crisisContent() {
  return getSetting(db, "crisis");
}
