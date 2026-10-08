import "server-only";
import { and, eq } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { notificationTemplates, notifications, patients, users } from "../db/schema";
import { messageProvider } from "../providers/messaging";
import { getSetting } from "../settings";
import { env } from "../env";
import { log } from "../logger";
import { IN_APP_COPY } from "@/config/catalog";
import { renderTemplate, type NotificationEvent } from "@/domain/notifications/templates";

/**
 * Sends a notification for an event. In-app entries always; email/SMS per the patient's
 * preferences. Content comes from linted templates and never includes clinical details.
 * Delivery failures are logged by class only and never block the clinical workflow.
 */
export async function notifyUser(ctx: Ctx, userId: string, event: NotificationEvent, linkPath: string | null = "/portal") {
  const copy = IN_APP_COPY[event] ?? { title: "Update", body: "There is an update in your portal." };
  await ctx.tx.insert(notifications).values({ userId, templateKey: event, channel: "in_app", title: copy.title, body: copy.body, linkPath, status: "sent", sentAt: new Date() });

  const [u] = await ctx.tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  const [p] = await ctx.tx.select().from(patients).where(eq(patients.userId, userId)).limit(1);
  if (!u) return;
  const brand = await getSetting(ctx.tx, "brand");
  const features = await getSetting(ctx.tx, "features");
  const vars = {
    first_name: p?.preferredName ?? p?.legalFirstName ?? "there",
    portal_link: `${env.APP_ORIGIN}/portal`,
    support_email: brand.supportEmail,
    brand_name: brand.name,
  };

  const channels: ("email" | "sms")[] = [];
  if (!p || p.emailNotifications) channels.push("email");
  if (p?.smsNotifications && p.smsConsentAt && p.phone && features.smsNotifications) channels.push("sms");

  for (const channel of channels) {
    const [tpl] = await ctx.tx
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.key, channel === "sms" ? "case_update" : event), eq(notificationTemplates.channel, channel), eq(notificationTemplates.active, true)))
      .limit(1);
    if (!tpl) continue;
    const status = await messageProvider(channel)
      .send({
        channel,
        to: channel === "email" ? u.email : p!.phone!,
        subject: tpl.subject ? renderTemplate(tpl.subject, vars) : null,
        body: renderTemplate(tpl.body, vars),
        templateKey: tpl.key,
      })
      .then(() => "sent" as const)
      .catch((err) => {
        log.error("notification delivery failed", err, { event: tpl.key, provider: channel });
        return "failed" as const;
      });
    await ctx.tx.insert(notifications).values({ userId, templateKey: event, channel, title: copy.title, body: "(sent via template)", status, sentAt: new Date() });
  }
}
