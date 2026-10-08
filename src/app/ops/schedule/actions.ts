"use server";

import { revalidatePath } from "next/cache";
import { requireStaffSession, run } from "@/server/auth/guards";
import { handle, type ActionState } from "@/server/web/action";
import { setAvailability } from "@/server/services/scheduling";
import { invalid } from "@/domain/errors";
import { TIME_ZONES, WINDOWS_PER_DAY } from "./constants";

const toMinutes = (v: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Replaces the signed-in clinician's weekly availability. */
export async function saveAvailabilityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
    if (!actor.clinicianId) throw invalid("Your account has no clinician profile.");
    const timeZone = String(fd.get("timeZone") ?? "");
    if (!TIME_ZONES.some(([z]) => z === timeZone)) throw invalid("Choose a time zone.");
    const rules: { weekday: number; startMinute: number; endMinute: number; timeZone: string }[] = [];
    const fieldErrors: Record<string, string> = {};
    for (let wd = 0; wd < 7; wd++) {
      for (let i = 0; i < WINDOWS_PER_DAY; i++) {
        const s = String(fd.get(`start_${wd}_${i}`) ?? "");
        const e = String(fd.get(`end_${wd}_${i}`) ?? "");
        if (!s && !e) continue;
        const sm = toMinutes(s);
        const em = toMinutes(e);
        if (sm === null || em === null || sm >= em) {
          fieldErrors[`end_${wd}_${i}`] = "Enter a start and an end time, with the end after the start.";
          continue;
        }
        rules.push({ weekday: wd, startMinute: sm, endMinute: em, timeZone });
      }
    }
    if (Object.keys(fieldErrors).length) return { ok: false, error: "Please check the highlighted times.", fieldErrors };
    await run(actor, (ctx) => setAvailability(ctx, actor.clinicianId!, rules));
    revalidatePath("/ops/schedule");
    return { message: rules.length ? "Availability saved." : "Availability cleared. Patients can't book with you until you add times." };
  }, fd);
}
