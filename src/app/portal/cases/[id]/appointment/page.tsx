import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, ChoiceGroup, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Banner, DateTime, Empty, Icon, KeyValue } from "@/components/ui";
import { caseAppointments, availableSlots } from "@/server/services/scheduling";
import { allStateOptions, myPatientProfile } from "@/server/services/portal-queries";
import { PATIENT_STATUS } from "@/domain/cases/state-machine";
import { ownedCase } from "../../../_lib/load";
import { caseHref, zonedParts } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { JoinOutcome } from "../../../_components/client";
import { book, cancelAppt, joinAppt } from "./actions";

export const metadata: Metadata = { title: "Telehealth appointment" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    appts: await caseAppointments(ctx, r.id),
    slots: r.status === "appointment_needed" ? await availableSlots(ctx, r.id) : [],
    profile: await myPatientProfile(ctx),
    states: await allStateOptions(ctx),
  }));
  const { appts, slots, profile, states } = extra;
  const tz = profile.timeZone;
  const booked = appts.find((a) => a.a.status === "booked") ?? null;
  const past = appts.filter((a) => a.a.status !== "booked");

  const days = new Map<string, { label: string; options: { value: string; label: string }[] }>();
  for (const s of slots) {
    const p = zonedParts(s.startsAt, tz);
    const day = days.get(p.key) ?? { label: p.day, options: [] };
    day.options.push({ value: s.startsAt.toISOString(), label: p.time });
    days.set(p.key, day);
  }

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        title="Telehealth appointment"
        lede="A secure video visit with your clinician. You must be physically located in a state where your clinician is licensed during the visit."
      />

      {booked ? (
        <section className="card stack" aria-labelledby="booked-heading">
          <h2 id="booked-heading">Your appointment</h2>
          <KeyValue
            items={[
              ["When", <DateTime key="w" value={booked.a.startsAt} timeZone={tz} />],
              ["Length", `${Math.round((booked.a.endsAt.getTime() - booked.a.startsAt.getTime()) / 60000)} minutes`],
              ["Clinician", `${booked.clinicianName}, ${booked.credentials}`],
              ["How", "Secure video from your portal"],
            ]}
          />
          <p className="fine">Times are shown in your time zone ({tz}). You can change it in your account settings.</p>

          <section className="card-quiet stack" aria-labelledby="join-heading">
            <h3 id="join-heading">
              <Icon name="video" /> Join your visit
            </h3>
            <ActionForm action={joinAppt.bind(null, row.id, booked.a.id)}>
              <JoinOutcome />
              <SelectField name="state" label="Which state are you physically in right now?" required placeholder="Choose a state" options={states} />
              <SubmitButton pendingText="Checking…">Join visit</SubmitButton>
            </ActionForm>
          </section>

          <details>
            <summary className="btn btn-quiet btn-sm">I need to cancel or reschedule</summary>
            <div className="stack stack-sm" style={{ marginTop: 12 }}>
              <p className="small muted">After you cancel, you can choose a new time. Late cancellations may affect refunds under the cancellation rules you accepted.</p>
              <ActionForm action={cancelAppt.bind(null, row.id, booked.a.id)}>
                <TextField name="reason" label="Reason for cancelling" required maxLength={200} hint="A few words is enough. Please don't include health details." />
                <SubmitButton variant="danger" pendingText="Cancelling…">
                  Cancel appointment
                </SubmitButton>
              </ActionForm>
            </div>
          </details>
        </section>
      ) : null}

      {row.status === "appointment_needed" ? (
        <section className="card stack" aria-labelledby="choose-heading">
          <h2 id="choose-heading">Choose a time</h2>
          <p className="small muted">Times are shown in your time zone ({tz}).</p>
          {days.size ? (
            <ActionForm action={book.bind(null, row.id)}>
              {[...days.entries()].map(([key, d]) => (
                <ChoiceGroup key={key} name="slot" legend={d.label} options={d.options} />
              ))}
              <SubmitButton pendingText="Booking…">Book this time</SubmitButton>
            </ActionForm>
          ) : (
            <Empty title="No times are open right now">
              New times open regularly. Please check back, or <Link href={`${caseHref(row.id)}/messages`}>message the care team</Link>.
            </Empty>
          )}
        </section>
      ) : null}

      {!booked && row.status !== "appointment_needed" ? (
        <Banner tone="info" icon="info">
          {past.length ? "You have no upcoming appointment." : "Your clinician hasn't asked for a video visit."} Current status: {PATIENT_STATUS[row.status].label}.
        </Banner>
      ) : null}

      {past.length ? (
        <section className="stack stack-sm" aria-labelledby="past-heading">
          <h2 id="past-heading">Earlier appointments</h2>
          <ul className="list-rows small">
            {past.map((a) => (
              <li key={a.a.id}>
                <div className="grow">
                  <DateTime value={a.a.startsAt} timeZone={tz} />
                </div>
                <span className="muted">{a.a.status === "completed" ? "Completed" : a.a.status === "no_show" ? "Missed" : "Cancelled"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
