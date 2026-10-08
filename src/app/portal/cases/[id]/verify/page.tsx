import type { Metadata } from "next";
import { ActionForm, FileField, SelectField, SubmitButton } from "@/components/forms";
import { Badge, Banner, ButtonLink, DateTime } from "@/components/ui";
import { allStateOptions, verificationView } from "@/server/services/portal-queries";
import { ownedCase } from "../../../_lib/load";
import { stepHref } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { confirmLocation, uploadId } from "./actions";

export const metadata: Metadata = { title: "Verify identity and location" };

const ID_STATUS = {
  pending: { label: "Under review", tone: "progress" },
  verified: { label: "Verified", tone: "done" },
  rejected: { label: "Not accepted", tone: "alert" },
  not_started: { label: "Not uploaded", tone: "action" },
} as const;

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    view: await verificationView(ctx, r.id),
    states: await allStateOptions(ctx),
  }));
  const { view, states } = extra;
  const idStatus = view.identity?.status ?? "not_started";
  const canUpload = idStatus === "not_started" || idStatus === "rejected";
  const stepState = steps.find((s) => s.key === "identity")?.state;
  const done = stepState === "done" || stepState === "waiting";
  const caseStateName = states.find((s) => s.value === view.caseJurisdiction)?.label ?? view.caseJurisdiction;

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step="identity"
        title="Verify your identity and location"
        lede="Clinicians need to know who they are assessing and where you are, because licenses are issued by state."
      />

      {done ? (
        <Banner tone="sage" icon="check">
          This step is complete.{idStatus === "pending" ? " Your ID is still being reviewed, and you can keep going." : ""}{" "}
          <a href={stepHref(row.id, "consents_payment")}>Continue to policies</a>
        </Banner>
      ) : null}

      <section className="card stack" aria-labelledby="id-heading">
        <div className="card-head">
          <h2 id="id-heading">Photo ID</h2>
          <Badge tone={ID_STATUS[idStatus].tone}>{ID_STATUS[idStatus].label}</Badge>
        </div>
        {view.identity ? (
          <p className="small muted">
            Uploaded <DateTime value={view.identity.submittedAt} />
          </p>
        ) : null}
        {idStatus === "rejected" ? (
          <Banner tone="alert" icon="alert">
            <p>
              <b>We couldn&rsquo;t accept the ID you uploaded.</b>
            </p>
            {view.identity?.reviewerMessage ? <p className="break">{view.identity.reviewerMessage}</p> : null}
            <p>Please upload a new photo.</p>
          </Banner>
        ) : null}
        {idStatus === "pending" ? <p className="muted">A team member will review your ID. You can continue with the next steps while you wait.</p> : null}
        {idStatus === "verified" ? <p className="muted">Your ID has been verified.</p> : null}
        {canUpload ? (
          <ActionForm action={uploadId.bind(null, row.id)}>
            <FileField
              name="idFile"
              label="Government-issued photo ID"
              hint="A driver's license, state ID or passport. PDF, JPG, PNG or HEIC. Make sure your name, photo and date of birth are readable. Files are checked for safety before they are stored."
              required
            />
            <SubmitButton pendingText="Uploading…">Upload ID</SubmitButton>
          </ActionForm>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="loc-heading">
        <div className="card-head">
          <h2 id="loc-heading">Where are you right now?</h2>
          {view.location ? (
            <Badge tone={view.location.matches ? "done" : "alert"}>{view.location.matches ? "Confirmed" : "Not eligible"}</Badge>
          ) : (
            <Badge tone="action">Not confirmed</Badge>
          )}
        </div>
        <p className="muted small">
          Confirm the state you are physically in today.{caseStateName ? ` During screening you told us ${caseStateName}.` : ""} You will be asked again when you join any video visit.
        </p>
        {view.location && !view.location.matches ? (
          <Banner tone="warn" icon="info">
            The state you confirmed doesn&rsquo;t match where our clinicians can see you for this request. If you have moved or are traveling, please message support.
          </Banner>
        ) : null}
        {!view.location?.matches ? (
          <ActionForm action={confirmLocation.bind(null, row.id)}>
            <SelectField name="state" label="State you are physically located in" required placeholder="Choose a state" options={states} defaultValue={view.caseJurisdiction ?? ""} />
            <SubmitButton pendingText="Confirming…">Confirm location</SubmitButton>
          </ActionForm>
        ) : (
          <p className="muted">Location confirmed.</p>
        )}
      </section>

      {done ? (
        <div className="btn-row">
          <ButtonLink href={stepHref(row.id, "consents_payment")}>Continue</ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
