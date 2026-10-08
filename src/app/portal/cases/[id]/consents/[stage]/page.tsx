import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, SubmitButton, TextField } from "@/components/forms";
import { Banner, ButtonLink, DateTime, Markdown, ReviewTag } from "@/components/ui";
import { env } from "@/server/env";
import { consentStatus } from "@/server/services/consents";
import { caseFacts } from "@/server/services/cases";
import { myPatientProfile } from "@/server/services/portal-queries";
import { gate } from "@/domain/cases/checklist";
import { ownedCase } from "../../../../_lib/load";
import { caseHref } from "../../../../_lib/steps";
import { StepHead } from "../../../../_components/step-head";
import { signConsents, type PortalConsentStage } from "./actions";

export const metadata: Metadata = { title: "Review and sign" };

const STAGES: Record<PortalConsentStage, { title: string; lede: string; step?: "consents_payment" | "consents_intake"; gate: "consents_payment" | "consents_intake" | null; next: string; nextLabel: string }> = {
  payment: {
    title: "Review the financial policies",
    lede: "Please read these before you pay. Payment covers a professional assessment, not a particular outcome.",
    step: "consents_payment",
    gate: "consents_payment",
    next: "checkout",
    nextLabel: "Continue to payment",
  },
  intake: {
    title: "Consents for your assessment",
    lede: "These cover the assessment itself, telehealth, privacy and how we contact you.",
    step: "consents_intake",
    gate: "consents_intake",
    next: "intake",
    nextLabel: "Continue to intake",
  },
  release: {
    title: "Authorization to release documents",
    lede: "Sign this before naming someone who may receive your documents.",
    gate: null,
    next: "releases",
    nextLabel: "Continue to release authorizations",
  },
};

export default async function ConsentsPage({ params }: { params: Promise<{ id: string; stage: string }> }) {
  const { id, stage } = await params;
  if (!(stage in STAGES)) notFound();
  const st = STAGES[stage as PortalConsentStage];
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    docs: await consentStatus(ctx, r.id, stage as PortalConsentStage),
    profile: await myPatientProfile(ctx),
    gate: st.gate ? gate(await caseFacts(ctx, r), st.gate) : ({ ok: true } as const),
  }));
  const { docs, profile } = extra;
  const allSigned = docs.every((d) => d.signedAt);
  const showTags = env.APP_ENV !== "production";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead caseId={row.id} reference={row.reference} steps={steps} step={st.step} title={st.title} lede={st.lede} />

      {!extra.gate.ok ? (
        <Banner tone="info" icon="lock">
          {extra.gate.reason} <a href={caseHref(row.id)}>Back to your steps</a>
        </Banner>
      ) : allSigned ? (
        <div className="stack">
          <Banner tone="sage" icon="check">
            You have signed everything for this step.
          </Banner>
          <ul className="list-rows">
            {docs.map((d) => (
              <li key={d.versionId}>
                <div className="grow">
                  <b>{d.title}</b> <span className="small muted">version {d.version}</span>
                </div>
                <span className="small muted">
                  Signed <DateTime value={d.signedAt} timeZone={profile.timeZone} />
                </span>
              </li>
            ))}
          </ul>
          <div className="btn-row">
            <ButtonLink href={`${caseHref(row.id)}/${st.next}`}>{st.nextLabel}</ButtonLink>
          </div>
        </div>
      ) : (
        <ActionForm action={signConsents.bind(null, row.id, stage as PortalConsentStage)} className="form form-wide">
          {docs.map((d) => (
            <section key={d.versionId} className="card stack" aria-labelledby={`doc-${d.versionId}`}>
              <div className="card-head">
                <h2 id={`doc-${d.versionId}`}>{d.title}</h2>
                <span className="row" style={{ gap: 8 }}>
                  <span className="small muted">Version {d.version}</span>
                  {showTags ? <ReviewTag tag={d.reviewTag} /> : null}
                </span>
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }} tabIndex={0} aria-label={`${d.title} text`}>
                <Markdown source={d.body} />
              </div>
              <input type="hidden" name="versionId" value={d.versionId} />
              {d.signedAt ? (
                <>
                  <input type="hidden" name={`ack_${d.versionId}`} value="yes" />
                  <p className="small muted">
                    Already signed <DateTime value={d.signedAt} timeZone={profile.timeZone} />
                  </p>
                </>
              ) : (
                <Checkbox name={`ack_${d.versionId}`} value="yes" required>
                  I have read and agree to the {d.title.toLowerCase()} (version {d.version}).
                </Checkbox>
              )}
            </section>
          ))}
          <section className="card stack" aria-labelledby="sign-heading">
            <h2 id="sign-heading">Sign</h2>
            <TextField
              name="typedName"
              label="Type your full legal name"
              hint={`It must match the name on your account: ${profile.legalName}.`}
              autoComplete="name"
              required
              maxLength={200}
            />
            <p className="fine">
              Typing your name is your electronic signature. We record the date, time and the exact version you signed.
            </p>
            <SubmitButton pendingText="Signing…">Sign and continue</SubmitButton>
          </section>
        </ActionForm>
      )}
    </div>
  );
}
