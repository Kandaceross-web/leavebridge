import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton } from "@/components/forms";
import { Banner, DateTime, Icon } from "@/components/ui";
import { VisitJoin } from "@/components/video-visit";
import { patientVisit } from "@/server/services/scheduling";
import { allStateOptions, myPatientProfile } from "@/server/services/portal-queries";
import { visitWindow, VISIT_OPENS_MINUTES_BEFORE } from "@/domain/scheduling/visit-window";
import { ownedCase } from "../../../_lib/load";
import { caseHref } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { joinVisit } from "./actions";

export const metadata: Metadata = { title: "Video visit" };

/** The patient's video visit. The CSP for this path allows the video service (src/server/web/csp.ts). */
export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    visit: await patientVisit(ctx, r.id),
    profile: await myPatientProfile(ctx),
    states: await allStateOptions(ctx),
  }));
  const { visit, profile, states } = extra;
  const appt = visit.appt;
  const win = appt ? visitWindow(appt) : null;

  return (
    <div className="stack stack-lg" style={{ maxWidth: 860 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        title="Video visit"
        lede="A secure video visit with your clinician inside your portal. You must be physically located in a state where your clinician is licensed during the visit."
      />

      {!appt ? (
        <Banner tone="info" icon="info">
          You have no booked video visit. <Link href={`${caseHref(row.id)}/appointment`}>Go to your appointment page</Link>.
        </Banner>
      ) : (
        <section className="card stack" aria-labelledby="visit-heading">
          <h2 id="visit-heading">
            <Icon name="video" /> Your visit
          </h2>
          <p>
            <DateTime value={appt.startsAt} timeZone={profile.timeZone} /> ({profile.timeZone})
          </p>
          {win?.state === "early" ? (
            <Banner tone="info" icon="info">
              The visit room opens {VISIT_OPENS_MINUTES_BEFORE} minutes before your start time, at <DateTime value={win.opensAt} timeZone={profile.timeZone} />. Reload this page then to join.
            </Banner>
          ) : win?.state === "closed" ? (
            <Banner tone="warn" icon="info">
              The time to join this visit has passed. Please <Link href={`${caseHref(row.id)}/messages`}>message the care team</Link> to reschedule.
            </Banner>
          ) : (
            <ActionForm action={joinVisit.bind(null, appt.id)}>
              <VisitJoin role="patient">
                <p className="small muted">Before you join, use headphones if you can and find a private place. Your browser will ask to use your camera and microphone.</p>
                <SelectField name="state" label="Which state are you physically in right now?" required placeholder="Choose a state" options={states} />
                <SubmitButton pendingText="Checking…">Join visit</SubmitButton>
              </VisitJoin>
            </ActionForm>
          )}
          <p className="fine">
            <Link href={`${caseHref(row.id)}/appointment`}>Back to your appointment</Link> to cancel or reschedule.
          </p>
        </section>
      )}
    </div>
  );
}
