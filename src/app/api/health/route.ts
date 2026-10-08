import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

/** Load-balancer health check. Reports only up/down; no version, config or data. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
