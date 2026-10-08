import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, DateTime, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listQuestionnaires, listRulesets } from "@/server/services/admin";
import { isProduction } from "@/server/env";
import { rulesetSchema, type Condition, type RulesetDefinition } from "@/domain/screening/engine";
import { InlineAction } from "../_lib/ui";
import s from "../_lib/admin.module.css";
import { draftRulesetAction, publishRulesetAction, setQuestionnaireEnabledAction } from "./actions";

export const metadata: Metadata = { title: "Screening & measures" };

const TONE = { draft: "action", published: "done", retired: "neutral" } as const;

function summarize(c: Condition): string {
  if ("all" in c) return c.all.length === 1 ? summarize(c.all[0]!) : `all of (${c.all.map(summarize).join("; ")})`;
  if ("any" in c) return c.any.length === 1 ? summarize(c.any[0]!) : `any of (${c.any.map(summarize).join("; ")})`;
  if ("not" in c) return `not (${summarize(c.not)})`;
  switch (c.op) {
    case "eq":
      return `${c.q} = ${String(c.value)}`;
    case "neq":
      return `${c.q} ≠ ${String(c.value)}`;
    case "in":
      return `${c.q} is one of [${c.value.join(", ")}]`;
    case "includes_any":
      return `${c.q} includes any of [${c.value.join(", ")}]`;
    case "answered":
      return `${c.q} is answered`;
    case "unanswered":
      return `${c.q} is unanswered`;
    case "state_inactive":
      return `${c.q} is not an active state`;
    case "date_within_days":
      return `${c.q} is within ${c.value} days`;
    case "answers_differ":
      return `${c.a} differs from ${c.b}`;
  }
}

function describeQuestionnaire(def: unknown): string {
  const d = def as { sections?: { questions?: unknown[] }[]; name?: string; items?: unknown[] };
  if (Array.isArray(d.sections)) return `${d.sections.length} sections, ${d.sections.reduce((n, x) => n + (x.questions?.length ?? 0), 0)} questions`;
  if (Array.isArray(d.items)) return `${d.name ?? "Measure"} · ${d.items.length} items`;
  return "—";
}

