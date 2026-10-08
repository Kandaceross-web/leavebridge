import { ActionForm, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { caseFileList } from "@/server/services/ops-queries";
import { hasRole } from "@/domain/policy";
import { reviewEmployerFormAction } from "../actions";
import { FORM_KIND_LABEL, type TabProps } from "../_shared";

const CATEGORY_LABEL: Record<string, string> = {
  employer_form: "Employer form",
  supporting: "Supporting document",
  identity: "Photo ID",
  generated: "Generated document",
};

const size = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export async function FilesTab({ ws, actor }: TabProps) {
  const data = await run(actor, (ctx) => caseFileList(ctx, ws.row.id));
  const canReview = hasRole(actor, ["clinician", "clinical_director"]) && data.access === "clinical";
  return (
    <div className="stack stack-lg">
      <section className="stack" aria-labelledby="files-h">
        <h2 id="files-h">Files</h2>
        {data.access !== "clinical" ? <p className="muted small">With operational access you can open photo ID files only. Other files open for the assigned clinician.</p> : null}
        {data.files.length ? (
          <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Category</th>
                  <th scope="col">Type</th>
                  <th scope="col">Size</th>
                  <th scope="col">Uploaded</th>
                  <th scope="col">Scan</th>
                </tr>
              </thead>
              <tbody>
                {data.files.map((f) => (
                  <tr key={f.id}>
                    <td className="break">
                      {f.canDownload ? (
                        <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer">
                          {f.name}
                          <span className="visually-hidden"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        f.name
                      )}
                    </td>
                    <td className="nowrap">{CATEGORY_LABEL[f.category] ?? f.category}</td>
                    <td className="nowrap mono small">{f.mimeType}</td>
                    <td className="nowrap">{size(f.sizeBytes)}</td>
                    <td className="nowrap">
                      <DateTime value={f.createdAt} />
                    </td>
                    <td>
                      <Badge tone={f.scanStatus === "clean" ? "progress" : f.scanStatus === "rejected" ? "alert" : "neutral"}>{f.scanStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No files on this case" />
        )}
      </section>

      {data.access === "clinical" ? (
        <section className="stack" aria-labelledby="forms-h">
          <h2 id="forms-h">Employer forms</h2>
          {data.forms.length ? (
            data.forms.map((f, i) => (
              <div key={f.id} className="card stack">
                <div className="card-head">
                  <h3>
                    Form {i + 1}: {FORM_KIND_LABEL[f.formKind]}
                  </h3>
                  <Badge tone={f.status === "received" ? "action" : "progress"}>{f.status}</Badge>
                </div>
                <p className="small">
                  <a href={`/api/files/${f.fileId}`} target="_blank" rel="noopener noreferrer">
                    Open the uploaded form<span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                  {f.pagesRequiringCompletion.length ? ` · pages to complete: ${f.pagesRequiringCompletion.join(", ")}` : ""}
                  {f.reviewedAt ? (
                    <>
                      {" "}
                      · reviewed <DateTime value={f.reviewedAt} />
                    </>
                  ) : null}
                </p>
                {f.notes ? <p className="small break">Reviewer notes: {f.notes}</p> : null}
                {canReview ? (
                  <details>
                    <summary className="btn btn-secondary btn-sm">{f.status === "received" ? "Review form" : "Update review"}</summary>
                    <div className="mt-2">
                      <ActionForm action={reviewEmployerFormAction.bind(null, ws.row.id, f.id)}>
                        <SelectField name="formKind" label="Form type" required defaultValue={f.formKind} options={Object.entries(FORM_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
                        <TextField name="pages" label="Pages that need clinician completion" hint="Page numbers separated by commas, for example 2, 3." defaultValue={f.pagesRequiringCompletion.join(", ")} inputMode="text" />
                        <TextArea name="notes" label="Notes" defaultValue={f.notes} rows={3} maxLength={2000} />
                        <SubmitButton variant="secondary">Save form review</SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ) : null}
              </div>
            ))
          ) : (
            <p className="muted small">No employer forms uploaded.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
