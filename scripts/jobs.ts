/**
 * Scheduled jobs. Run one job per invocation from the platform scheduler (EventBridge → ECS task,
 * or cron in development):
 *
 *   npm run jobs -- purge-screenings      hourly   clears answers from abandoned anonymous screenings and
 *                                                  deletes expired "continue" links
 *   npm run jobs -- appointment-reminders hourly   in-portal + email/SMS reminder ~24h before a visit
 *   npm run jobs -- credential-expiry     daily    logs a count of licenses/privileges/malpractice expiring soon
 *   npm run jobs -- verify-audit-chain    daily    fails loudly if the audit hash chain is broken
 *
 * Output is counts only; never names, answers or case details.
 */
import { and, eq, gte, lt } from "drizzle-orm";
import { pool } from "@/server/db/client";
import { withActor, systemActor } from "@/server/db/actor";
import { appointments, cases, notifications, patients } from "@/server/db/schema";
import { purgeExpiredScreenings } from "@/server/services/screening";
import { purgeExpiredContinueLinks } from "@/server/services/continue-link";
import { notifyUser } from "@/server/services/notify";
import { expiringCredentials } from "@/server/services/admin";
import { verifyAuditChain } from "@/server/audit";
import { log } from "@/server/logger";

const jobs: Record<string, () => Promise<number>> = {
  "purge-screenings": () =>
    withActor(systemActor("job:purge-screenings"), async (ctx) => (await purgeExpiredScreenings(ctx)) + (await purgeExpiredContinueLinks(ctx))),

  "appointment-reminders": () =>
    withActor(systemActor("job:appointment-reminders"), async (ctx) => {
      const from = new Date(Date.now() + 20 * 3_600_000);
      const to = new Date(Date.now() + 28 * 3_600_000);
      const due = await ctx.tx
        .select({ appt: appointments, userId: patients.userId })
        .from(appointments)
        .innerJoin(cases, eq(cases.id, appointments.caseId))
        .innerJoin(patients, eq(patients.id, cases.patientId))
        .where(and(eq(appointments.status, "booked"), gte(appointments.startsAt, from), lt(appointments.startsAt, to)));
      let sent = 0;
      for (const { appt, userId } of due) {
        const link = `/portal/cases/${appt.caseId}`;
        const [already] = await ctx.tx
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(eq(notifications.userId, userId), eq(notifications.templateKey, "appointment_reminder"), eq(notifications.linkPath, link), gte(notifications.createdAt, appt.createdAt)))
          .limit(1);
        if (already) continue;
        await notifyUser(ctx, userId, "appointment_reminder", link);
        sent++;
      }
      return sent;
    }),

  "credential-expiry": () => withActor(systemActor("job:credential-expiry"), async (ctx) => (await expiringCredentials(ctx, 30)).length),

  "verify-audit-chain": () =>
    withActor(systemActor("job:verify-audit-chain"), async (ctx) => {
      const brokenAt = await verifyAuditChain(ctx);
      if (brokenAt !== null) throw Object.assign(new Error("audit chain broken"), { code: "audit_chain_broken" });
      return 0;
    }),
};

async function main() {
  const name = process.argv[2] ?? "";
  const job = jobs[name];
  if (!job) {
    process.stderr.write(`Unknown job "${name}". Jobs: ${Object.keys(jobs).join(", ")}\n`);
    process.exitCode = 2;
    return;
  }
  const started = Date.now();
  const count = await job();
  log.info("job finished", { job: name, count, durationMs: Date.now() - started });
}

main()
  .catch((err) => {
    log.error("job failed", err, { job: process.argv[2] });
    process.exitCode = 1;
  })
  .finally(() => pool.end());

