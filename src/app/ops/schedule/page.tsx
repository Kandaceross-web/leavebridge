import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { clinicianAvailability } from "@/server/services/scheduling";
import { scheduleAppointments } from "@/server/services/ops-queries";
import { hasRole } from "@/domain/policy";
import { saveAvailabilityAction } from "./actions";
import { TIME_ZONES, WEEKDAYS, WINDOWS_PER_DAY } from "./constants";

export const metadata: Metadata = { title: "Schedule" };

const TZ = "America/Chicago";
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function SchedulePage() {
  const { actor } = await requireStaffSession(["clinician", "clinical_director", "admin", "support"]);
  const seesAll = hasRole(actor, ["clinical_director", "admin", "support"]);
  const isClinician = Boolean(actor.clinicianId) && hasRole(actor, ["clinician", "clinical_director"]);
  const { appts, rules } = await run(actor, async (ctx) => ({
    appts: await scheduleAppointments(ctx, { clinicianId: seesAll ? null : actor.clinicianId, days: 14 }),
    rules: isClinician ? await clinicianAvailability(ctx, actor.clinicianId!) : [],
  }));

  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  const groups = new Map<string, typeof appts>();
  for (const a of appts) {
    const k = dayFmt.format(a.startsAt);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const zone = rules[0]?.timeZone ?? TZ;

  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Operations" title="Schedule" lede={seesAll ? "Booked appointments for all clinicians over the next 14 days, in Central time." : "Your booked appointments over the next 14 days, in Central time."} />

      <section aria-labelledby="up-h" className="stack">
        <h2 id="up-h">Upcoming appointments</h2>
        {groups.size ? (
          [...groups.entries()].map(([day, items]) => (
            <div key={day} className="card-flat stack stack-sm">
              <h3>{day}</h3>
              <ul className="list-rows">
                {items.map((a) => (
                  <li key={a.id}>
                    <span className="nowrap mono small">
                      <time dateTime={a.startsAt.toISOString()}>{timeFmt.format(a.startsAt)}</time>–<time dateTime={a.endsAt.toISOString()}>{timeFmt.format(a.endsAt)}</time>
                    </span>
                    <div className="grow">
                      <Link href={`/ops/cases/${a.caseId}?tab=appointments`}>
                        <span className="mono">{a.reference}</span> · {a.patient}
                      </Link>
                      <div className="muted small">
                        {a.clinicianName} · patient in {a.jurisdictionCode}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <Empty title="No appointments in the next 14 days" />
        )}
      </section>

      {isClinician ? (
        <section aria-labelledby="av-h" className="card stack">
          <h2 id="av-h">My weekly availability</h2>
          <p className="muted small">
            Patients can book within these windows, subject to minimum notice, session length, buffers and your state authorizations. Leave a day blank if you are not available. Saving replaces your current hours.
          </p>
          <ActionForm action={saveAvailabilityAction} className="form form-wide">
            <SelectField name="timeZone" label="Time zone" required defaultValue={zone} options={TIME_ZONES.map(([value, label]) => ({ value, label: `${label} (${value})` }))} />
            {WEEKDAYS.map((name, wd) => {
              const dayRules = rules.filter((r) => r.weekday === wd);
              return (
                <fieldset key={name} className="card-quiet">
                  <legend>{name}</legend>
                  {Array.from({ length: WINDOWS_PER_DAY }, (_, i) => {
                    const r = dayRules[i];
                    return (
                      <div key={i} className="grid g2" style={{ gap: 12 }}>
                        <TextField name={`start_${wd}_${i}`} label={`${i === 0 ? "Start" : "Second window start"}`} type="time" defaultValue={r ? hhmm(r.startMinute) : ""} />
                        <TextField name={`end_${wd}_${i}`} label={`${i === 0 ? "End" : "Second window end"}`} type="time" defaultValue={r ? hhmm(r.endMinute) : ""} />
                      </div>
                    );
                  })}
                </fieldset>
              );
            })}
            <SubmitButton>Save availability</SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
