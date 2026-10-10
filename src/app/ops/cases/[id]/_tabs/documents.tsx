import Link from "next/link";
import { ActionForm, SelectField, SubmitButton } from "@/components/forms";
import { Badge, DateTime, Empty, type Tone } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { caseDocuments } from "@/server/services/documents";
import { caseFileList } from "@/server/services/ops-queries";
import { CASE_DOCUMENT_KINDS, DOCUMENT_TEMPLATES } from "@/config/document-templates";
import type { DocumentStatus } from "@/domain/constants";
import { hasRole } from "@/domain/policy";
import { createDocumentAction, deliverAction } from "../actions";
import { isAssigned, LimitedPanel, FORM_KIND_LABEL, tryClinical, type TabProps } from "../_shared";

export const DOC_STATUS: Record<DocumentStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "action" },
  ready_for_signature: { label: "Ready for signature", tone: "info" },
  signed: { label: "Signed", tone: "progress" },
  delivered: { label: "Delivered", tone: "done" },
  voided: { label: "Voided", tone: "neutral" },
};

export async function DocumentsTab(props: TabProps) {
  const { ws, actor } = props;
  const canDeliver = hasRole(actor, ["clinician", "clinical_director", "admin", "support"]);

  if (ws.access !== "clinical") {
    // Operational view: titles and status only, so support can deliver signed documents.
    const docs = await run(actor, (ctx) => caseDocuments(ctx, ws.row.id, "operational"));
    return (
      <div className="stack stack-lg">
        <LimitedPanel {...props} />
        <section className="stack" aria-labelledby="docs-op-h">
          <h2 id="docs-op-h">Document status</h2>
          <DocTable docs={docs} caseId={ws.row.id} canDeliver={canDeliver} linkToEditor={false} />
        </section>
      </div>
    );
  }

  const data = await tryClinical(
    run(actor, async (ctx) => ({
      docs: await caseDocuments(ctx, ws.row.id, "clinical"),
      files: await caseFileList(ctx, ws.row.id),
    })),
  );
  if (!data) return <LimitedPanel {...props} />;
  const canCreate = isAssigned(ws, actor) && ["provider_review", "provider_signature", "completed"].includes(ws.row.status);

  return (
    <div className="stack stack-lg">
      <section className="stack" aria-labelledby="docs-h">
        <h2 id="docs-h">Documents</h2>
        <DocTable docs={data.docs} caseId={ws.row.id} canDeliver={canDeliver} linkToEditor />
      </section>
      {canCreate ? (
        <section className="card stack" aria-labelledby="docs-new">
          <h2 id="docs-new">Prepare a document</h2>
          <p className="muted small">Leave documentation can be prepared after you record that documentation is clinically supported. Fields are pre-filled only from existing record data, with the source shown.</p>
          <ActionForm action={createDocumentAction.bind(null, ws.row.id)}>
            <SelectField
              name="kind"
              label="Document type"
              required
              placeholder="Choose…"
              options={CASE_DOCUMENT_KINDS.map((k) => ({ value: k, label: DOCUMENT_TEMPLATES[k].title }))}
            />
            {data.files.forms.length ? (
              <SelectField
                name="employerFormId"
                label="Related employer form (optional)"
                placeholder="None"
                options={data.files.forms.map((f, i) => ({ value: f.id, label: `Form ${i + 1}: ${FORM_KIND_LABEL[f.formKind]}` }))}
              />
            ) : null}
            <SubmitButton>Create draft</SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}

function DocTable({ docs, caseId, canDeliver, linkToEditor }: { docs: Awaited<ReturnType<typeof caseDocuments>>; caseId: string; canDeliver: boolean; linkToEditor: boolean }) {
  if (!docs.length) return <Empty title="No documents yet" />;
  return (
    <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
      <table className="t">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
            <th scope="col">Updated</th>
            <th scope="col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{linkToEditor ? <Link href={`/ops/cases/${caseId}/documents/${d.id}`}>{d.title}</Link> : d.title}</td>
              <td>
                <Badge tone={DOC_STATUS[d.status].tone}>{DOC_STATUS[d.status].label}</Badge>
              </td>
              <td className="nowrap">
                <DateTime value={d.createdAt} />
              </td>
              <td className="nowrap">
                <DateTime value={d.updatedAt} />
              </td>
              <td className="nowrap">
                {d.status === "signed" && canDeliver ? (
                  <ActionForm action={deliverAction.bind(null, caseId, d.id)} className="">
                    <SubmitButton size="sm" variant="secondary">
                      Deliver to patient
                    </SubmitButton>
                  </ActionForm>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
