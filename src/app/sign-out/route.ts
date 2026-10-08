import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth/session";
import { env } from "@/server/env";

/** POST-only sign-out (a GET link could be triggered cross-site). */
export async function POST() {
  await destroySession();
  return NextResponse.redirect(new URL("/sign-in?signed_out=1", env.APP_ORIGIN), 303);
}
