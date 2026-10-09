import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Banner, DateTime, PageHead } from "@/components/ui";
import { VisitJoin } from "@/components/video-visit";
import { requireStaffSession, run } from "@/server/auth/guards";
import { clinicianVisit } from "@/server/services/scheduling";
import { isDomainError } from "@/domain/errors";
import { visitWindow, VISIT_CLOSES_MINUTES_AFTER, VISIT_OPENS_MINUTES_BEFORE } from "@/domain/scheduling/visit-window";
import { joinVisitAsClinician } from "./actions";

// The title never includes the reference or name (it can end up in browser history).
export const metadata: Metadata = { title: "Video visit" };

const TZ = "America/Chicago";

/** The clinician's side of a video visit. The CSP for this path allows the video service (src/server/web/csp.ts). */
export default async function OpsVisitPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
  const visit = await run(actor, (ctx) => clinicianVisit(ctx, appointmentId)).catch((e: unknown) => {
    // Do not reveal whether an appointment exists to anyone but its clinician.
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  });
  const { row, appt } = visit;
  const win = visitWindow(appt);

  return (
    <div className="stack stack-lg" style={{ maxWidth: 900 }}>
      <PageHead
        eyebrow="Schedule"
        title="Video visit"
        lede={
          <>
            Case <span className="mono">{row.reference}</span> · <DateTime value={appt.startsAt} timeZone={TZ} /> · patient booked from {appt.jurisdictionCode}
          </>
        }
      />
      <section className="card stack" aria-labelledby="ov-h">
        <h2 id="ov-h">Join</h2>
        <p className="small muted">
          The room opens {VISIT_OPENS_MINUTES_BEFORE} minutes before the start and closes {VISIT_CLOSES_MINUTES_AFTER} minutes after the scheduled end. The patient confirms their state when they join; you
          can only meet while they are in a state you are authorized for.
        </p>
        {win.state === "early" ? (
          <Banner tone="info" icon="info">
            The room opens at <DateTime value={win.opensAt} timeZone={TZ} />. Reload this page then.
          </Banner>
        ) : win.state === "closed" ? (
          <Banner tone="warn" icon="info">
            The join window for this visit has closed. Record the outcome on the case.
          </Banner>
        ) : (
          <ActionForm action={joinVisitAsClinician.bind(null, appt.id)}>
            <VisitJoin role="clinician">
              <SubmitButton pendingText="Checking…">Join visit</SubmitButton>
            </VisitJoin>
          </ActionForm>
        )}
        <p className="fine">
          <Link href={`/ops/cases/${row.id}?tab=appointments`}>Back to the case</Link> to mark the visit completed or a no-show.
        </p>
      </section>
    </div>
  );
}
