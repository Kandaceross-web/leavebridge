import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Banner, ButtonLink, DateTime, Empty, PageHead } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { patientCases, patientChecklist, type CaseRow } from "@/server/services/cases";
import { caseAppointments } from "@/server/services/scheduling";
import { myNotifications } from "@/server/services/messaging";
import { myOpenRequests, myPatientProfile } from "@/server/services/portal-queries";
import { PATIENT_STATUS, isOpen, patientStatusFor } from "@/domain/cases/state-machine";
import { SAME_DAY_SERVICE_NAME } from "@/config/same-day";
import type { ChecklistStep } from "@/domain/cases/checklist";
import { caseHref, portalCaseHref, PRE_SUBMISSION, REQUEST_KIND_LABEL, stepHref } from "./_lib/steps";

export const metadata: Metadata = { title: "Home" };

/** The one thing the patient should do next on a case, if anything. */
function nextAction(row: CaseRow, steps: ChecklistStep[]): { href: string; label: string; detail: string } | null {
  if (PRE_SUBMISSION.includes(row.status)) {
    const cur = steps.find((s) => s.state === "current");
    if (!cur) return null;
    if (cur.key === "payment" && row.screeningReview === "pending") return null;
    return { href: stepHref(row.id, cur.key), label: cur.label, detail: cur.description };
  }
  switch (row.status) {
    case "info_requested":
      return { href: `${caseHref(row.id)}#requests`, label: "Respond to your clinician", detail: "Your clinician asked for something more." };
    case "appointment_needed":
      return { href: `${caseHref(row.id)}/appointment`, label: "Choose an appointment time", detail: "Your clinician would like to meet by secure video." };
    case "appointment_scheduled":
      return { href: `${caseHref(row.id)}/appointment`, label: "View your appointment", detail: "See the time and how to join." };
    case "completed":
    case "delivered":
      return { href: "/portal/documents", label: "View your documents", detail: "Signed documents appear here when delivered." };
    default:
      return null;
  }
}

