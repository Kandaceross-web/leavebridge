import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, Banner, KeyValue, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listTemplates } from "@/server/services/admin";
import { ALLOWED_TEMPLATE_VARS } from "@/domain/notifications/templates";
import { hasRole } from "@/domain/policy";
import { label } from "../_lib/ui";
import { saveTemplateAction } from "./actions";

export const metadata: Metadata = { title: "Notification templates" };

export default async function TemplatesPage() {
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const canEdit = hasRole(actor, ["admin"]);
  const rows = await run(actor, (ctx) => listTemplates(ctx));
  const keys = [...new Set(rows.map((r) => r.key))];
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Notification templates"
        lede="Email, text and in-app notifications only tell people that something is waiting in their secure portal."
      />
      <Banner tone="info" icon="lock">
        <p>
          <b>Notifications never contain clinical details.</b> No conditions, measures, outcomes, determinations or leave decisions. Every save
          is checked automatically.
        </p>
        <p className="small">
          Allowed variables:{" "}
          {ALLOWED_TEMPLATE_VARS.map((v) => (
            <code key={v} style={{ marginRight: 8 }}>{`{{${v}}}`}</code>
          ))}
        </p>
      </Banner>
      {keys.map((key) => (
        <section key={key} className="card stack" aria-labelledby={`k-${key}`}>
          <h2 id={`k-${key}`}>
            {label(key)} <span className="tag">{key}</span>
          </h2>
          <div className="grid g2">
            {rows
              .filter((r) => r.key === key)
              .map((t) => (
                <div key={t.id} id={`tpl-${t.id}`} className="card-flat stack stack-sm">
                  <div className="row">
                    <h3>{t.channel === "sms" ? "Text message" : t.channel === "in_app" ? "In-app" : "Email"}</h3>
                    {t.active ? <Badge tone="done">Active</Badge> : <Badge>Inactive</Badge>}
                    <ReviewTag tag={t.reviewTag} />
                  </div>
                  {canEdit ? (
                    <ActionForm action={saveTemplateAction.bind(null, t.id, t.subject !== null)} className="form form-wide">
                      {t.subject !== null ? <TextField name="subject" label="Subject" required defaultValue={t.subject} maxLength={200} /> : null}
                      <TextArea name="body" label="Body" required rows={t.channel === "sms" ? 3 : 6} defaultValue={t.body} maxLength={1000} />
                      <Checkbox name="active" defaultChecked={t.active}>
                        Active
                      </Checkbox>
                      <div>
                        <SubmitButton size="sm" pendingText="Saving…">
                          Save template
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  ) : (
                    <KeyValue
                      items={[
                        ...(t.subject !== null ? ([["Subject", t.subject]] as [string, string][]) : []),
                        ["Body", <span key="b" style={{ whiteSpace: "pre-wrap" }}>{t.body}</span>],
                      ]}
                    />
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
