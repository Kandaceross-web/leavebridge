import type { Metadata } from "next";
import Link from "next/link";
import { Banner, DateTime, Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { OPS_FLAG_LABEL, opsOverview, type OpsFlag } from "@/server/services/ops";
import { safetyQueue, scheduleAppointments, shortPatientName } from "@/server/services/ops-queries";
import { expiringCredentials } from "@/server/services/admin";
import { OPS_STAGE_LABEL } from "@/domain/cases/state-machine";
import { OPS_STAGES } from "@/domain/constants";
import { hasRole } from "@/domain/policy";
import { ALERT_FLAGS, FlagBadges, StatusBadge } from "./cases/_ui";

export const metadata: Metadata = { title: "Overview" };

const TZ = "America/Chicago";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export default async function OpsOverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { actor } = await requireStaffSession();
  const isClinician = hasRole(actor, ["clinician", "clinical_director"]) && Boolean(actor.clinicianId);
  const seesAllAppointments = hasRole(actor, ["clinical_director", "admin", "support"]);
  const canSchedule = hasRole(actor, ["clinician", "clinical_director", "admin", "support"]);
  const canSeeCredentials = hasRole(actor, ["admin", "clinical_director", "compliance"]);

  const data = await run(actor, async (ctx) => {
    const overview = await opsOverview(ctx);
    const appts = canSchedule ? await scheduleAppointments(ctx, { clinicianId: seesAllAppointments ? null : actor.clinicianId, days: 7 }) : [];
    const safety = await safetyQueue(ctx);
    const creds = canSeeCredentials ? await expiringCredentials(ctx, 60) : [];
    return { overview, appts, safety, creds };
  });
  const { overview, appts, safety, creds } = data;
  const flags = Object.keys(OPS_FLAG_LABEL) as OpsFlag[];
  const mine = isClinician ? overview.rows.filter((r) => r.clinicianId === actor.clinicianId) : [];
  const today = dayKey(new Date());
  const apptsToday = appts.filter((a) => dayKey(a.startsAt) === today);
  const apptsLater = appts.filter((a) => dayKey(a.startsAt) !== today);
  const safetyOpen = safety.events.length + safety.screeningCount;

  return (
    <div className="stack stack-lg">
      {sp.denied ? (
        <Banner tone="warn" icon="lock">
          You don&rsquo;t have access to that page.
        </Banner>
      ) : null}
      <PageHead eyebrow="Operations" title="Overview" lede="Queues, stages and today’s work across the cases you can see." />

      <section aria-labelledby="queues-h" className="stack">
        <h2 id="queues-h">Queues</h2>
        <div className="queues">
          {flags.map((f) => {
            const n = overview.counts[f] ?? 0;
            const variant = n > 0 ? (ALERT_FLAGS.includes(f) ? " alert" : " attn") : "";
            return (
              <Link key={f} href={`/ops/cases?flag=${f}`} className={`q${variant}`}>
                <b>{n}</b>
                <span>{OPS_FLAG_LABEL[f]}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="stages-h" className="stack">
        <div className="row row-between">
          <h2 id="stages-h">Stages</h2>
          <Link href="/ops/board">Open the case board</Link>
        </div>
        <div className="queues">
          {OPS_STAGES.map((s) => (
            <Link key={s} href={`/ops/cases?stage=${s}`} className="q">
              <b>{overview.stageCounts[s] ?? 0}</b>
              <span>{OPS_STAGE_LABEL[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid g2">
        {isClinician ? (
          <section aria-labelledby="mine-h" className="card stack">
            <h2 id="mine-h">My cases</h2>
            {mine.length ? (
              <ul className="list-rows">
                {mine.slice(0, 12).map((r) => (
                  <li key={r.id}>
                    <div className="grow stack stack-sm">
                      <Link href={`/ops/cases/${r.id}`}>
                        <b className="mono">{r.reference}</b> · {shortPatientName(r.patientName)}
                      </Link>
                      <FlagBadges flags={r.flags} max={3} />
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No cases assigned to you">Unassigned new requests in your states appear in the New patients queue.</Empty>
            )}
            {mine.length > 12 ? <Link href="/ops/cases">See all cases</Link> : null}
          </section>
        ) : null}

        {canSchedule ? (
          <section aria-labelledby="appts-h" className="card stack">
            <div className="row row-between">
              <h2 id="appts-h">Appointments</h2>
              <Link href="/ops/schedule">Schedule</Link>
            </div>
            <h3>Today</h3>
            <ApptList items={apptsToday} empty="Nothing booked today." />
            <h3>Later this week</h3>
            <ApptList items={apptsLater} empty="Nothing else booked in the next 7 days." />
          </section>
        ) : null}

        <section aria-labelledby="safety-h" className={`card stack`}>
          <h2 id="safety-h">Safety follow-up</h2>
          <p>
            <b className="mono" style={{ fontSize: 28 }}>
              {safetyOpen}
            </b>{" "}
            open safety {safetyOpen === 1 ? "event" : "events"}
            {safety.held.length ? `, ${safety.held.length} ${safety.held.length === 1 ? "case" : "cases"} on safety hold` : ""}.
          </p>
          <Link href="/ops/safety">Review safety follow-up</Link>
        </section>

        {canSeeCredentials ? (
          <section aria-labelledby="creds-h" className="card stack">
            <h2 id="creds-h">Credentials expiring in 60 days</h2>
            {creds.length ? (
              <ul className="list-rows">
                {creds.map((c, i) => (
                  <li key={i}>
                    <div className="grow">
                      <b>{c.who}</b>
                      <div className="muted small">
                        {c.kind}: {c.detail}
                      </div>
                    </div>
                    <span className="small">
                      <DateTime value={c.expiresOn} dateOnly />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No licenses, privileges or malpractice policies expire in the next 60 days.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ApptList({ items, empty }: { items: Awaited<ReturnType<typeof scheduleAppointments>>; empty: string }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="list-rows">
      {items.map((a) => (
        <li key={a.id}>
          <div className="grow">
            <Link href={`/ops/cases/${a.caseId}?tab=appointments`}>
              <span className="mono">{a.reference}</span> · {a.patient}
            </Link>
            <div className="muted small">{a.clinicianName}</div>
          </div>
          <span className="small">
            <DateTime value={a.startsAt} timeZone={TZ} />
          </span>
        </li>
      ))}
    </ul>
  );
}