export default async function PortalHome() {
  const { actor } = await requirePatientSession();
  const data = await run(actor, async (ctx) => {
    const profile = await myPatientProfile(ctx);
    const list = await patientCases(ctx);
    // The next-step card follows the open clinician-led request; same-day screenings have their own card.
    const current = list.find((c) => c.c.kind === "clinical" && isOpen(c.c.status))?.c ?? null;
    const sameDay = list.find((c) => c.c.kind === "automated_screening" && isOpen(c.c.status))?.c ?? null;
    const steps = current ? await patientChecklist(ctx, current) : [];
    const appts = current ? await caseAppointments(ctx, current.id) : [];
    const upcoming = appts.filter((a) => a.a.status === "booked" && a.a.endsAt.getTime() > Date.now()).sort((x, y) => x.a.startsAt.getTime() - y.a.startsAt.getTime())[0] ?? null;
    const requests = await myOpenRequests(ctx, list.map((c) => c.c.id));
    const unread = (await myNotifications(ctx, 20)).filter((n) => !n.readAt).slice(0, 5);
    return { profile, list, current, sameDay, steps, upcoming, requests, unread };
  });
  const { profile, list, current, sameDay, steps, upcoming, requests, unread } = data;
  const next = current ? nextAction(current, steps) : null;

  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Your portal" title={`Hello, ${profile.firstName}`} lede="Everything about your request lives here. We will email you when something needs your attention." />

      {!list.length ? (
        <Empty title="You don't have a request yet">
          <p>
            Start by checking whether we can help. It takes a few minutes. <Link href="/start">Check if we can help</Link>
          </p>
        </Empty>
      ) : null}

      {current ? (
        <section className="card stack" aria-labelledby="next-heading">
          <div className="card-head">
            <div className="stack stack-sm">
              <p className="eyebrow">Case {current.reference}</p>
              <h2 id="next-heading">{next ? "Your next step" : PATIENT_STATUS[current.status].label}</h2>
            </div>
            <Badge tone={PATIENT_STATUS[current.status].tone}>{PATIENT_STATUS[current.status].label}</Badge>
          </div>
          {next ? (
            <div className="stack stack-sm">
              <p>
                <b>{next.label}</b>
              </p>
              <p className="muted">{next.detail}</p>
              <div className="btn-row">
                <ButtonLink href={next.href}>Continue: {next.label}</ButtonLink>
                <ButtonLink href={caseHref(current.id)} variant="quiet">
                  View case
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="stack stack-sm">
              <p className="muted">{PATIENT_STATUS[current.status].explainer}</p>
              {current.screeningReview === "pending" ? (
                <Banner tone="info" icon="clock">
                  A clinician is reviewing your screening answers before payment opens. We will notify you when you can continue.
                </Banner>
              ) : null}
              <div className="btn-row">
                <ButtonLink href={caseHref(current.id)} variant="secondary">
                  View case
                </ButtonLink>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {sameDay ? (
        <section className="card stack" aria-labelledby="sameday-heading">
          <div className="card-head">
            <div className="stack stack-sm">
              <p className="eyebrow">{SAME_DAY_SERVICE_NAME} · {sameDay.reference}</p>
              <h2 id="sameday-heading">{patientStatusFor(sameDay.kind, sameDay.status).label}</h2>
            </div>
            <Badge tone={patientStatusFor(sameDay.kind, sameDay.status).tone}>{patientStatusFor(sameDay.kind, sameDay.status).label}</Badge>
          </div>
          <p className="muted">{patientStatusFor(sameDay.kind, sameDay.status).explainer}</p>
          <div className="btn-row">
            <ButtonLink href={portalCaseHref(sameDay)}>Open your screening</ButtonLink>
          </div>
        </section>
      ) : null}

      <div className="grid g2">
        {requests.length ? (
          <section className="card-flat stack stack-sm" aria-labelledby="req-heading">
            <h2 id="req-heading">Requests from your care team</h2>
            <ul className="list-rows">
              {requests.map((r) => (
                <li key={r.id}>
                  <div className="grow">
                    <b>{REQUEST_KIND_LABEL[r.kind]}</b>
                    <p className="small muted">
                      Requested <DateTime value={r.createdAt} timeZone={profile.timeZone} />
                    </p>
                  </div>
                  <Link href={`${caseHref(r.caseId)}#requests`}>Respond</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming && current ? (
          <section className="card-flat stack stack-sm" aria-labelledby="appt-heading">
            <h2 id="appt-heading">Upcoming appointment</h2>
            <p>
              <DateTime value={upcoming.a.startsAt} timeZone={profile.timeZone} />
            </p>
            <p className="small muted">
              Secure video with {upcoming.clinicianName}, {upcoming.credentials}
            </p>
            <p>
              <Link href={`${caseHref(current.id)}/appointment`}>Appointment details</Link>
            </p>
          </section>
        ) : null}

        <section className="card-flat stack stack-sm" aria-labelledby="notif-heading">
          <div className="row row-between">
            <h2 id="notif-heading">Notifications</h2>
            <Link href="/portal/notifications" className="small">
              See all
            </Link>
          </div>
          {unread.length ? (
            <ul className="list-rows">
              {unread.map((n) => (
                <li key={n.id}>
                  <div className="grow">
                    <b>{n.title}</b>
                    <p className="small muted">
                      <DateTime value={n.createdAt} timeZone={profile.timeZone} />
                    </p>
                  </div>
                  {n.linkPath?.startsWith("/portal") ? <Link href={n.linkPath}>Open</Link> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">You are all caught up.</p>
          )}
        </section>
      </div>

      {list.length ? (
        <section className="stack stack-sm" aria-labelledby="cases-heading">
          <h2 id="cases-heading">Your requests</h2>
          <ul className="list-rows">
            {list.map(({ c, serviceName }) => (
              <li key={c.id}>
                <div className="grow stack stack-sm">
                  <div className="row">
                    <Link href={portalCaseHref(c)}>
                      <b>{c.kind === "automated_screening" ? "Screening" : "Case"} {c.reference}</b>
                    </Link>
                    <Badge tone={patientStatusFor(c.kind, c.status).tone}>{patientStatusFor(c.kind, c.status).label}</Badge>
                  </div>
                  <p className="small muted">
                    {serviceName ?? "Service not chosen yet"} · Started <DateTime value={c.createdAt} timeZone={profile.timeZone} dateOnly />
                  </p>
                  <p className="small">{patientStatusFor(c.kind, c.status).explainer}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
