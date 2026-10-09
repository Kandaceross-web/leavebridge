import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton } from "@/components/forms";
import { Badge, DateTime, Empty, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { suppress } from "@/server/services/acquisition";
import { WAITLIST_ROLES, waitlistDemand } from "@/server/services/waitlist";
import { notifyWaitlistAction } from "./actions";

export const metadata: Metadata = { title: "Waitlist" };

const RANGES = [30, 90, 365] as const;

type SP = Promise<{ days?: string }>;

const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

export default async function WaitlistPage({ searchParams }: { searchParams: SP }) {
  const { actor } = await requireStaffSession(WAITLIST_ROLES);
  const sp = await searchParams;
  const days = RANGES.find((d) => String(d) === sp.days) ?? 90;
  const rows = await run(actor, (ctx) => waitlistDemand(ctx, days));
  const ready = rows.filter((r) => r.isActive && r.waiting > 0);

  return (
    <div className="stack stack-lg">
      <PageHead
        eyebrow="Configuration"
        title="Waitlist"
        lede="Where people are asking for care, to help choose the next state to get licensed in. Counts only: email addresses are never shown, and each one is deleted after its single “we now serve your state” email."
      />

      <nav aria-label="Report options" className="filters">
        <span className="small muted">Period</span>
        {RANGES.map((d) => (
          <Link key={d} href={`/ops/admin/waitlist?days=${d}`} className="chip-link" aria-current={d === days ? "true" : undefined}>
            {d} days
          </Link>
        ))}
      </nav>

      <section className="stack" aria-labelledby="demand-h">
        <h2 id="demand-h">Demand by state</h2>
        <p className="muted small">
          Sorted by waitlist sign-ups plus screenings that stopped because the state isn&rsquo;t served, both in the last {days} days. Screening counts under 5 show as
          &ldquo;&lt;5&rdquo;, as on the Acquisition page.
        </p>
        {rows.length === 0 ? (
          <Empty title="No waitlist sign-ups or unserved screenings yet" />
        ) : (
          <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Demand by state, scrolls sideways on small screens">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">State</th>
                  <th scope="col">Served now</th>
                  <th scope="col">Waitlist sign-ups</th>
                  <th scope="col">Unserved screenings</th>
                  <th scope="col">Waiting for an email</th>
                  <th scope="col">Last notified</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <th scope="row">{r.name}</th>
                    <td>{r.isActive ? <Badge tone="done">Served</Badge> : <Badge>Not yet</Badge>}</td>
                    <td>{r.joined}</td>
                    <td>{suppress(r.screenings)}</td>
                    <td>{r.waiting}</td>
                    <td>
                      {r.lastNotice ? (
                        <>
                          Notified {r.lastNotice.count} on <DateTime value={r.lastNotice.sentAt} dateOnly />
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="stack" aria-labelledby="notify-h">
        <h2 id="notify-h">Tell people we now serve their state</h2>
        <p className="muted small">
          Each person gets one email: &ldquo;LeaveBridge Health is now available in &lt;state&gt;&rdquo;, with a link to start screening and a note that it is the only email
          about it. Their address is then deleted. Only the state and the number of people are recorded in the audit log.
        </p>
        {ready.length === 0 ? (
          <Empty title="No served state has anyone waiting">When a state with waitlist sign-ups is activated, it appears here.</Empty>
        ) : (
          <ul className="list-plain stack">
            {ready.map((r) => (
              <li key={r.code} className="card-flat stack stack-sm">
                <h3>{r.name}</h3>
                <ActionForm action={notifyWaitlistAction.bind(null, r.code)}>
                  <Checkbox name="confirm" required>
                    Send one email to each of the {people(r.waiting)} waiting for {r.name}, then delete their addresses. This cannot be undone.
                  </Checkbox>
                  <div>
                    <SubmitButton variant="primary" pendingText="Sending…">
                      Email {people(r.waiting)} that we now serve {r.name}
                    </SubmitButton>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
