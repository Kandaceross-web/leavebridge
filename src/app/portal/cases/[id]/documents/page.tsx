import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, FileField, SelectField, SubmitButton } from "@/components/forms";
import { Badge, Banner, DateTime, Icon } from "@/components/ui";
import { caseFacts } from "@/server/services/cases";
import { openRequests } from "@/server/services/clinical";
import { caseFiles } from "@/server/services/files";
import { myPatientProfile } from "@/server/services/portal-queries";
import { gate } from "@/domain/cases/checklist";
import { PATIENT_STATUS } from "@/domain/cases/state-machine";
import { ownedCase } from "../../../_lib/load";
import { caseHref, PRE_SUBMISSION, REQUEST_KIND_LABEL } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { submitForReview, uploadDocument } from "./actions";

export const metadata: Metadata = { title: "Your documents" };

const CATEGORY_LABEL: Record<string, string> = { employer_form: "Employer or leave form", supporting: "Supporting document" };

export default async function DocumentsStepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => {
    const facts = await caseFacts(ctx, r);
    return {
      facts,
      files: (await caseFiles(ctx, r.id, { includeIdentity: false })).filter((f) => f.category === "employer_form" || f.category === "supporting"),
      requests: (await openRequests(ctx, r.id)).filter((q) => q.status === "open"),
      profile: await myPatientProfile(ctx),
      submitGate: gate(facts, "submit"),
      uploadGate: gate(facts, "documents"),
    };
  });
  const { facts, files, requests, profile, submitGate, uploadGate } = extra;
  const preSubmission = PRE_SUBMISSION.includes(row.status);
  const closed = row.status === "closed" || row.status === "cancelled";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        step={preSubmission ? "documents" : undefined}
        title="Upload your forms"
        lede={
          facts.employerFormRequired
            ? "Upload the employer or leave-administrator form you need the clinician to complete."
            : "If your employer or leave administrator gave you a form, upload it here. It is optional for this service."
        }
      />

      {requests.length ? (
        <Banner tone="warn" icon="info">
          Your care team asked for {requests.length === 1 ? "something" : `${requests.length} items`}: {requests.map((r) => REQUEST_KIND_LABEL[r.kind]).join(", ")}.{" "}
          <Link href={`${caseHref(row.id)}#requests`}>Respond on your case page</Link>
        </Banner>
      ) : null}

      {!uploadGate.ok && preSubmission ? (
        <Banner tone="info" icon="lock">
          {uploadGate.reason} <Link href={caseHref(row.id)}>Back to your steps</Link>
        </Banner>
      ) : null}

      {uploadGate.ok && !closed ? (
        <section className="card stack" aria-labelledby="upload-heading">
          <h2 id="upload-heading">Upload a document</h2>
          <ActionForm action={uploadDocument.bind(null, row.id)}>
            <SelectField
              name="kind"
              label="What is this document?"
              required
              defaultValue="employer_form"
              options={[
                { value: "employer_form", label: "Employer or leave-administrator form" },
                { value: "supporting", label: "Other supporting document" },
              ]}
            />
            <FileField name="file" label="File" hint="PDF, JPG, PNG or HEIC. Files are checked for safety before they are stored. You won't be asked to upload the same file twice." required />
            <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      <section className="stack stack-sm" aria-labelledby="files-heading">
        <h2 id="files-heading">Your uploads</h2>
        {files.length ? (
          <ul className="list-rows">
            {files.map((f) => (
              <li key={f.id}>
                <Icon name="file" />
                <div className="grow">
                  <b className="break">{f.name}</b>
                  <p className="small muted">
                    {CATEGORY_LABEL[f.category]} · Uploaded <DateTime value={f.createdAt} timeZone={profile.timeZone} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Nothing uploaded yet.</p>
        )}
      </section>

      <section id="submit" className="card stack" aria-labelledby="submit-heading">
        <h2 id="submit-heading">Submit for clinical review</h2>
        {preSubmission ? (
          submitGate.ok ? (
            <>
              <p className="muted">
                Everything needed is in place. When you submit, a licensed clinician will review your information. You can still message your care team and upload documents afterwards.
              </p>
              <ActionForm action={submitForReview.bind(null, row.id)}>
                <SubmitButton pendingText="Submitting…">Submit for clinical review</SubmitButton>
              </ActionForm>
            </>
          ) : (
            <>
              <p className="muted">A few things are still needed before you can submit:</p>
              <ul className="list-check">
                {steps
                  .filter((s) => s.key !== "submit" && s.state !== "done" && s.state !== "waiting")
                  .map((s) => (
                    <li key={s.key}>
                      <Icon name="clock" />
                      <span>{s.label}</span>
                    </li>
                  ))}
              </ul>
              <p className="small">
                <b>Next:</b> {submitGate.reason}
              </p>
            </>
          )
        ) : (
          <p>
            <Badge tone={PATIENT_STATUS[row.status].tone}>{PATIENT_STATUS[row.status].label}</Badge> <span className="muted">{PATIENT_STATUS[row.status].explainer}</span>
          </p>
        )}
      </section>
    </div>
  );
}