function RulesetView({ def }: { def: RulesetDefinition }) {
  return (
    <div className="stack">
      <div className={s.rules}>
        <h4>Steps</h4>
        <ol className="small">
          {def.steps.map((st) => (
            <li key={st.key}>
              <b>{st.title}</b> <span className="tag">{st.key}</span>
              {st.description ? <span className="muted"> · {st.description}</span> : null}
            </li>
          ))}
        </ol>
      </div>
      <div className={s.rules}>
        <h4>Questions</h4>
        <div className={`tbl-wrap ${s.rel}`}>
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Step</th>
                <th scope="col">Type</th>
                <th scope="col">Question</th>
                <th scope="col">Shown when</th>
              </tr>
            </thead>
            <tbody>
              {def.questions.map((q) => (
                <tr key={q.key}>
                  <td className="mono">{q.key}</td>
                  <td className="mono">{q.step}</td>
                  <td>
                    {q.kind}
                    {q.required ? "" : " (optional)"}
                  </td>
                  <td className="small">
                    {q.label}
                    {q.options?.length ? <div className="fine">{q.options.map((o) => o.value).join(" · ")}</div> : null}
                  </td>
                  <td className="small mono">{q.showIf ? summarize(q.showIf) : "always"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className={s.rules}>
        <h4>Rules</h4>
        <div className={`tbl-wrap ${s.rel}`}>
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Rule</th>
                <th scope="col">When</th>
                <th scope="col">Outcome</th>
                <th scope="col">Reason code</th>
              </tr>
            </thead>
            <tbody>
              {def.rules.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td className="small mono">{summarize(r.when)}</td>
                  <td>
                    <Badge tone={r.outcome === "EMERGENCY" ? "alert" : r.outcome === "NOT_AVAILABLE" ? "neutral" : "action"}>{r.outcome}</Badge>
                  </td>
                  <td className="mono small">{r.reasonCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">Rules are evaluated together; the most severe matching outcome wins. No match means AVAILABLE.</p>
      </div>
    </div>
  );
}

export default async function QuestionnairesPage() {
  const { actor } = await requireStaffSession(["admin", "clinical_director"]);
  const { qs, rulesets } = await run(actor, async (ctx) => ({ qs: await listQuestionnaires(ctx), rulesets: await listRulesets(ctx) }));
  const published = rulesets.find((r) => r.status === "published");
  const parsed = published ? rulesetSchema.safeParse(published.definition) : null;
  const drafts = rulesets.filter((r) => r.status === "draft");
  const starter = JSON.stringify((drafts[0] ?? published)?.definition ?? { steps: [], questions: [], rules: [] }, null, 2);
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Screening & measures"
        lede="Intake questionnaires, validated measures and the eligibility screening rules. Screening routes requests; it never makes a clinical decision."
      />

      <section className="card stack" aria-labelledby="q-h">
        <h2 id="q-h">Questionnaires</h2>
        <p className="small muted">Validated measures are enabled for development; production enablement of each instrument is gated by open decision CLN-05.</p>
        <div className={`tbl-wrap ${s.rel}`}>
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Questionnaire</th>
                <th scope="col">Kind</th>
                <th scope="col">Contents</th>
                <th scope="col">Status</th>
                <th scope="col">Review tag</th>
                <th scope="col">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {qs.map((q) => (
                <tr key={q.id} id={`q-${q.id}`}>
                  <th scope="row">
                    <span className="mono">{q.key}</span> v{q.version}
                  </th>
                  <td>{q.kind === "measure" ? "Measure" : "Intake"}</td>
                  <td className="small">{describeQuestionnaire(q.definition)}</td>
                  <td>
                    <Badge tone={TONE[q.status]}>{q.status}</Badge>
                  </td>
                  <td>{q.reviewTag ? <ReviewTag tag={q.reviewTag} /> : <span className="muted">None</span>}</td>
                  <td>
                    <div className="stack stack-sm">
                      {q.enabled ? <Badge tone="done">Enabled</Badge> : <Badge>Disabled</Badge>}
                      <InlineAction action={setQuestionnaireEnabledAction} fields={{ id: q.id, enabled: q.enabled ? "0" : "1" }} variant="secondary">
                        {q.enabled ? "Disable" : "Enable"}
                        <span className="visually-hidden"> {q.key}</span>
                      </InlineAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack" aria-labelledby="rs-h">
        <h2 id="rs-h">Screening rulesets</h2>
        <div className={`tbl-wrap ${s.rel}`}>
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Review tag</th>
                <th scope="col">Created</th>
                <th scope="col">Published</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rulesets.map((r) => (
                <tr key={r.id} id={`rs-${r.id}`}>
                  <th scope="row">v{r.version}</th>
                  <td>
                    <Badge tone={TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td>{r.reviewTag ? <ReviewTag tag={r.reviewTag} /> : <span className="muted">None</span>}</td>
                  <td className="nowrap">
                    <DateTime value={r.createdAt} />
                  </td>
                  <td className="nowrap">
                    <DateTime value={r.publishedAt} />
                  </td>
                  <td>
                    {r.status === "draft" ? (
                      <ActionForm action={publishRulesetAction} className="stack stack-sm">
                        <input type="hidden" name="id" value={r.id} />
                        {r.reviewTag ? <Checkbox name="clearTag">Clinical review is complete: clear the review tag</Checkbox> : null}
                        <div>
                          <SubmitButton size="sm" pendingText="Publishing…">
                            Publish v{r.version}
                          </SubmitButton>
                        </div>
                        {isProduction && r.reviewTag ? <p className="fine">In production, publishing requires clearing the tag.</p> : null}
                      </ActionForm>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Published ruleset{published ? ` (v${published.version})` : ""}</h3>
        {published && parsed?.success ? (
          <RulesetView def={parsed.data} />
        ) : published ? (
          <Banner tone="alert">The published ruleset does not match the current schema.</Banner>
        ) : (
          <p className="muted">No published ruleset.</p>
        )}

        {drafts.map((d) => {
          const p = rulesetSchema.safeParse(d.definition);
          return (
            <details key={d.id} className={s.details}>
              <summary>View draft v{d.version}</summary>
              {p.success ? <RulesetView def={p.data} /> : <Banner tone="alert">This draft does not match the current schema.</Banner>}
            </details>
          );
        })}

        <details className={s.details}>
          <summary>Draft a new version from JSON</summary>
          <ActionForm action={draftRulesetAction} className="form form-wide">
            <TextArea
              name="definition"
              label="Ruleset JSON"
              rows={20}
              required
              defaultValue={starter}
              hint="Starts from the latest draft or the published version. Validated against the screening schema on save; new drafts are tagged CLINICAL_REVIEW_REQUIRED."
            />
            <div>
              <SubmitButton pendingText="Validating…">Save draft</SubmitButton>
            </div>
          </ActionForm>
        </details>
      </section>
    </>
  );
}
