import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, DateTime, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { searchAudit } from "@/server/services/admin";
import { caseIdForReference, caseReferences } from "@/server/services/admin-queries";
import s from "../admin/_lib/admin.module.css";
import { verifyChainAction } from "./actions";

export const metadata: Metadata = { title: "Audit log" };

const LIMITS = [50, 100, 200, 500];

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 200) ?? "";
  };
  const ref = one("ref");
  const action = one("action");
  const actorEmail = one("actor");
  const limit = LIMITS.includes(Number(one("limit"))) ? Number(one("limit")) : 100;
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const { rows, refs, refNotFound } = await run(actor, async (ctx) => {
    const caseId = ref ? await caseIdForReference(ctx, ref) : null;
    if (ref && !caseId) return { rows: [], refs: {}, refNotFound: true };
    const rows = await searchAudit(ctx, { caseId: caseId ?? undefined, action: action || undefined, actorEmail: actorEmail || undefined, limit });
    return { rows, refs: await caseReferences(ctx, rows.map((r) => r.e.caseId)), refNotFound: false };
  });
  const filtered = Boolean(ref || action || actorEmail);
  return (
    <>
      <PageHead
        eyebrow="Oversight"
        title="Audit log"
        lede="Append-only and hash-chained. Entries hold references and short codes only, never clinical content."
      />
      <section className="card stack" aria-labelledby="f-h">
        <h2 id="f-h" className="visually-hidden">
          Filters
        </h2>
        <form method="get" className="filters" role="search" aria-label="Filter audit events">
          <div className="field">
            <label htmlFor="f-ref">Case reference</label>
            <input id="f-ref" name="ref" className="input" defaultValue={ref} placeholder="LB-XXXXXX" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="f-action">Action starts with</label>
            <input id="f-action" name="action" className="input" defaultValue={action} placeholder="config." autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="f-actor">Staff email</label>
            <input id="f-actor" name="actor" type="email" className="input" defaultValue={actorEmail} autoComplete="off" />
          </div>
          <div className="field" style={{ flex: "0 1 120px", minWidth: 110 }}>
            <label htmlFor="f-limit">Show</label>
            <select id="f-limit" name="limit" className="select" defaultValue={String(limit)}>
              {LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            {filtered ? (
              <Link href="/ops/audit" className="btn btn-quiet">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="card stack" aria-labelledby="chain-h">
        <h2 id="chain-h">Chain verification</h2>
        <p className="small muted">Recomputes every row&rsquo;s hash from the start of the log. Read-only.</p>
        <ActionForm action={verifyChainAction} className="stack stack-sm">
          <div>
            <SubmitButton variant="secondary" pendingText="Verifying…">
              Verify audit chain
            </SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="stack" aria-labelledby="r-h">
        <h2 id="r-h">
          Events <span className="muted small">({rows.length}{rows.length === limit ? `, newest ${limit}` : ""})</span>
        </h2>
        {refNotFound ? (
          <p className="muted">No case has that reference.</p>
        ) : rows.length ? (
          <div className="tbl-wrap">
            <table className="t">
              <caption className="visually-hidden">Audit events, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Time</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Role</th>
                  <th scope="col">Action</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Case</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, email }) => {
                  const meta = e.metadata && typeof e.metadata === "object" && Object.keys(e.metadata).length ? JSON.stringify(e.metadata) : "";
                  return (
                    <tr key={e.id}>
                      <td className="num">{e.id}</td>
                      <td className="nowrap small">
                        <DateTime value={e.occurredAt} />
                      </td>
                      <td className="small break">{email ?? (e.actorUserId ? "Unknown user" : "System")}</td>
                      <td className="small">{e.actorRole ?? "—"}</td>
                      <td>
                        <span className="tag">{e.action}</span>
                        {e.accessGrantId ? (
                          <>
                            {" "}
                            <Badge tone="alert">Break-glass</Badge>
                          </>
                        ) : null}
                      </td>
                      <td className="small">
                        {e.subjectType ? (
                          <>
                            {e.subjectType}
                            {e.subjectId ? <div className={s.meta}>{e.subjectId}</div> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="mono small nowrap">{e.caseId ? (refs[e.caseId] ?? "—") : "—"}</td>
                      <td>{e.outcome === "denied" ? <Badge tone="alert">Denied</Badge> : <span className="small">Allowed</span>}</td>
                      <td>{meta ? <code className={s.meta}>{meta}</code> : <span className="muted">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No events match these filters.</p>
        )}
      </section>
    </>
  );
}
