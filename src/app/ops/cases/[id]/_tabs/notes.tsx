import { ActionForm, ChoiceGroup, SubmitButton, TextArea } from "@/components/forms";
import { Badge, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { caseNotesWithAuthors } from "@/server/services/ops-queries";
import type { TabProps } from "../_shared";
import { addNoteAction } from "../actions";

export async function NotesTab({ ws, actor }: TabProps) {
  const clinical = ws.access === "clinical";
  const notes = await run(actor, (ctx) => caseNotesWithAuthors(ctx, ws.row.id));
  return (
    <div className="two-col">
      <section className="stack" aria-labelledby="notes-h">
        <h2 id="notes-h">Notes</h2>
        <p className="muted small">Internal and append-only: notes can&rsquo;t be edited or deleted. Patients never see them.{clinical ? "" : " Clinical notes are hidden in the operational view."}</p>
        {notes.length ? (
          <ul className="list-plain">
            {notes.map((n) => (
              <li key={n.id} className="card-flat stack stack-sm">
                <span className="row">
                  <Badge tone={n.visibility === "clinical" ? "progress" : "neutral"}>{n.visibility === "clinical" ? "Clinical" : "Operational"}</Badge>
                  <span className="muted small break">
                    {n.author} · <DateTime value={n.createdAt} />
                  </span>
                </span>
                <p className="break" style={{ whiteSpace: "pre-wrap" }}>
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No notes yet" />
        )}
      </section>
      <section className="card stack" aria-labelledby="notes-add">
        <h2 id="notes-add">Add a note</h2>
        <ActionForm action={addNoteAction.bind(null, ws.row.id)}>
          {clinical ? (
            <ChoiceGroup
              name="visibility"
              legend="Visibility"
              defaultValue="operational"
              options={[
                { value: "operational", label: "Operational", description: "Visible to all operations staff." },
                { value: "clinical", label: "Clinical", description: "Visible with clinical access only." },
              ]}
            />
          ) : (
            <input type="hidden" name="visibility" value="operational" />
          )}
          <TextArea name="body" label="Note" required rows={5} maxLength={4000} />
          <SubmitButton variant="secondary">Add note</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
