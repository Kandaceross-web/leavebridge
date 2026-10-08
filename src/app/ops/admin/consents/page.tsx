import type { Metadata } from "next";
import { ActionForm, SelectField, SubmitButton, TextArea } from "@/components/forms";
import { Badge, DateTime, Markdown, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listConsents } from "@/server/services/admin";
import { isProduction } from "@/server/env";
import { hasRole } from "@/domain/policy";
import { InlineAction, REVIEW_TAG_OPTIONS, label } from "../_lib/ui";
import s from "../_lib/admin.module.css";
import { draftConsentAction, publishConsentAction } from "./actions";

export const metadata: Metadata = { title: "Consents" };

const TONE = { draft: "action", published: "done", retired: "neutral" } as const;

export default async function ConsentsPage() {
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const canEdit = hasRole(actor, ["admin"]);
  const docs = await run(actor, (ctx) => listConsents(ctx));
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Consents"
        lede={
          <>
            Consent text is versioned. Publishing a draft retires the previous version; existing signatures keep the version and hash they signed.
            {isProduction ? " In production, a version with an open review tag cannot be published." : " Outside production, tagged versions can be published for testing."}
          </>
        }
      />
      {docs.map((d) => {
        const published = d.versions.find((v) => v.status === "published");
        const latest = d.versions[0];
        return (
          <section key={d.id} className="card stack" aria-labelledby={`doc-${d.id}`}>
            <div className="card-head">
              <div className="stack stack-sm">
                <h2 id={`doc-${d.id}`}>{d.title}</h2>
                <div className="row small">
                  <span className="tag">{d.key}</span>
                  <span className="muted">Required before {label(d.requiredBefore).toLowerCase()}</span>
                  {d.jurisdictionCode ? <span className="tag">{d.jurisdictionCode} only</span> : null}
                  {!d.active ? <Badge>Inactive</Badge> : null}
                </div>
              </div>
              {published ? <Badge tone="done">Published v{published.version}</Badge> : <Badge tone="alert">No published version</Badge>}
            </div>
            <div className="tbl-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th scope="col">Version</th>
                    <th scope="col">Status</th>
                    <th scope="col">Review tag</th>
                    <th scope="col">Effective from</th>
                    <th scope="col">Created</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.versions.map((v) => (
                    <tr key={v.id} id={`v-${v.id}`}>
                      <th scope="row">v{v.version}</th>
                      <td>
                        <Badge tone={TONE[v.status]}>{v.status}</Badge>
                      </td>
                      <td>{v.reviewTag ? <ReviewTag tag={v.reviewTag} /> : <span className="muted">None</span>}</td>
                      <td className="nowrap">
                        <DateTime value={v.effectiveFrom} />
                      </td>
                      <td className="nowrap">
                        <DateTime value={v.createdAt} />
                      </td>
                      <td>
                        {canEdit && v.status === "draft" ? (
                          isProduction && v.reviewTag ? (
                            <span className="small muted">Blocked until review tag is cleared</span>
                          ) : (
                            <InlineAction action={publishConsentAction} fields={{ versionId: v.id }} variant="primary" pendingText="Publishing…">
                              Publish v{v.version}
                            </InlineAction>
                          )
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {d.versions.map((v) => (
              <details key={v.id} className={s.details}>
                <summary>
                  Preview v{v.version} ({v.status})
                </summary>
                <div className={`doc-preview${v.status === "draft" ? " draft" : ""}`}>
                  <Markdown source={v.bodyMd} />
                  <p className="fine mono break">SHA-256 {v.bodyHash}</p>
                </div>
              </details>
            ))}
            {canEdit ? (
              <details className={s.details}>
                <summary>Draft a new version</summary>
                <ActionForm action={draftConsentAction.bind(null, d.id)} className="form form-wide">
                  <TextArea
                    name="bodyMd"
                    label="Consent text (Markdown)"
                    rows={14}
                    required
                    defaultValue={latest?.bodyMd ?? ""}
                    hint="Supports ## headings, - lists, **bold**, > notes and [links](https://example.invalid). Starts from the latest version. Legal text must come from reviewed sources."
                  />
                  <SelectField name="reviewTag" label="Review tag" options={REVIEW_TAG_OPTIONS} placeholder="None (review complete)" defaultValue={latest?.reviewTag ?? "LEGAL_REVIEW_REQUIRED"} />
                  <div>
                    <SubmitButton pendingText="Saving…">Save draft</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
