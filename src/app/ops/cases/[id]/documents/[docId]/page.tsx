import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, FileField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, Banner, DateTime, DraftBadge } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { documentDetail } from "@/server/services/documents";
import { getSetting } from "@/server/settings";
import { aiProvider } from "@/server/providers/ai";
import { DOCUMENT_DISCLAIMER } from "@/config/document-templates";
import { isDomainError } from "@/domain/errors";
import { hasRole } from "@/domain/policy";
import {
  attachFormAction,
  decideSuggestionAction,
  deliverAction,
  generateSuggestionsAction,
  readyForSignatureAction,
  saveDocumentAction,
  signDocumentAction,
  voidDocumentAction,
} from "../../actions";
import { DOC_STATUS } from "../../_tabs/documents";

export const metadata: Metadata = { title: "Document" };

const SOURCE_LABEL: Record<string, string> = {
  "patient.name": "Patient record: legal name",
  "patient.dob": "Patient record: date of birth",
  "case.leaveType": "Case: requested leave type",
  "case.reference": "Case reference",
  "intake.job_title": "Intake: job title",
  "intake.essential_functions": "Intake: main job duties",
  "intake.presenting_concern": "Intake: presenting concern",
  "intake.work_examples": "Intake: work examples",
  "intake.daily_activities": "Intake: daily activities",
  "intake.current_providers": "Intake: current providers",
};

const DEFAULT_ATTESTATION =
  "I attest that I personally evaluated this patient and that this document reflects my independent clinical judgment.";

