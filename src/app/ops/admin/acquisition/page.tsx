import Link from "next/link";
import type { Metadata } from "next";
import { Banner, Empty, Money, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { GROUP_BY, acquisitionFunnel, inquiriesByChannel, rate, suppress, unservedDemand, type FunnelRow, type GroupBy } from "@/server/services/acquisition";

export const metadata: Metadata = { title: "Acquisition" };

const GROUP_LABEL: Record<GroupBy, string> = {
  channel: "Channel",
  source: "Source / medium",
  campaign: "Campaign",
  landing: "Landing page",
  entry: "Call to action",
  term: "Paid keyword (utm_term)",
};
const RANGES = [7, 30, 90, 365] as const;

type SP = Promise<{ by?: string; days?: string; touch?: string }>;

export default async function AcquisitionPage({ searchParams }: { searchParams: SP }) {
  const { actor } = await requireStaffSession(["admin"]);
  const sp = await searchParams;
  const by: GroupBy = (GROUP_BY as readonly string[]).includes(sp.by ?? "") ? (sp.by as GroupBy) : "channel";
  const days = RANGES.find((d) => String(d) === sp.days) ?? 30;
  const touch = sp.touch === "first" ? "first" : "last";
  const { funnel, unserved, inquiries } = await run(actor, async (ctx) => ({
    funnel: await acquisitionFunnel(ctx, { days, by, touch }),
    unserved: await unservedDemand(ctx, days),
    inquiries: await inquiriesByChannel(ctx, days),
  }));
  const href = (p: Partial<{ by: string; days: number; touch: string }>) => {
    const q = new URLSearchParams({ by: p.by ?? by, days: String(p.days ?? days), touch: p.touch ?? touch });
    return `/ops/admin/acquisition?${q}`;
  };

  return (
    <div className="stack stack-lg">
      <PageHead
        eyebrow="Configuration"
        title="Acquisition"
        lede="Where people come from and how far they get, from first-party data only. No names, case details or clinical outcomes; emergency screenings are excluded; small counts show as <5."
      />
      <Banner tone="info" icon="info">
        Search terms for organic visits are not visible here (search engines withhold them). Use Google Search Console and Bing Webmaster Tools for those; this page
        shows paid keywords only when ads pass <code>utm_term</code>. See docs/MEASUREMENT.md.
      </Banner>

      <nav aria-label="Report options" className="stack stack-sm">
        <div className="filters">
          <span className="small muted">Group by</span>
          {GROUP_BY.map((g) => (
            <Link key={g} href={href({ by: g })} className="chip-link" aria-current={g === by ? "true" : undefined}>
              {GROUP_LABEL[g]}
            </Link>
          ))}
        </div>
        <div className="filters">
          <span className="small muted">Period</span>
          {RANGES.map((d) => (
            <Link key={d} href={href({ days: d })} className="chip-link" aria-current={d === days ? "true" : undefined}>
              {d} days
            </Link>
          ))}
          <span className="small muted">Credit</span>
          {(["last", "first"] as const).map((t) => (
            <Link key={t} href={href({ touch: t })} className="chip-link" aria-current={t === touch ? "true" : undefined}>
              {t === "last" ? "Last touch" : "First touch"}
            </Link>
          ))}
        </div>
      </nav>

      <section className="stack" aria-labelledby="funnel-h">
        <h2 id="funnel-h">Funnel by {GROUP_LABEL[by].toLowerCase()}</h2>
        {funnel.total.started === 0 ? (
          <Empty title="No screenings in this period" />
        ) : (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Funnel table, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">{GROUP_LABEL[by]}</th>
                  <th scope="col">Screenings started</th>
                  <th scope="col">Completed</th>
                  <th scope="col">Could continue</th>
                  <th scope="col">Not in a served state / not a fit</th>
                  <th scope="col">Accounts</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Start → paid</th>
                  <th scope="col">Delivered</th>
                  <th scope="col">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...funnel.rows, funnel.total].map((r: FunnelRow) => (
                  <tr key={r.key} className={r === funnel.total ? "strong" : undefined}>
                    <th scope="row">{r.key}</th>
                    <td>{suppress(r.started)}</td>
                    <td>{suppress(r.completed)}</td>
                    <td>{suppress(r.canContinue)}</td>
                    <td>{suppress(r.notAvailable)}</td>
                    <td>{suppress(r.accounts)}</td>
                    <td>{suppress(r.paid)}</td>
                    <td>{rate(r.paid, r.started)}</td>
                    <td>{suppress(r.delivered)}</td>
                    <td>{r.paid >= 5 ? <Money cents={r.revenueCents} /> : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stack" aria-labelledby="unserved-h">
        <h2 id="unserved-h">Demand from states we don&rsquo;t serve yet</h2>
        <p className="muted small">Completed screenings that stopped because the person is in an inactive state. Use this with the waitlist when choosing the next state to license.</p>
        {unserved.length === 0 ? (
          <Empty title="None in this period" />
        ) : (
          <ul className="list-rows">
            {unserved.map((u) => (
              <li key={u.state ?? "?"} className="row row-between">
                <span>{u.state}</span>
                <span>{suppress(Number(u.n))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="inq-h">
        <h2 id="inq-h">Inquiries by topic and channel</h2>
        {inquiries.length === 0 ? (
          <Empty title="No inquiries in this period" />
        ) : (
          <ul className="list-rows">
            {inquiries.map((q) => (
              <li key={q.key} className="row row-between">
                <span>{q.key}</span>
                <span>{suppress(q.n)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
