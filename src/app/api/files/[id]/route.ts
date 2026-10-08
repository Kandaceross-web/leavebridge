import { NextResponse } from "next/server";
import { run } from "@/server/auth/guards";
import { actorFromSession, getSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getSetting } from "@/server/settings";
import { authorizeFileDownload } from "@/server/services/files";
import { isDomainError } from "@/domain/errors";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = { "application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg", "image/heic": ".heic" };

/** ASCII-only, quote-free file name for Content-Disposition. Never more than displayName already reveals. */
function safeFileName(name: string, mime: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\/;:*?<>|%]+/g, "_")
    .trim()
    .slice(0, 100);
  const base = ascii || "document";
  const ext = EXT[mime];
  return ext && !base.toLowerCase().endsWith(ext) ? `${base}${ext}` : base;
}

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401, headers: { "Cache-Control": "no-store" } });
  if (session.isStaff) {
    const security = await getSetting(db, "security");
    if (security.requireStaffMfa && !session.mfaVerified) return new NextResponse("Two-step verification required", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const actor = actorFromSession(session);
  if (actor.kind !== "patient" && actor.kind !== "staff") return new NextResponse("Sign in required", { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const file = await run(actor, (ctx) => authorizeFileDownload(ctx, id));
    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(file.data.length),
        "Content-Disposition": `attachment; filename="${safeFileName(file.name, file.mime)}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) return notFound();
    throw e;
  }
}
