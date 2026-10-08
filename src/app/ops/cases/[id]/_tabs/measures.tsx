import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Banner, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { caseMeasures } from "@/server/services/ops-queries";
import { hasRole } from "@/domain/policy";
import { reviewMeasureAction } from "../actions";
import { LimitedPanel, tryClinical, type TabProps } from "../_shared";

export async function MeasuresTab(props: TabProps) {
  const { ws, actor } = props;
  if (ws.access !== "clinical") return <LimitedPanel {...props} />;
  const measures = await tryClinical(run(actor, (ctx) => caseMeasures(ctx, ws.row.id)));
  if (!measures) return <LimitedPanel {...props} />;
  const canReview = hasRole(actor, ["clinician", "clinical_director"]);
  return (
    <div className="stack stack-lg">
      <Banner tone="info" icon="info">
        Scores are context for your clinical judgment only. They are scored by each instrument&rsquo;s published rules and do not make or suggest a determination.
      </Banner>
      {measures.length === 0 ? <Empty title="No questionnaires completed">The patient has not completed any validated measures.</Empty> : null}
      {measures.map((m) => (
        <section key={m.id} className="card stack" aria-labelledby={`m-${m.id}`}>
          <div className="card-head">
            <div className="stack stack-sm">
              <h2 id={`m-${m.id}`}>{m.instrument?.name ?? m.instrumentKey}</h2>
              <span className="muted small">
                Completed <DateTime value={m.completedAt} />
              </span>
            </div>
            <div className="row">
              <span>
                Total <b className="mono">{m.totalScore}</b>
              </span>
              <Badge tone="neutral">{m.severityBand}</Badge>
              {m.safetyFlag ? <Badge tone="alert">Safety item endorsed</Badge> : null}
            </div>
          </div>
          {m.instrument ? (
            <>
              <p className="small muted">{m.instrument.instructions}</p>
              <div className="tbl-wrap" style={{ position: "relative" }}>
                <table className="t">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Item</th>
                      <th scope="col">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.instrument.items.map((it, i) => {
                      const v = m.answers[it.key];
                      const safety = m.instrument!.safetyItems.find((s) => s.item === it.key);
                      const hit = safety && typeof v === "number" && v >= safety.minValue;
                      return (
                        <tr key={it.key}>
                          <td className="num">{i + 1}</td>
                          <td>
                            {it.text}
                            {hit ? (
                              <>
                                {" "}
                                <Badge tone="alert">Safety item</Badge>
                              </>
                            ) : null}
                          </td>
                          <td className="nowrap">
                            {typeof v === "number" ? `${m.instrument!.options.find((o) => o.value === v)?.label ?? ""} (${v})` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="fine">{m.instrument.attribution}</p>
            </>
          ) : null}
          <div className="row row-between">
            <span className="small">{m.reviewedAt ? <>Reviewed <DateTime value={m.reviewedAt} /></> : <Badge tone="action">Not yet reviewed</Badge>}</span>
            {!m.reviewedAt && canReview ? (
              <ActionForm action={reviewMeasureAction.bind(null, ws.row.id, m.id)} className="">
                <SubmitButton variant="secondary" size="sm">
                  Mark reviewed
                </SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