export default async function DocumentEditorPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
  const data = await run(actor, async (ctx) => {
    const d = await documentDetail(ctx, docId);
    const features = await getSetting(ctx.tx, "features");
    return { d, aiOn: features.aiDrafting && aiProvider().enabled };
  }).catch((e: unknown) => {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  });
  const { d, aiOn } = data;
  if (d.doc.caseId !== id) notFound();

  const assigned = Boolean(actor.clinicianId) && d.caseRow.assignedClinicianId === actor.clinicianId;
  const editable = assigned && (d.doc.status === "draft" || d.doc.status === "ready_for_signature");
  const signed = d.doc.status === "signed" || d.doc.status === "delivered";
  const pendingSuggestions = d.suggestions.filter((s) => !s.acceptedAt && !s.rejectedAt);
  const label = (key: string) => d.template.fields.find((f) => f.key === key)?.label ?? key;
  const status = DOC_STATUS[d.doc.status];

  return (
    <div className="stack stack-lg">
      <nav aria-label="Breadcrumb" className="small">
        <Link href="/ops/cases">Cases</Link> <span aria-hidden="true">/</span> <Link href={`/ops/cases/${id}?tab=documents`}>{d.caseRow.reference}</Link> <span aria-hidden="true">/</span> Document
      </nav>
      <header className="page-head">
        <p className="eyebrow">Documentation · {d.caseRow.reference}</p>
        <div className="row row-between" style={{ alignItems: "flex-end" }}>
          <h1>{d.template.title}</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="lede">{d.template.description}</p>
      </header>

      {!assigned ? (
        <Banner tone="info" icon="info">
          Read only. Only the assigned clinician can edit or sign this document.
        </Banner>
      ) : null}

      <div className="two-col">
        <div className="stack stack-lg">
          {editable ? (
            <section className="card stack" aria-labelledby="ed-h">
              <h2 id="ed-h">Edit</h2>
              <p className="muted small">Each save creates a new version authored by you. Pre-filled values show where they came from; change anything that is not right.</p>
              <ActionForm action={saveDocumentAction.bind(null, id, docId)} className="form form-wide">
                {d.template.fields.map((f) => {
                  const src = d.content.sources[f.key];
                  const hint = [f.help, src ? `Pre-filled from ${SOURCE_LABEL[src] ?? src}.` : null].filter(Boolean).join(" ") || undefined;
                  const value = d.content.fields[f.key] ?? "";
                  return f.kind === "textarea" ? (
                    <TextArea key={f.key} name={f.key} label={f.label} hint={hint} required={f.required} defaultValue={value} rows={5} maxLength={8000} />
                  ) : (
                    <TextField key={f.key} name={f.key} label={f.label} hint={hint} required={f.required} defaultValue={value} type={f.kind === "date" ? "date" : "text"} maxLength={f.kind === "date" ? undefined : 500} />
                  );
                })}
                <SubmitButton>Save version</SubmitButton>
              </ActionForm>
            </section>
          ) : null}

          {d.template.requiresAttachment ? (
            <section className="card stack" aria-labelledby="att-h">
              <h2 id="att-h">Completed form</h2>
              {d.attachment ? (
                <p className="small">
                  <a href={`/api/files/${d.attachment.id}`} target="_blank" rel="noopener noreferrer">
                    Open the attached completed form<span className="visually-hidden"> (opens in a new tab)</span>
                  </a>{" "}
                  · attached <DateTime value={d.attachment.createdAt} />
                </p>
              ) : (
                <p className="muted small">Attach the employer form you completed, as a PDF. It is required before this document can be signed.</p>
              )}
              {editable ? (
                <ActionForm action={attachFormAction.bind(null, id, docId)} encType="multipart/form-data">
                  <FileField name="file" label={d.attachment ? "Replace with a new PDF" : "Completed form (PDF)"} accept="application/pdf" required />
                  <SubmitButton variant="secondary">Attach</SubmitButton>
                </ActionForm>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="pv-h" className="stack">
            <h2 id="pv-h">Preview</h2>
            <div className={`doc-preview${signed ? "" : " draft"}`}>
              {!signed ? <p className="watermark">DRAFT — NOT SIGNED</p> : null}
              <p className="eyebrow">LeaveBridge Health</p>
              <h3>{d.template.title}</h3>
              <p className="fine">Reference {d.caseRow.reference}</p>
              <dl className="stack">
                {d.template.fields.map((f) => {
                  const v = d.content.fields[f.key]?.trim();
                  return (
                    <div key={f.key}>
                      <dt className="small" style={{ fontWeight: 600 }}>
                        {f.label}
                      </dt>
                      <dd className="break" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {v || <span className="muted">{f.required ? "Required — not yet completed" : "—"}</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {d.signature ? (
                <p className="small">
                  <b>Electronically signed</b> <DateTime value={d.signature.signedAt} /> · content hash <span className="mono">{d.signature.contentHash.slice(0, 16)}…</span>
                </p>
              ) : null}
              <p className="fine">{DOCUMENT_DISCLAIMER}</p>
            </div>
          </section>
        </div>

        <aside className="stack stack-lg" aria-label="Document actions">
          <section className="card stack" aria-labelledby="st-h">
            <h2 id="st-h">Status</h2>
            <p>
              <Badge tone={status.tone}>{status.label}</Badge> · version {d.currentVersion.versionNo}
            </p>

            {assigned && d.doc.status === "draft" ? (
              <ActionForm action={readyForSignatureAction.bind(null, id, docId)} className="">
                <p className="small muted">Checks required fields{d.template.requiresAttachment ? ", the attached form" : ""} and that every AI suggestion was accepted or dismissed.</p>
                <SubmitButton>Mark ready for signature</SubmitButton>
              </ActionForm>
            ) : null}

            {assigned && d.doc.status === "ready_for_signature" ? (
              <div className="stack">
                <h3>Sign</h3>
                <p className="small muted">Signing binds your signature to version {d.currentVersion.versionNo} exactly as shown in the preview. You will be asked to confirm your password.</p>
                <ActionForm action={signDocumentAction.bind(null, id, docId)}>
                  <TextArea name="attestation" label="Attestation" defaultValue={DEFAULT_ATTESTATION} required rows={3} maxLength={500} />
                  <Checkbox name="confirm" required>
                    I have reviewed this document and I am signing it as the treating clinician.
                  </Checkbox>
                  <SubmitButton pendingText="Signing…">Sign document</SubmitButton>
                </ActionForm>
                <p className="fine">Editing after this point saves a new draft version, which must be marked ready again.</p>
              </div>
            ) : null}

            {d.doc.status === "signed" ? (
              <ActionForm action={deliverAction.bind(null, id, docId)} className="">
                <p className="small muted">Places the signed PDF in the patient&rsquo;s portal.</p>
                <SubmitButton>Deliver to patient</SubmitButton>
              </ActionForm>
            ) : null}

            {signed && d.doc.signedFileId ? (
              <a href={`/api/files/${d.doc.signedFileId}`} target="_blank" rel="noopener noreferrer" className="small">
                Open signed PDF<span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : null}

            {assigned && d.doc.status !== "delivered" && d.doc.status !== "voided" ? (
              <details>
                <summary className="btn btn-quiet btn-sm">Void this document</summary>
                <ActionForm action={voidDocumentAction.bind(null, id, docId)} className="mt-1">
                  <p className="small muted">Voided documents are kept for the record but can&rsquo;t be signed or delivered.</p>
                  <SubmitButton variant="danger" size="sm">
                    Void document
                  </SubmitButton>
                </ActionForm>
              </details>
            ) : null}
          </section>

          {aiOn && (d.suggestions.length || editable) ? (
            <section className="card stack" aria-labelledby="ai-h">
              <h2 id="ai-h">Drafting suggestions</h2>
              <p className="small muted">Optional AI-drafted text for limited fields, each citing the record it came from. Nothing is added to the document unless you accept it, and accepted text becomes your own editable version.</p>
              {editable && d.template.fields.some((f) => f.aiAllowed) ? (
                <ActionForm action={generateSuggestionsAction.bind(null, id, docId)} className="">
                  <SubmitButton variant="secondary" size="sm">
                    Suggest drafts
                  </SubmitButton>
                </ActionForm>
              ) : null}
              {pendingSuggestions.length === 0 ? <p className="fine">No suggestions waiting for review.</p> : null}
              {pendingSuggestions.map((s) => {
                const refs = Array.isArray(s.sourceRefs) ? (s.sourceRefs as string[]) : [];
                return (
                  <div key={s.id} className="suggestion">
                    <DraftBadge />
                    <b className="small">{label(s.fieldKey)}</b>
                    <p className="break" style={{ whiteSpace: "pre-wrap" }}>
                      {s.text}
                    </p>
                    <p className="fine">Sources: {refs.map((r) => SOURCE_LABEL[r] ?? r).join("; ")}</p>
                    {editable ? (
                      <div className="btn-row">
                        <ActionForm action={decideSuggestionAction.bind(null, id, docId, s.id, true)} className="">
                          <SubmitButton size="sm" variant="secondary">
                            Accept into my draft
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm action={decideSuggestionAction.bind(null, id, docId, s.id, false)} className="">
                          <SubmitButton size="sm" variant="quiet">
                            Dismiss
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}

          <section className="card stack" aria-labelledby="ver-h">
            <h2 id="ver-h">Versions</h2>
            <ol className="list-rows">
              {d.versions.map((v) => (
                <li key={v.id}>
                  <div className="grow">
                    <b>Version {v.versionNo}</b>
                    {v.id === d.currentVersion.id ? <span className="muted small"> · current</span> : null}
                    {d.doc.signedVersionId === v.id ? <span className="muted small"> · signed</span> : null}
                    <div className="fine">
                      {v.origin === "clinician" ? "Clinician" : "AI draft"} · <DateTime value={v.createdAt} />
                    </div>
                  </div>
                  <span className="mono fine">{v.contentHash.slice(0, 8)}</span>
                </li>
              ))}
            </ol>
          </section>
          {hasRole(actor, ["clinical_director"]) && !assigned ? <p className="fine">You are viewing as clinical director.</p> : null}
        </aside>
      </div>
    </div>
  );
}
