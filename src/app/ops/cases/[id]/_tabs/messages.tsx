import type { ReactNode } from "react";
import { ActionForm, SubmitButton, TextArea } from "@/components/forms";
import { Banner, DateTime } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { threadMessages } from "@/server/services/messaging";
import { hasRole } from "@/domain/policy";
import { sendMessageAction } from "../actions";
import { isAssigned, type TabProps } from "../_shared";

type Msg = Awaited<ReturnType<typeof threadMessages>>[number];

export async function MessagesTab({ ws, actor }: TabProps) {
  const clinical = ws.access === "clinical";
  const data = await run(actor, async (ctx) => ({
    admin: await threadMessages(ctx, ws.row.id, "administrative"),
    clinical: clinical ? await threadMessages(ctx, ws.row.id, "clinical") : null,
  }));
  const canReplyClinical = clinical && (isAssigned(ws, actor) || hasRole(actor, ["clinical_director"]));
  const closed = ["closed", "cancelled"].includes(ws.row.status);
  return (
    <div className="stack stack-lg">
      <Banner tone="info" icon="info">
        Secure messages are not monitored in real time and are not for emergencies. Patients see every message you send here.
      </Banner>
      <div className="grid g2">
        <Thread
          title="Administrative"
          hint="Scheduling, payments, documents and account questions."
          messages={data.admin}
          form={closed ? null : <ActionForm action={sendMessageAction.bind(null, ws.row.id, "administrative")}><TextArea name="body" label="Reply (administrative)" required rows={3} maxLength={5000} /><SubmitButton variant="secondary">Send</SubmitButton></ActionForm>}
        />
        {data.clinical ? (
          <Thread
            title="Clinical"
            hint="Between the patient and the assigned clinician."
            messages={data.clinical}
            form={canReplyClinical && !closed ? <ActionForm action={sendMessageAction.bind(null, ws.row.id, "clinical")}><TextArea name="body" label="Reply (clinical)" required rows={3} maxLength={5000} /><SubmitButton variant="secondary">Send</SubmitButton></ActionForm> : null}
          />
        ) : (
          <div className="card-quiet">
            <p className="small muted">The clinical thread is limited to the assigned clinician and clinical directors.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Thread({ title, hint, messages, form }: { title: string; hint: string; messages: Msg[]; form: ReactNode }) {
  const id = `thread-${title.toLowerCase()}`;
  return (
    <section className="card stack" aria-labelledby={id}>
      <div>
        <h2 id={id}>{title}</h2>
        <p className="muted small">{hint}</p>
      </div>
      {messages.length ? (
        <ol className="thread list-plain" aria-label={`${title} messages`}>
          {messages.map((m) => (
            <li key={m.id} className={`msg${m.fromPatient ? "" : " mine"}`}>
              <span className="meta">
                {m.fromPatient ? `${m.sender} (patient)` : m.sender} · <DateTime value={m.createdAt} />
              </span>
              <span className="body">{m.body}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted small">No messages yet.</p>
      )}
      {form}
    </section>
  );
}
