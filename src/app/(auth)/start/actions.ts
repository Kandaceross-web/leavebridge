"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withActor } from "@/server/db/actor";
import { requestMeta, clientIpKey } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import {
  createScreening,
  currentScreening,
  saveScreeningStep,
  SCREENING_COOKIE,
} from "@/server/services/screening";
import { env } from "@/server/env";
import { readAttribution } from "@/server/web/attribution";
import { handle, formAnswers, type ActionState } from "@/server/web/action";

const anon = { kind: "anonymous" as const };

export async function beginScreening(fd: FormData) {
  await rateLimit("screening", await clientIpKey());
  const ref = String(fd.get("ref") ?? "") || null;
  const meta = await requestMeta();
  const attribution = await readAttribution(String(fd.get("entry") ?? "") || null);
  const { token, maxAgeSeconds } = await withActor(anon, (ctx) => createScreening(ctx, ref, attribution), meta);
  const jar = await cookies();
  jar.set(SCREENING_COOKIE, token, {
    httpOnly: true,
    secure: env.APP_ORIGIN.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  redirect("/start/location");
}

export async function saveStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let dest: string | null = null;
  const stepKey = String(fd.get("step") ?? "");
  const res = await handle(async () => {
    await rateLimit("screening", await clientIpKey());
    const meta = await requestMeta();
    const out = await withActor(
      anon,
      async (ctx) => {
        const row = await currentScreening(ctx);
        if (!row) return { expired: true as const };
        return {
          expired: false as const,
          result: await saveScreeningStep(ctx, row, stepKey, formAnswers(fd)),
        };
      },
      meta,
    );
    if (out.expired) {
      dest = "/start?expired=1";
      return;
    }
    if (Object.keys(out.result.errors).length)
      return {
        ok: false,
        error: "Please answer the highlighted questions.",
        fieldErrors: out.result.errors,
        values: formAnswers(fd),
      };
    dest = out.result.done ? "/start/result" : `/start/${out.result.nextStep}`;
  });
  if (dest) redirect(dest);
  return res;
}
