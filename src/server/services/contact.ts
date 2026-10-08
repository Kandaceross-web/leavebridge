import "server-only";
import type { StoredAttribution } from "@/domain/attribution";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "../db/actor";
import type { DbOrTx } from "../db/client";
import { contactMessages, jurisdictions, waitlist } from "../db/schema";
import { encrypt } from "../crypto";
import { getSetting } from "../settings";
import { invalid } from "@/domain/errors";

/*
 * Public contact form and state waitlist. Both tables hold no case data and have no row-level
 * security; the anonymous actor inserts through the lb_app grant. No audit event is written:
 * the AuditAction union has no action for public inquiries (see report / follow-up).
 */

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical help" },
  { value: "employer", label: "Employer services" },
  { value: "privacy", label: "Privacy" },
] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120, "Use 120 characters or fewer."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  topic: z.enum(["general", "billing", "technical", "employer", "privacy"], { message: "Choose a topic." }),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(4000, "Use 4,000 characters or fewer."),
});
export type ContactInput = z.infer<typeof contactSchema>;

export async function submitContactMessage(ctx: Ctx, input: unknown, attribution: StoredAttribution | null = null): Promise<{ id: string }> {
  const data = contactSchema.parse(input);
  const [row] = await ctx.tx
    .insert(contactMessages)
    .values({
      name: data.name,
      email: data.email,
      topic: data.topic,
      // Encrypted at rest: people sometimes include health details despite the warning.
      message: encrypt(data.message),
      attribution,
    })
    .returning({ id: contactMessages.id });
  if (!row) throw new Error("contact insert failed");
  return { id: row.id };
}

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  stateCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choose a state."),
});

/** States and territories people can ask to be notified about (those not currently served). */
export function waitlistStates(tx: DbOrTx) {
  return tx
    .select({ code: jurisdictions.code, name: jurisdictions.name })
    .from(jurisdictions)
    .where(eq(jurisdictions.isActive, false))
    .orderBy(asc(jurisdictions.name));
}

export async function joinWaitlist(ctx: Ctx, input: unknown): Promise<void> {
  const features = await getSetting(ctx.tx, "features");
  if (!features.waitlist) throw invalid("The waitlist is not open right now.");
  const data = waitlistSchema.parse(input);
  const [j] = await ctx.tx
    .select({ code: jurisdictions.code, isActive: jurisdictions.isActive })
    .from(jurisdictions)
    .where(eq(jurisdictions.code, data.stateCode))
    .limit(1);
  if (!j) throw invalid("Choose a state from the list.");
  if (j.isActive) throw invalid("We already serve that state. You can check availability now.");
  // Silently ignore duplicates so the form does not reveal whether an email is already listed.
  const [existing] = await ctx.tx
    .select({ id: waitlist.id })
    .from(waitlist)
    .where(and(eq(waitlist.email, data.email), eq(waitlist.stateCode, data.stateCode)))
    .limit(1);
  if (existing) return;
  await ctx.tx.insert(waitlist).values({ email: data.email, stateCode: data.stateCode });
}
