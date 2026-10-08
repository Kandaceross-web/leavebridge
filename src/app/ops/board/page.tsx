import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { opsOverview } from "@/server/services/ops";
import { shortPatientName } from "@/server/services/ops-queries";
import { OPS_STAGE_LABEL } from "@/domain/cases/state-machine";
import { OPS_STAGES } from "@/domain/constants";
import { FlagBadges, PriorityBadge, StatusBadge } from "../cases/_ui";

export const metadata: Metadata = { title: "Case board" };

export default async function BoardPage() {
  const { actor } = await requireStaffSession();
  const { rows } = await run(actor, (ctx) => opsOverview(ctx));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="stack stack-lg">
      <PageHead
        eyebrow="Operations"
        title="Case board"
        lede="Open cases by stage. Urgent cases are listed first and marked with a red edge."
        actions={
          <Link href="/ops/cases" className="btn btn-secondary btn-sm">
            Table view
          </Link>
        }
      />
      <div className="board">
        {OPS_STAGES.map((stage) => {
          const items = rows.filter((r) => r.stage === stage);
          return (
            <section key={stage} className="board-col" aria-labelledby={`col-${stage}`}>
              <h2 id={`col-${stage}`}>
                <span>{OPS_STAGE_LABEL[stage]}</span>
                <span className="count" aria-label={`${items.length} cases`}>
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? <p className="muted small">No cases.</p> : null}
              {items.slice(0, 60).map((r) => (
                <Link key={r.id} href={`/ops/cases/${r.id}`} className={`board-card${r.priority === "urgent" ? " urgent" : ""}`}>
                  <span className="row row-between">
                    <b className="mono">{r.reference}</b>
                    <PriorityBadge priority={r.priority} />
                  </span>
                  <span>{shortPatientName(r.patientName)}</span>
                  <span className="muted small">
                    {r.serviceName ?? "No service yet"} · {r.jurisdictionCode ?? "—"}
                  </span>
                  <span className="small">{r.clinicianName ?? <span className="muted">Unassigned</span>}</span>
                  <StatusBadge status={r.status} />
                  {r.deadline ? (
                    <span className={`small${r.deadline <= today ? "" : " muted"}`}>
                      Deadline <time dateTime={r.deadline}>{r.deadline}</time>
                    </span>
                  ) : null}
                  {r.flags.length ? <FlagBadges flags={r.flags} max={4} /> : null}
                </Link>
              ))}
              {items.length > 60 ? (
                <Link href={`/ops/cases?stage=${stage}`} className="small">
                  See all {items.length}
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
