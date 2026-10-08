import type { Metadata } from "next";
import Link from "next/link";
import { DateTime, Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { flagsFor, opsCases, OPS_FLAG_LABEL, type OpsFlag } from "@/server/services/ops";
import { shortPatientName } from "@/server/services/ops-queries";
import { getSetting } from "@/server/settings";
import { OPS_STAGE_LABEL } from "@/domain/cases/state-machine";
import { OPS_STAGES, type OpsStage } from "@/domain/constants";
import { age, FlagBadges, PriorityBadge, StatusBadge } from "./_ui";
import { NameFilter } from "./name-filter";

export const metadata: Metadata = { title: "Cases" };

const PAGE_SIZE = 50;
const SORTS = { activity: "Last activity", created: "Created", deadline: "Deadline", priority: "Priority" } as const;
type SortKey = keyof typeof SORTS;

type SP = Record<string, string | undefined>;

export default async function CasesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { actor } = await requireStaffSession();
  const includeClosed = sp.closed === "1";
  const { rows, thresholds, now } = await run(actor, async (ctx) => ({
    rows: await opsCases(ctx, { includeClosed }),
    thresholds: await getSetting(ctx.tx, "operations"),
    now: new Date().getTime(),
  }));
  const all = rows.map((r) => ({ ...r, flags: flagsFor(r, thresholds, now) }));

  const flagKeys = Object.keys(OPS_FLAG_LABEL) as OpsFlag[];
  const ref = (sp.ref ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const stage = OPS_STAGES.includes(sp.stage as OpsStage) ? (sp.stage as OpsStage) : "";
  const flag = flagKeys.includes(sp.flag as OpsFlag) ? (sp.flag as OpsFlag) : "";
  const state = /^[A-Z]{2}$/.test(sp.state ?? "") ? sp.state! : "";
  const clinician = sp.clinician ?? "";
  const priority = sp.priority === "urgent" || sp.priority === "normal" ? sp.priority : "";
  const sort: SortKey = sp.sort && sp.sort in SORTS ? (sp.sort as SortKey) : "activity";
  const dir = sp.dir === "asc" ? "asc" : "desc";

  let list = all.filter(
    (r) =>
      (!ref || r.reference.includes(ref)) &&
      (!stage || r.stage === stage) &&
      (!flag || r.flags.includes(flag)) &&
      (!state || r.jurisdictionCode === state) &&
      (!clinician || (clinician === "none" ? !r.clinicianId : r.clinicianId === clinician)) &&
      (!priority || r.priority === priority),
  );
  const val = (r: (typeof list)[number]): number => {
    switch (sort) {
      case "created":
        return r.createdAt.getTime();
      case "deadline":
        return r.deadline ? new Date(`${r.deadline}T00:00:00Z`).getTime() : dir === "asc" ? Number.MAX_SAFE_INTEGER : 0;
      case "priority":
        return (r.priority === "urgent" ? 1e15 : 0) + r.lastActivityAt.getTime() / 1000;
      default:
        return r.lastActivityAt.getTime();
    }
  };
  list = [...list].sort((a, b) => (dir === "asc" ? val(a) - val(b) : val(b) - val(a)));

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1), pages);
  const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const states = [...new Set(all.map((r) => r.jurisdictionCode).filter((x): x is string => !!x))].sort();
  const clinicians = [...new Map(all.filter((r) => r.clinicianId).map((r) => [r.clinicianId!, r.clinicianName ?? "Clinician"])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const qs = (patch: SP) => {
    const p = new URLSearchParams();
    const merged: SP = { ref, stage, flag, state, clinician, priority, closed: includeClosed ? "1" : "", sort, dir, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/ops/cases?${s}` : "/ops/cases";
  };

  return (
    <div className="stack stack-lg">
      <PageHead
        eyebrow="Operations"
        title="Cases"
        lede={flag ? `Queue: ${OPS_FLAG_LABEL[flag]}` : stage ? `Stage: ${OPS_STAGE_LABEL[stage]}` : "All open cases you can see."}
        actions={
          <Link href="/ops/board" className="btn btn-secondary btn-sm">
            Board view
          </Link>
        }
      />

      <form method="get" action="/ops/cases" className="card-flat stack" aria-label="Filter cases">
        <div className="filters">
          <div className="field">
            <label htmlFor="f-ref">Case reference</label>
            <input id="f-ref" name="ref" className="input" defaultValue={ref} placeholder="LB-…" autoComplete="off" />
          </div>
          <Select id="f-stage" name="stage" label="Stage" value={stage} options={OPS_STAGES.map((s) => [s, OPS_STAGE_LABEL[s]])} />
          <Select id="f-flag" name="flag" label="Queue" value={flag} options={flagKeys.map((f) => [f, OPS_FLAG_LABEL[f]])} />
          <Select id="f-state" name="state" label="State" value={state} options={states.map((s) => [s, s])} />
          <Select id="f-clin" name="clinician" label="Clinician" value={clinician} options={[["none", "Unassigned"], ...clinicians]} />
          <Select id="f-pri" name="priority" label="Priority" value={priority} options={[["urgent", "Urgent"], ["normal", "Normal"]]} />
          <Select id="f-sort" name="sort" label="Sort by" value={sort} options={Object.entries(SORTS)} blank={false} />
          <Select id="f-dir" name="dir" label="Order" value={dir} options={[["desc", "Newest / highest first"], ["asc", "Oldest / lowest first"]]} blank={false} />
        </div>
        <div className="row row-between">
          <label className="check" htmlFor="f-closed">
            <input id="f-closed" type="checkbox" name="closed" value="1" defaultChecked={includeClosed} />
            <span>Include closed and cancelled cases</span>
          </label>
          <div className="btn-row">
            <Link href="/ops/cases" className="btn btn-quiet btn-sm">
              Clear filters
            </Link>
            <button type="submit" className="btn btn-primary btn-sm">
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {pageRows.length ? (
        <>
          <NameFilter tableId="cases-table" total={pageRows.length} />
          <p className="muted small" aria-live="polite">
            {list.length} {list.length === 1 ? "case" : "cases"}
            {pages > 1 ? ` · page ${page} of ${pages}` : ""}
          </p>
          <div className="tbl-wrap" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
            <table className="t" id="cases-table">
              <caption className="visually-hidden">Cases matching the filters</caption>
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Patient</th>
                  <th scope="col">Status</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Service</th>
                  <th scope="col">State</th>
                  <th scope="col">Clinician</th>
                  <th scope="col">Flags</th>
                  <th scope="col">Age</th>
                  <th scope="col">Last activity</th>
                  <th scope="col">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} data-search={`${r.patientName} ${r.reference}`.toLowerCase()}>
                    <td className="nowrap">
                      <Link href={`/ops/cases/${r.id}`} className="mono">
                        {r.reference}
                      </Link>{" "}
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="nowrap">{shortPatientName(r.patientName)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="nowrap">{r.stage ? OPS_STAGE_LABEL[r.stage] : "—"}</td>
                    <td style={{ minWidth: 160 }}>{r.serviceName ?? "—"}</td>
                    <td>{r.jurisdictionCode ?? "—"}</td>
                    <td className="nowrap">{r.clinicianName ?? <span className="muted">Unassigned</span>}</td>
                    <td style={{ minWidth: 260 }}>
                      <FlagBadges flags={r.flags} max={3} />
                    </td>
                    <td className="nowrap">{age(r.submittedAt ?? r.createdAt, now)}</td>
                    <td className="nowrap">
                      <DateTime value={r.lastActivityAt} />
                    </td>
                    <td className="nowrap">{r.deadline ? <time dateTime={r.deadline}>{r.deadline}</time> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav aria-label="Pagination" className="row">
              {page > 1 ? (
                <Link className="chip-link" href={qs({ page: String(page - 1) })}>
                  Previous
                </Link>
              ) : null}
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} className="chip-link" href={qs({ page: String(n) })} aria-current={n === page ? "true" : undefined}>
                  <span className="visually-hidden">Page </span>
                  {n}
                </Link>
              ))}
              {page < pages ? (
                <Link className="chip-link" href={qs({ page: String(page + 1) })}>
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <Empty title="No cases match these filters">Try clearing a filter or including closed cases.</Empty>
      )}
    </div>
  );
}

function Select({ id, name, label, value, options, blank = true }: { id: string; name: string; label: string; value: string; options: (readonly [string, string])[]; blank?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} className="select" defaultValue={value}>
        {blank ? <option value="">Any</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
