import { Badge, DateTime, Empty } from "@/components/ui";
import { run } from "@/server/auth/guards";
import { caseAuditTrail } from "@/server/services/ops-queries";
import type { TabProps } from "../_shared";

export async function AuditTab({ ws, actor }: TabProps) {
  const rows = await run(actor, (ctx) => caseAuditTrail(ctx, ws.row.id));
  if (!rows.length) return <Empty title="No audit events for this case" />;
  return (
    <div className="stack">
      <p className="muted small">The most recent 300 events. The audit log records references only, never clinical content.</p>
      <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
        <table className="t">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">
                  <DateTime value={r.occurredAt} />
                </td>
                <td className="break">{r.actor}</td>
                <td className="mono small">{r.action}</td>
                <td>{r.outcome === "denied" ? <Badge tone="alert">Denied</Badge> : "Allowed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
