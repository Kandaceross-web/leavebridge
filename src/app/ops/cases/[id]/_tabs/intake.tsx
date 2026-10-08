import { Badge, Banner, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { getIntake } from "@/server/services/intake";
import type { IntakeQuestion } from "@/config/intake";
import { LimitedPanel, tryClinical, type TabProps } from "../_shared";

function answerText(q: IntakeQuestion, v: string | string[] | undefined): string {
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return "";
  const label = (x: string) => q.options?.find((o) => o.value === x)?.label ?? x;
  return Array.isArray(v) ? v.map(label).join(", ") : label(v);
}

export async function IntakeTab(props: TabProps) {
  if (props.ws.access !== "clinical") return <LimitedPanel {...props} />;
  const intake = await tryClinical(run(props.actor, (ctx) => getIntake(ctx, props.ws.row.id, "clinical")));
  if (!intake) return <LimitedPanel {...props} />;
  const safetyHits = intake.template.def.sections.flatMap((s) => s.questions).filter((q) => q.safetyValue && intake.answers[q.key] === q.safetyValue);
  return (
    <div className="stack stack-lg">
      <p className="muted small">
        Intake template v{intake.template.version} · {intake.status === "submitted" ? <>submitted <DateTime value={intake.submittedAt} /></> : "in progress"} · {intake.completed.length} of {intake.template.def.sections.length} sections complete
      </p>
      {safetyHits.length ? (
        <Banner tone="alert" icon="alert">
          <b>Safety responses in this intake:</b> {safetyHits.map((q) => q.label).join(" · ")}. See Safety follow-up for open events.
        </Banner>
      ) : null}
      {intake.template.def.sections.map((s) => {
        const qs = s.questions.filter((q) => !q.showIf || intake.answers[q.showIf.q] === q.showIf.eq);
        return (
          <section key={s.key} className="card stack" aria-labelledby={`in-${s.key}`}>
            <div className="card-head">
              <h2 id={`in-${s.key}`}>{s.title}</h2>
              {intake.completed.includes(s.key) ? <Badge tone="progress">Complete</Badge> : <Badge tone="action">Incomplete</Badge>}
            </div>
            {qs.length ? (
              <dl className="stack">
                {qs.map((q) => {
                  const text = answerText(q, intake.answers[q.key]);
                  const hit = Boolean(q.safetyValue) && intake.answers[q.key] === q.safetyValue;
                  return (
                    <div key={q.key} className={hit ? "banner banner-alert" : undefined} style={hit ? { display: "grid" } : undefined}>
                      <dt className="small muted">
                        {q.label}
                        {q.safetyValue ? <span className="visually-hidden"> (safety question)</span> : null}
                      </dt>
                      <dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {text || <span className="muted">No answer</span>}
                        {hit ? (
                          <>
                            {" "}
                            <Badge tone="alert">Safety response</Badge>
                          </>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <Empty title="No questions shown for this section" />
            )}
          </section>
        );
      })}
    </div>
  );
}
