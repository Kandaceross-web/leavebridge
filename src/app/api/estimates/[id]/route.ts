import { NextResponse } from "next/server";
import { run } from "@/server/auth/guards";
import { actorFromSession, getSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import { estimatePdf } from "@/server/services/estimates";
import { isDomainError } from "@/domain/errors";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Savable PDF copy of a Good Faith Estimate, rendered from the stored record. Same access rules as file downloads. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401, headers: noStore });
  if (session.isStaff) {
    const security = await getSetting(db, "security");
    if (security.requireStaffMfa && !session.mfaVerified) return new NextResponse("Two-step verification required", { status: 401, headers: noStore });
  }
  const actor = actorFromSession(session);
  if (actor.kind !== "patient" && actor.kind !== "staff") return new NextResponse("Sign in required", { status: 401, headers: noStore });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404, headers: noStore });
  try {
    const pdf = await run(actor, (ctx) => estimatePdf(ctx, id));
    return new NextResponse(new Uint8Array(pdf.data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.data.length),
        "Content-Disposition": `attachment; filename="${pdf.name.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) return new NextResponse("Not found", { status: 404, headers: noStore });
    throw e;
  }
}
