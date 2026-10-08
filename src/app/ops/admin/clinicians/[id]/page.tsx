import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, Banner, DateTime, KeyValue, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { clinicianDetail, listJurisdictions, listServices } from "@/server/services/admin";
import { hasRole } from "@/domain/policy";
import s from "../../_lib/admin.module.css";
import { InlineAction, label, orNotFound } from "../../_lib/ui";
import { CredentialPicker, type CredentialOption } from "../credential-picker";
import {
  addAuthorizationAction,
  addLicenseAction,
  addPrivilegeAction,
  endAuthorizationAction,
  setCredentialStatusAction,
  updateClinicianAction,
} from "../actions";

export const metadata: Metadata = { title: "Clinician" };

const COMPACTS = [
  { value: "counseling", label: "Counseling Compact" },
  { value: "psypact", label: "PSYPACT" },
  { value: "social_work", label: "Social Work Licensure Compact" },
  { value: "nurse", label: "Nurse Licensure Compact" },
  { value: "other", label: "Other" },
];
const CRED_STATUSES = ["active", "expired", "suspended", "inactive"] as const;
const TONE = { active: "done", expired: "alert", suspended: "alert", inactive: "neutral", ended: "neutral", onboarding: "progress" } as const;

export default async function ClinicianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canEdit = hasRole(actor, ["admin"]);
  const { d, states, services } = await run(actor, async (ctx) => ({
    d: await orNotFound(clinicianDetail(ctx, id)),
    states: await listJurisdictions(ctx),
    services: await listServices(ctx),
  }));
  const c = d.c;
  const today = new Date().toISOString().slice(0, 10);
  const stateNames = Object.fromEntries(states.map((s) => [s.code, s.name]));
  const stateOptions = states.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }));
  const credOptions: CredentialOption[] = [
    ...d.licenses.filter((l) => l.status === "active").map((l) => ({ id: l.id, basis: "license" as const, state: l.jurisdictionCode, label: `${l.jurisdictionCode} ${l.licenseType} #${l.licenseNumber} (expires ${l.expiresOn})` })),
    ...d.privileges.filter((p) => p.status === "active").map((p) => ({ id: p.id, basis: "compact_privilege" as const, state: p.remoteJurisdictionCode, label: `${p.remoteJurisdictionCode} ${label(p.compact)} privilege${p.privilegeIdentifier ? ` ${p.privilegeIdentifier}` : ""} (expires ${p.expiresOn})` })),
  ];
  const credLabel = (a: (typeof d.authorizations)[number]["a"]) => {
    if (a.basis === "license") {
      const l = d.licenses.find((x) => x.id === a.licenseId);
      return l ? `License ${l.licenseType} #${l.licenseNumber}` : "License (missing)";
    }
    const p = d.privileges.find((x) => x.id === a.compactPrivilegeId);
    return p ? `${label(p.compact)} privilege` : "Privilege (missing)";
  };
  const statusForm = (kind: "license" | "privilege", credentialId: string, current: string) =>
    canEdit ? (
      <ActionForm action={setCredentialStatusAction.bind(null, id)} className="row">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="credentialId" value={credentialId} />
        <label className="visually-hidden" htmlFor={`st-${credentialId}`}>
          Status
        </label>
        <select id={`st-${credentialId}`} name="status" className="select" defaultValue={current} style={{ width: "auto" }}>
          {CRED_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <SubmitButton size="sm" variant="secondary">
          Set status
        </SubmitButton>
      </ActionForm>
    ) : null;

  return (
    <>
      <p className="small">
        <Link href="/ops/admin/clinicians">← Clinicians</Link>
      </p>
      <PageHead
        eyebrow="Clinician"
        title={c.displayName}
        lede={
          <span className="row">
            <Badge tone={TONE[c.status]}>{c.status}</Badge>
            <span className="muted small break">{d.email}</span>
          </span>
        }
      />
      <Banner tone="info" icon="shield">
        A license never authorizes a service on its own: each service and state needs an explicit authorization below. Eligibility is
        re-checked at assignment, scheduling, session join and signing, so ending a credential or authorization takes effect immediately.
      </Banner>

      <section className="card stack" aria-labelledby="profile-h">
        <h2 id="profile-h">Profile</h2>
        {canEdit ? (
          <ActionForm action={updateClinicianAction.bind(null, id)}>
            <SelectField
              name="status"
              label="Status"
              defaultValue={c.status}
              options={[
                { value: "onboarding", label: "Onboarding" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              hint="Activating requires a fresh password confirmation."
            />
            <TextField name="legalName" label="Legal name" required defaultValue={c.legalName} maxLength={160} />
            <TextField name="displayName" label="Display name" required defaultValue={c.displayName} maxLength={160} />
            <TextField name="credentials" label="Credentials" required defaultValue={c.credentials} maxLength={60} />
            <TextField name="degree" label="Degree" defaultValue={c.degree ?? ""} maxLength={60} />
            <TextField name="npi" label="NPI" defaultValue={c.npi ?? ""} inputMode="numeric" maxLength={10} />
            <TextArea name="bio" label="Bio" rows={4} defaultValue={c.bio ?? ""} maxLength={3000} />
            <TextField name="malpracticeCarrier" label="Malpractice carrier" defaultValue={c.malpracticeCarrier ?? ""} maxLength={160} />
            <TextField name="malpracticeExpiresOn" label="Malpractice coverage expires" type="date" defaultValue={c.malpracticeExpiresOn ?? ""} />
            <Checkbox name="publicProfile" defaultChecked={c.publicProfile}>
              Show a public profile
            </Checkbox>
            <div>
              <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <KeyValue
            items={[
              ["Legal name", c.legalName],
              ["Credentials", c.credentials],
              ["Degree", c.degree],
              ["NPI", c.npi],
              ["Malpractice carrier", c.malpracticeCarrier],
              ["Malpractice expires", <DateTime key="m" value={c.malpracticeExpiresOn} dateOnly />],
              ["Public profile", c.publicProfile ? "Yes" : "No"],
            ]}
          />
        )}
      </section>

      <section className="card stack" aria-labelledby="lic-h">
        <h2 id="lic-h">Licenses</h2>
        {d.licenses.length ? (
          <div className={`tbl-wrap ${s.rel}`}>
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col">Type and number</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.licenses.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="tag">{l.jurisdictionCode}</span>
                    </td>
                    <td>
                      {l.licenseType} <span className="mono">#{l.licenseNumber}</span>
                    </td>
                    <td className="nowrap">
                      <DateTime value={l.expiresOn} dateOnly />
                      {l.expiresOn < today ? (
                        <>
                          {" "}
                          <Badge tone="alert">Past date</Badge>
                        </>
                      ) : null}
                    </td>
                    <td className="small break">
                      {l.verificationSource ?? "—"}
                      {l.verifiedAt ? (
                        <div className="fine">
                          Verified <DateTime value={l.verifiedAt} />
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="stack stack-sm">
                        <Badge tone={TONE[l.status]}>{l.status}</Badge>
                        {statusForm("license", l.id, l.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No licenses recorded.</p>
        )}
        {canEdit ? (
          <details className={s.detailsBtn}>
            <summary className="btn btn-secondary btn-sm">Record a verified license</summary>
            <div className="card-quiet" style={{ marginTop: 12 }}>
              <ActionForm action={addLicenseAction.bind(null, id)}>
                <SelectField name="jurisdictionCode" label="State" options={stateOptions} placeholder="Choose a state" required />
                <TextField name="licenseType" label="License type" required maxLength={60} placeholder="LPC" />
                <TextField name="licenseNumber" label="License number" required maxLength={60} />
                <TextField name="issuedOn" label="Issued on" type="date" />
                <TextField name="expiresOn" label="Expires on" type="date" required />
                <TextArea name="verificationSource" label="Verification source" required rows={2} maxLength={400} hint="Where and when you verified this license, for example the state board lookup and date." />
                <div>
                  <SubmitButton pendingText="Saving…">Record license</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </details>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="cp-h">
        <h2 id="cp-h">Compact privileges</h2>
        {d.privileges.length ? (
          <div className={`tbl-wrap ${s.rel}`}>
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Remote state</th>
                  <th scope="col">Compact</th>
                  <th scope="col">Identifier</th>
                  <th scope="col">Effective</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.privileges.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="tag">{p.remoteJurisdictionCode}</span>
                    </td>
                    <td>{COMPACTS.find((x) => x.value === p.compact)?.label ?? p.compact}</td>
                    <td className="mono">{p.privilegeIdentifier ?? "—"}</td>
                    <td className="nowrap">
                      <DateTime value={p.effectiveOn} dateOnly />
                    </td>
                    <td className="nowrap">
                      <DateTime value={p.expiresOn} dateOnly />
                    </td>
                    <td>
                      <div className="stack stack-sm">
                        <Badge tone={TONE[p.status]}>{p.status}</Badge>
                        {statusForm("privilege", p.id, p.status)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No compact privileges recorded.</p>
        )}
        {canEdit ? (
          <details className={s.detailsBtn}>
            <summary className="btn btn-secondary btn-sm">Record a verified compact privilege</summary>
            <div className="card-quiet" style={{ marginTop: 12 }}>
              <ActionForm action={addPrivilegeAction.bind(null, id)}>
                <SelectField name="compact" label="Compact" options={COMPACTS} placeholder="Choose a compact" required />
                <SelectField name="remoteJurisdictionCode" label="Remote state" options={stateOptions} placeholder="Choose a state" required />
                <SelectField
                  name="homeLicenseId"
                  label="Home-state license"
                  options={d.licenses.map((l) => ({ value: l.id, label: `${l.jurisdictionCode} ${l.licenseType} #${l.licenseNumber}` }))}
                  placeholder="None recorded"
                />
                <TextField name="privilegeIdentifier" label="Privilege identifier" maxLength={80} />
                <TextField name="effectiveOn" label="Effective on" type="date" required />
                <TextField name="expiresOn" label="Expires on" type="date" required />
                <div>
                  <SubmitButton pendingText="Saving…">Record privilege</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </details>
        ) : null}
      </section>

      <section className="card stack" aria-labelledby="auth-h">
        <h2 id="auth-h">Service authorizations</h2>
        <p className="small muted">
          An authorization says this clinician may provide one service to patients located in one state, backed by a specific license or
          compact privilege. It is never inferred from a license.
        </p>
        {d.authorizations.length ? (
          <div className={`tbl-wrap ${s.rel}`}>
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">State</th>
                  <th scope="col">Basis</th>
                  <th scope="col">Effective</th>
                  <th scope="col">Ends</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.authorizations.map(({ a, serviceName }) => (
                  <tr key={a.id}>
                    <td>{serviceName}</td>
                    <td>
                      <span className="tag">{a.jurisdictionCode}</span>
                    </td>
                    <td className="small">{credLabel(a)}</td>
                    <td className="nowrap">
                      <DateTime value={a.effectiveOn} dateOnly />
                    </td>
                    <td className="nowrap">
                      <DateTime value={a.endsOn} dateOnly />
                    </td>
                    <td>
                      <div className="stack stack-sm">
                        <Badge tone={TONE[a.status]}>{a.status}</Badge>
                        {canEdit && a.status !== "ended" ? (
                          <InlineAction action={endAuthorizationAction.bind(null, id)} fields={{ authorizationId: a.id }} variant="danger" pendingText="Ending…">
                            End authorization
                          </InlineAction>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No service authorizations.</p>
        )}
        {canEdit ? (
          <details className={s.detailsBtn}>
            <summary className="btn btn-secondary btn-sm">Add a service authorization</summary>
            <div className="card-quiet" style={{ marginTop: 12 }}>
              {credOptions.length ? (
                <ActionForm action={addAuthorizationAction.bind(null, id)}>
                  <SelectField name="serviceId" label="Service" options={services.map((sv) => ({ value: sv.id, label: sv.name }))} placeholder="Choose a service" required />
                  <CredentialPicker credentials={credOptions} stateNames={stateNames} />
                  <TextField name="effectiveOn" label="Effective on" type="date" required defaultValue={today} />
                  <TextField name="endsOn" label="Ends on" type="date" hint="Optional. Leave blank to keep it open until ended." />
                  <div>
                    <SubmitButton pendingText="Saving…">Add authorization</SubmitButton>
                  </div>
                </ActionForm>
              ) : (
                <p className="small">Record an active license or compact privilege first.</p>
              )}
            </div>
          </details>
        ) : null}
      </section>
    </>
  );
}
