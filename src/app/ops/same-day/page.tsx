import Link from "next/link";
import type { Metadata } from "next";
import { Badge, DateTime, Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { ISSUED_KIND_LABEL } from "@/server/services/issued-documents";
import { sameDayQueues, sameDayReport } from "@/server/services/same-day";
import { SAME_DAY_SERVICE_NAME } from "@/config/same-day";

export const metadata: Metadata = { title: "Same-day screenings" };

const COUNTS: { key: keyof Awaited<ReturnType<typeof sameDayReport>>; label: string }[] = [
  { key: "started", label: "Started" },
  { key: "purchased", label: "Purchased" },
  { key: "completed", label: "Records issued" },
  { key: "held_now", label: "Held for review now" },
  { key: "held_total", label: "Ever held" },
  { key: "closed_without_issue", label: "Closed without a record" },
  { key: "refund_flags", label: "Refund decisions pending" },
  { key: "letters_requested", label: "Letters requested" },
  { key: "letters_pending", label: "Letters waiting" },
  { key: "letters_approved", label: "Letters issued" },
  { key: "letters_declined", label: "Letters declined" },
  { key: "revoked", label: "Documents revoked" },
];

export default async function SameDayOpsPage() {
  const { actor } = await requireStaffSession();
  const { report, q } = await run(actor, async (ctx) => ({ report: await sameDayReport(ctx), q: await sameDayQueues(ctx) }));

  return (
    <div className="stack stack-lg">
      <PageHead eyebrow="Operations" title="Same-day screenings" lede={`${SAME_DAY_SERVICE_NAME}: what needs a person, and running totals. Counts only; no health details.`} />

      <section aria-labelledby="counts-h" className="stack stack-sm">
        <h2 id="counts-h">Totals</h2>
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Same-day screening totals">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {COUNTS.map((c) => (
                <tr key={c.key}>
                  <th scope="row">{c.label}</th>
                  <td className="num">{report[c.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="held-h" className="stack stack-sm">
        <h2 id="held-h">Held for clinician review</h2>
        {q.held.length ? (
          <ul className="list-rows">
            {q.held.map((h) => (
              <li key={h.caseId}>
                <div className="grow stack stack-sm">
                  <Link href={`/ops/same-day/${h.caseId}`}>
                    <b className="mono">{h.reference}</b>
                  </Link>
                  <span className="small muted">
                    {h.jurisdiction ?? "—"} · finished {h.completedAt ? <DateTime value={h.completedAt} /> : "—"}
                    {h.holdLabels.length ? ` · ${h.holdLabels.join("; ")}` : ""}
                  </span>
                </div>
                <Badge tone="alert">Held</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing held" />
        )}
      </section>

      <section aria-labelledby="letters-h" className="stack stack-sm">
        <h2 id="letters-h">Work excuse letter requests</h2>
        {q.letters.length ? (
          <ul className="list-rows">
            {q.letters.map((l) => (
              <li key={l.id}>
                <div className="grow stack stack-sm">
                  <Link href={`/ops/same-day/letters/${l.id}`}>
                    <b className="mono">{l.reference}</b>
                  </Link>
                  <span className="small muted">
                    Requested <DateTime value={l.createdAt} />
                  </span>
                </div>
                <Badge tone={l.assigned ? "progress" : "action"}>{l.assigned ? "Assigned" : "Unassigned"}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No letter requests waiting" />
        )}
      </section>

      <section aria-labelledby="rev-h" className="stack stack-sm">
        <h2 id="rev-h">Screening answers to review before payment</h2>
        {q.reviews.length ? (
          <ul className="list-rows">
            {q.reviews.map((r) => (
              <li key={r.caseId}>
                <Link href={`/ops/cases/${r.caseId}`} className="grow">
                  <b className="mono">{r.reference}</b>
                </Link>
                <span className="small muted">
                  Started <DateTime value={r.createdAt} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="None waiting" />
        )}
      </section>

      <section aria-labelledby="refund-h" className="stack stack-sm">
        <h2 id="refund-h">Refund decisions for held screenings</h2>
        <p className="small muted">A held screening is not refunded automatically. Decide in Payments &amp; refunds, then mark it decided on the screening.</p>
        {q.refunds.length ? (
          <ul className="list-rows">
            {q.refunds.map((r) => (
              <li key={r.caseId}>
                <Link href={`/ops/same-day/${r.caseId}`} className="grow">
                  <b className="mono">{r.reference}</b>
                </Link>
                <Badge tone="action">Decision needed</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No refund decisions pending" />
        )}
      </section>

      <section aria-labelledby="docs-h" className="stack stack-sm">
        <h2 id="docs-h">Recently issued documents</h2>
        {q.docs.length ? (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Recently issued documents">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Document number</th>
                  <th scope="col">Type</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Status</th>
                  <th scope="col">Screening</th>
                </tr>
              </thead>
              <tbody>
                {q.docs.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.publicId}</td>
                    <td>{ISSUED_KIND_LABEL[d.kind]}</td>
                    <td>
                      <DateTime value={d.issuedAt} />
                    </td>
                    <td>{d.status === "valid" ? <Badge tone="done">Valid</Badge> : <Badge tone="alert">Revoked</Badge>}</td>
                    <td>
                      <Link href={`/ops/same-day/${d.caseId}`}>{d.reference}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nothing issued yet" />
        )}
      </section>
    </div>
  );
}
