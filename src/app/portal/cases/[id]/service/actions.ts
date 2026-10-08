"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePatientSession, run } from "@/server/auth/guards";
import { selectService } from "@/server/services/cases";
import { handle, formFields, type ActionState } from "@/server/web/action";
import { LEAVE_TYPES } from "@/domain/constants";

const schema = z.object({
  serviceId: z.string({ message: "Choose a service." }).uuid("Choose a service."),
  leaveType: z.enum(LEAVE_TYPES, { message: "Choose the type of leave you are requesting." }),
  deadline: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date."),
  employerName: z
    .string()
    .trim()
    .max(200, "Use 200 characters or fewer.")
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function saveService(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { actor } = await requirePatientSession();
    const input = schema.parse(formFields(fd));
    await run(actor, (ctx) => selectService(ctx, caseId, input));
    revalidatePath(`/portal/cases/${caseId}`);
  }, fd);
  if (res.error) return res;
  redirect(`/portal/cases/${caseId}/verify`);
}
