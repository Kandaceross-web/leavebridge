import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, ChoiceGroup, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, Banner, ButtonLink, DateTime, Empty } from "@/components/ui";
import { consentStatus } from "@/server/services/consents";
import { listReleases } from "@/server/services/messaging";
import { myPatientProfile } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";
import { DOCUMENT_KINDS } from "@/domain/constants";
import { ownedCase } from "../../../_lib/load";
import { caseHref, DOCUMENT_KIND_LABEL, RECIPIENT_TYPE_LABEL } from "../../../_lib/steps";
import { StepHead } from "../../../_components/step-head";
import { addRelease, removeRelease } from "./actions";

export const metadata: Metadata = { title: "Release authorizations" };

export default async function ReleasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, steps, extra } = await ownedCase(id, async (ctx, r) => ({
    releases: await listReleases(ctx, r.id),
    consents: await consentStatus(ctx, r.id, "release"),
    profile: await myPatientProfile(ctx),
    features: await getSetting(ctx.tx, "features"),
  }));
  const { releases, consents, profile, features } = extra;
  const consentSigned = consents.every((c) => c.signedAt);
  const today = new Date().toISOString().slice(0, 10);
  const closed = row.status === "cancelled";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 760 }}>
      <StepHead
        caseId={row.id}
        reference={row.reference}
        steps={steps}
        title="Release authorizations"
        lede="Name who may receive your completed documents, which documents, and until when. You can revoke an authorization at any time."
      />
      {!features.externalDelivery ? (
        <Banner tone="info" icon="info">
          Sending documents directly to a recipient is not enabled yet, so nothing is sent automatically. You can <Link href="/portal/documents">download your documents</Link> and share them yourself.
        </Banner>
      ) : null}

      <section className="stack stack-sm" aria-labelledby="list-heading">
        <h2 id="list-heading">Your authorizations</h2>
        {releases.length ? (
          <ul className="list-rows">
            {releases.map((r) => {
              const active = !r.revokedAt && r.expiresOn > today;
              return (
                <li key={r.id}>
                  <div className="grow stack stack-sm">
                    <div className="row">
                      <b className="break">{r.recipientName}</b>
                      <Badge tone={active ? "progress" : "neutral"}>{r.revokedAt ? "Revoked" : active ? "Active" : "Expired"}</Badge>
                    </div>
                    <p className="small muted">
                      {RECIPIENT_TYPE_LABEL[r.recipientType]} · {r.scope.map((s) => DOCUMENT_KIND_LABEL[s as keyof typeof DOCUMENT_KIND_LABEL] ?? s).join(", ")}
                    </p>
                    <p className="small muted">
                      Signed <DateTime value={r.createdAt} timeZone={profile.timeZone} /> · Expires <DateTime value={r.expiresOn} dateOnly />
                      {r.revokedAt ? (
                        <>
                          {" "}
                          · Revoked <DateTime value={r.revokedAt} timeZone={profile.timeZone} />
                        </>
                      ) : null}
                    </p>
                  </div>
                  {active ? (
                    <ActionForm action={removeRelease.bind(null, row.id, r.id)} className="">
                      <SubmitButton variant="secondary" size="sm" pendingText="Revoking…">
                        Revoke
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty title="No authorizations yet" />
        )}
      </section>

      {closed ? null : !consentSigned ? (
        <section className="card stack stack-sm" aria-labelledby="consent-heading">
          <h2 id="consent-heading">Before you add an authorization</h2>
          <p className="muted">Please review and sign the authorization to release documentation.</p>
          <div className="btn-row">
            <ButtonLink href={`${caseHref(row.id)}/consents/release`}>Review and sign</ButtonLink>
          </div>
        </section>
      ) : (
        <section className="card stack" aria-labelledby="new-heading">
          <h2 id="new-heading">Add an authorization</h2>
          <ActionForm action={addRelease.bind(null, row.id)}>
            <SelectField
              name="recipientType"
              label="Recipient type"
              required
              placeholder="Choose one"
              options={Object.entries(RECIPIENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
            />
            <TextField name="recipientName" label="Recipient name" hint="A person or organization, such as your HR department." required maxLength={200} />
            <TextField name="recipientContact" label="Recipient email or fax (optional)" maxLength={200} />
            <ChoiceGroup
              name="scope"
              legend="Documents they may receive"
              type="checkbox"
              required
              options={DOCUMENT_KINDS.map((k) => ({ value: k, label: DOCUMENT_KIND_LABEL[k] }))}
            />
            <TextField name="expiresOn" type="date" label="Authorization expires on" required min={today} />
            <TextField name="typedName" label="Type your full legal name to sign" hint={`It must match the name on your account: ${profile.legalName}.`} required autoComplete="name" maxLength={200} />
            <SubmitButton pendingText="Saving…">Sign authorization</SubmitButton>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
