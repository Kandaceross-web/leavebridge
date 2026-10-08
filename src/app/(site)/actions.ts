"use server";

import { withActor } from "@/server/db/actor";
import { clientIpKey, requestMeta } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { contactSchema, joinWaitlist, submitContactMessage } from "@/server/services/contact";
import { formFields, handle, type ActionState } from "@/server/web/action";

const anonymous = { kind: "anonymous" as const };

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    await rateLimit("contact", await clientIpKey());
    const meta = await requestMeta();
    await withActor(anonymous, (ctx) => submitContactMessage(ctx, formFields(fd)), meta);
    return { message: "Thank you. Your message was sent and our team will reply by email." };
  }, fd);
}

/** Employer inquiries reuse the contact service with a fixed topic. */
export async function employerInquiryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    await rateLimit("contact", await clientIpKey());
    const meta = await requestMeta();
    const f = formFields(fd);
    const base = contactSchema.parse({ ...f, topic: "employer" });
    const org = (f.organization ?? "").trim().slice(0, 200);
    const message = org ? `Organization: ${org}\n\n${base.message}` : base.message;
    await withActor(anonymous, (ctx) => submitContactMessage(ctx, { ...base, message }), meta);
    return { message: "Thank you. Our team will reply by email." };
  }, fd);
}

export async function waitlistAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    await rateLimit("contact", await clientIpKey());
    const meta = await requestMeta();
    await withActor(anonymous, (ctx) => joinWaitlist(ctx, formFields(fd)), meta);
    return { message: "Thanks. We will email you if we begin serving that state." };
  }, fd);
}
