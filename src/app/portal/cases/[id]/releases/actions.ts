"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePatientSession, run } from "@/server/auth/guards";
import { createRelease, revokeRelease } from "@/server/services/messaging";
import { myPatientProfile } from "@/server/services/portal-queries";
import { handle, formAnswers, type ActionState } from "@/server/web/action";
import { DOCUMENT_KINDS } from "@/domain/constants";

const schema = z.object({
  recipientType: z.enum(["employer", "hr", "leave_administrator", "tpa"], { message: "Choose who the recipient is." }),
  recipientName: z.string().trim().min(1, "Name the recipient.").max(200),
  recipientContact: z.string().trim().max(200).default(""),
  scope: z.array(z.enum(DOCUMENT_KINDS)).min(1, "Choose at least one document type."),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an expiration date."),
  typedName: z.string().trim().min(1, "Type your full legal name to sign."),
});

export async function addRelease(caseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    const raw = formAnswers(fd);
    const input = schema.parse({ ...raw, scope: Array.isArray(raw.scope) ? raw.scope : raw.scope ? [raw.scope] : [] });
    await run(actor, async (ctx) => {
      const profile = await myPatientProfile(ctx);
      await createRelease(ctx, caseId, { ...input, legalName: profile.legalName });
    });
    revalidatePath(`/portal/cases/${caseId}/releases`);
    return { message: "Authorization saved." };
  }, fd);
}

export async function removeRelease(caseId: string, releaseId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const { actor } = await requirePatientSession();
    await run(actor, (ctx) => revokeRelease(ctx, releaseId));
    revalidatePath(`/portal/cases/${caseId}/releases`);
    return { message: "Authorization revoked." };
  }, fd);
}
