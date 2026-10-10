import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Ctx } from "../db/actor";
import { notifications, userRoles, users } from "../db/schema";
import { audit } from "../audit";
import { env } from "../env";
import { log } from "../logger";
import { messageProvider } from "../providers/messaging";
import { getSetting } from "../settings";

/**
 * Tells the clinical team that something in the operations console needs them. The message names
 * the console page only: no patient, case reference, answer or reason, because it travels by
 * ordinary email. The details are behind sign-in (and MFA) in the console.
 */
export type StaffAlert = "safety" | "letter_request" | "follow_up_request";

const COPY: Record<StaffAlert, { subject: string; body: string; path: string }> = {
  safety: { subject: "Clinical follow-up needed", body: "An item in the operations console needs clinical follow-up.", path: "/ops/safety" },
  letter_request: { subject: "A request is waiting for clinician review", body: "A request in the operations console is waiting for clinician review.", path: "/ops/same-day" },
  follow_up_request: { subject: "A patient asked to be contacted", body: "A patient asked to be contacted about scheduling an assessment. Details are in the operations console.", path: "/ops/same-day" },
};

export async function alertClinicalStaff(ctx: Ctx, kind: StaffAlert, caseId: string | null = null) {
  const copy = COPY[kind];
  const brand = await getSetting(ctx.tx, "brand");
  const staff = await ctx.tx
    .selectDistinct({ id: users.id, email: users.email })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .where(and(inArray(userRoles.role, ["clinician", "clinical_director"]), isNull(userRoles.revokedAt), eq(users.status, "active")));
  const link = `${env.APP_ORIGIN}${copy.path}`;
  for (const s of staff) {
    await ctx.tx.insert(notifications).values({ userId: s.id, templateKey: `staff_${kind}`, channel: "in_app", title: copy.subject, body: copy.body, linkPath: copy.path, status: "sent", sentAt: new Date() });
    const status = await messageProvider("email")
      .send({ channel: "email", to: s.email, subject: `${brand.name}: ${copy.subject}`, body: `${copy.body}\n\nSign in to review it: ${link}`, templateKey: `staff_${kind}` })
      .then(() => "sent" as const)
      .catch((err) => {
        log.error("staff alert delivery failed", err, { event: `staff_${kind}`, provider: "email" });
        return "failed" as const;
      });
    await ctx.tx.insert(notifications).values({ userId: s.id, templateKey: `staff_${kind}`, channel: "email", title: copy.subject, body: "(sent)", status, sentAt: new Date() });
  }
  await audit(ctx, { action: "staff.alerted", subjectType: "case", subjectId: caseId ?? undefined, caseId, metadata: { kind, recipients: staff.length } });
}
