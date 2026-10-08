import type { Metadata } from "next";
import { ActionForm, Checkbox, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { getSettings, settingReviewStatus } from "@/server/settings";
import { SETTING_KEYS } from "@/config/settings";
import { REVIEW_TAG_OPTIONS } from "../_lib/ui";
import { saveSettingAction } from "./actions";
import { fieldKind, fieldLabel } from "./shape";

export const metadata: Metadata = { title: "Business rules" };

export default async function SettingsPage() {
  const { actor } = await requireStaffSession(["admin"]);
  const { values, status } = await run(actor, async (ctx) => ({ values: await getSettings(ctx.tx, SETTING_KEYS), status: await settingReviewStatus(ctx.tx) }));
  const open = status.filter((s) => s.reviewTag).length;
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Business rules"
        lede={`Typed configuration with safe defaults. Every save is validated against the setting's schema and recorded in the audit log. ${open} of ${status.length} settings still carry a review tag.`}
      />
      <nav aria-label="Settings on this page" className="row small">
        {status.map((s) => (
          <a key={s.key} href={`#setting-${s.key}`} className="chip-link">
            {s.label}
          </a>
        ))}
      </nav>
      {status.map((st) => {
        const value = values[st.key] as Record<string, unknown>;
        return (
          <section key={st.key} id={`setting-${st.key}`} className="card stack" aria-labelledby={`h-${st.key}`}>
            <div className="card-head">
              <div className="stack stack-sm">
                <h2 id={`h-${st.key}`}>{st.label}</h2>
                <div className="row small">
                  <span className="tag">{st.key}</span>
                  {st.overridden ? <Badge tone="info">Overridden</Badge> : <Badge>Default</Badge>}
                  {st.reviewTag ? <ReviewTag tag={st.reviewTag} /> : <Badge tone="done">No open review</Badge>}
                </div>
              </div>
            </div>
            {st.reviewNote ? <p className="small muted">Open decisions: {st.reviewNote}</p> : null}
            <ActionForm action={saveSettingAction.bind(null, st.key)} className="form form-wide">
              {Object.entries(value).map(([name, v]) => {
                const kind = fieldKind(v);
                const lbl = fieldLabel(name);
                switch (kind) {
                  case "boolean":
                    return (
                      <Checkbox key={name} name={name} defaultChecked={v as boolean}>
                        {lbl}
                      </Checkbox>
                    );
                  case "number":
                    return <TextField key={name} name={name} label={lbl} type="number" inputMode="numeric" defaultValue={String(v)} required />;
                  case "string":
                    return <TextField key={name} name={name} label={lbl} defaultValue={v as string} />;
                  case "text":
                    return <TextArea key={name} name={name} label={lbl} rows={3} defaultValue={v as string} />;
                  case "lines":
                    return <TextArea key={name} name={name} label={lbl} rows={Math.max(3, (v as string[]).length + 1)} defaultValue={(v as string[]).join("\n")} hint="One item per line." />;
                  case "json":
                    return <TextArea key={name} name={name} label={`${lbl} (JSON)`} rows={10} defaultValue={JSON.stringify(v, null, 2)} hint="Edit as JSON. The structure is validated on save." />;
                }
              })}
              <SelectField name="reviewTag" label="Review tag" options={REVIEW_TAG_OPTIONS} placeholder="None (review complete)" defaultValue={st.reviewTag ?? ""} hint="Clear the tag only when the decision noted above is closed." />
              <div>
                <SubmitButton pendingText="Saving…">Save {st.label.toLowerCase()}</SubmitButton>
              </div>
            </ActionForm>
          </section>
        );
      })}
    </>
  );
}
