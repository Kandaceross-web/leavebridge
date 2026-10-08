"use server";

import { revalidatePath } from "next/cache";
import { requirePatientSession, run } from "@/server/auth/guards";
import { profileSchema, updatePatientProfile } from "@/server/services/accounts";
import { handle, formFields, type ActionState } from "@/server/web/action";
import { TIME_ZONES } from "./zones";
import { invalid } from "@/domain/errors";

export async function saveProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const f = formFields(fd);
    if (!TIME_ZONES.some((z) => z.value === f.timeZone)) throw invalid("Choose a time zone from the list.");
    const input = profileSchema.parse({
      preferredName: f.preferredName ?? "",
      phone: f.phone ?? "",
      timeZone: f.timeZone,
      emailNotifications: f.emailNotifications === "yes",
      smsNotifications: f.smsNotifications === "yes",
    });
    await run(actor, (ctx) => updatePatientProfile(ctx, input));
    revalidatePath("/portal", "layout");
    return { message: "Your settings were saved." };
  }, fd);
}
