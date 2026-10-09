import { ActionForm, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { availableSlots, caseAppointments } from "@/server/services/scheduling";
import { hasRole } from "@/domain/policy";
import { bookAppointmentAction, cancelAppointmentAction, completeAppointmentAction } from "../actions";
import { isAssigned, type TabProps } from "../_shared";

const TZ = "America/Chicago";
const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  completed: "Completed",
  cancelled_by_patient: "Cancelled by patient",
  cancelled_by_clinician: "Cancelled by staff",
  no_show: "No-show",
};

export async function AppointmentsTab({ ws, actor }: TabProps) {
  const canBook = ws.row.status === "appointment_needed" && hasRole(actor, ["support", "admin", "clinician", "clinical_director"]);
  const data = await run(actor, async (ctx) => ({
    appts: await caseAppointments(ctx, ws.row.id),
    slots: canBook ? await availableSlots(ctx, ws.row.id) : [],
  }));
  const assigned = isAssigned(ws, actor);
  const canCancel = hasRole(actor, ["clinician", "clinical_director", "admin", "support"]);
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TZ, timeZoneName: "short" });

  return (
    <div className="stack stack-lg">
      <section className="stack" aria-labelledby="ap-h">
        <h2 id="ap-h">Appointments</h2>
        {data.appts.length ? (
          <ul className="list-plain">
            {data.appts.map(({ a, clinicianName, credentials }) => (
              <li key={a.id} className="card-flat stack">
                <div className="row row-between">
                  <div className="stack stack-sm">
                    <b>
                      <DateTime value={a.startsAt} timeZone={TZ} />
                    </b>
                    <span className="muted small">
                      {clinicianName}, {credentials} · patient location {a.jurisdictionCode}
                    </span>
                    {a.cancelReason ? <span className="small muted">Reason: {a.cancelReason}</span> : null}
                  </div>
                  <Badge tone={a.status === "booked" ? "info" : a.status === "completed" ? "progress" : "neutral"}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
                </div>
                {a.status === "booked" ? (
                  <div className="btn-row">
                    {assigned && a.clinicianId === actor.clinicianId ? (
                      // A full page load, not client navigation: the visit page has its own Content Security Policy.
                      <a className="btn btn-primary btn-sm" href={`/ops/visits/${a.id}`}>
                        Open video visit
                      </a>
                    ) : null}
                    {assigned ? (
                      <>
                        <ActionForm action={completeAppointmentAction.bind(null, ws.row.id, a.id, "completed")} className="">
                          <SubmitButton size="sm">Mark completed</SubmitButton>
                        </ActionForm>
                        <ActionForm action={completeAppointmentAction.bind(null, ws.row.id, a.id, "no_show")} className="">
                          <SubmitButton size="sm" variant="secondary">
                            Mark no-show
                          </SubmitButton>
                        </ActionForm>
                      </>
                    ) : null}
                    {canCancel ? (
                      <details>
                        <summary className="btn btn-quiet btn-sm">Cancel appointment</summary>
                        <div className="mt-1">
                          <ActionForm action={cancelAppointmentAction.bind(null, ws.row.id, a.id)}>
                            <TextField name="reason" label="Reason (shared with staff only)" required maxLength={200} />
                            <SubmitButton size="sm" variant="danger">
                              Cancel appointment
                            </SubmitButton>
                          </ActionForm>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No appointments" />
        )}
      </section>

      {canBook ? (
        <section className="card stack" aria-labelledby="ap-book">
          <h2 id="ap-book">Book on the patient&rsquo;s behalf</h2>
          <p className="muted small">Times are shown in Central time. Only times the assigned clinician is available and authorized for the patient&rsquo;s state are listed.</p>
          {data.slots.length ? (
            <ActionForm action={bookAppointmentAction.bind(null, ws.row.id)}>
              <SelectField name="startsAt" label="Time" required placeholder="Choose a time…" options={data.slots.map((s) => ({ value: s.startsAt.toISOString(), label: fmt.format(s.startsAt) }))} />
              <SubmitButton>Book appointment</SubmitButton>
            </ActionForm>
          ) : (
            <p className="muted small">{ws.row.assignedClinicianId ? "No open times in the scheduling window." : "Assign a clinician first."}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
