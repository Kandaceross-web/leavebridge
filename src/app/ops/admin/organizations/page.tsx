import type { Metadata } from "next";
import { ActionForm, Checkbox, SelectField, SubmitButton, TextField } from "@/components/forms";
import { Badge, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listOrganizations } from "@/server/services/admin";
import { env } from "@/server/env";
import { ORG_KINDS } from "@/domain/constants";
import { label } from "../_lib/ui";
import s from "../_lib/admin.module.css";
import { saveOrganizationAction } from "./actions";

export const metadata: Metadata = { title: "Employers & referrals" };

const KIND_OPTIONS = ORG_KINDS.map((k) => ({ value: k, label: label(k) }));

function OrgFields({ o }: { o?: { name: string; kind: string; referralCode: string; landingHeadline: string | null; active: boolean } }) {
  return (
    <>
      <TextField name="name" label="Name" required defaultValue={o?.name ?? ""} maxLength={160} />
      <SelectField name="kind" label="Kind" options={KIND_OPTIONS} required placeholder={o ? undefined : "Choose a kind"} defaultValue={o?.kind ?? ""} />
      <TextField name="referralCode" label="Referral code" required defaultValue={o?.referralCode ?? ""} maxLength={40} hint="3–40 lowercase letters, numbers or dashes." />
      <TextField name="landingHeadline" label="Landing page headline" defaultValue={o?.landingHeadline ?? ""} maxLength={200} hint="Plain and non-promissory; no statements about leave outcomes." />
      <Checkbox name="active" defaultChecked={o?.active ?? true}>
        Active (referral link works)
      </Checkbox>
    </>
  );
}

export default async function OrganizationsPage() {
  const { actor } = await requireStaffSession(["admin"]);
  const orgs = await run(actor, (ctx) => listOrganizations(ctx));
  const origin = env.SITE_ORIGIN.replace(/\/$/, "");
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Employers & referrals"
        lede="Referral organizations get a landing link. They never receive patient information; counts here are aggregate and suppressed below 5."
      />
      {orgs.length ? (
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table className="t">
            <caption className="visually-hidden">Referral organizations</caption>
            <thead>
              <tr>
                <th scope="col">Organization</th>
                <th scope="col">Kind</th>
                <th scope="col">Referral link</th>
                <th scope="col">Referred cases</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <th scope="row">
                    {o.name}
                    {o.landingHeadline ? <div className="fine">{o.landingHeadline}</div> : null}
                  </th>
                  <td>{label(o.kind)}</td>
                  <td>
                    <span className={s.code + " break"}>{`${origin}/r/${o.referralCode}`}</span>
                  </td>
                  <td>{o.referrals}</td>
                  <td>{o.active ? <Badge tone="done">Active</Badge> : <Badge>Inactive</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No organizations yet.</p>
      )}
      {orgs.map((o) => (
        <details key={o.id} className={s.details}>
          <summary>Edit {o.name}</summary>
          <div className="card">
            <ActionForm action={saveOrganizationAction.bind(null, o.id)}>
              <OrgFields o={o} />
              <div>
                <SubmitButton pendingText="Saving…">Save organization</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </details>
      ))}
      <section className="card stack" aria-labelledby="new-h">
        <h2 id="new-h">Add an organization</h2>
        <ActionForm action={saveOrganizationAction.bind(null, null)}>
          <OrgFields />
          <div>
            <SubmitButton pendingText="Saving…">Add organization</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
