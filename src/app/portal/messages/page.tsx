import Link from "next/link";
import type { Metadata } from "next";
import { Banner, DateTime, Empty, PageHead } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { patientCases } from "@/server/services/cases";
import { caseThreads, unreadCount } from "@/server/services/messaging";
import { myPatientProfile } from "@/server/services/portal-queries";

export const metadata: Metadata = { title: "Messages" };

const LABEL = { administrative: "Care team", clinical: "Your clinician" } as const;

export default async function MessagesPage() {
  const { actor } = await requirePatientSession();
  const data = await run(actor, async (ctx) => {
    const profile = await myPatientProfile(ctx);
    const list = await patientCases(ctx);
    const rows = [];
    for (const { c } of list) {
      const { threads, canClinical } = await caseThreads(ctx, c.id);
      rows.push({ c, threads, canClinical, unread: await unreadCount(ctx, [c.id]) });
    }
    return { profile, rows };
  });

  return (
    <div className="stack stack-lg" style={{ maxWidth: 860 }}>
      <PageHead title="Messages" lede="Secure conversations with your care team and clinician, organized by request." />
      <Banner tone="warn" icon="alert">
        <b>Messages are not monitored in real time and are not for emergencies.</b> If you are in crisis, call or text <a href="tel:988">988</a> or call <a href="tel:911">911</a>.
      </Banner>
      {!data.rows.length ? (
        <Empty title="No conversations yet">
          Messages appear here once you start a request. <Link href="/start">Check if we can help</Link>
        </Empty>
      ) : (
        data.rows.map(({ c, threads, canClinical, unread }) => (
          <section key={c.id} className="card-flat stack stack-sm" aria-labelledby={`case-${c.id}`}>
            <div className="row row-between">
              <h2 id={`case-${c.id}`} style={{ fontSize: 20 }}>
                Case {c.reference}
              </h2>
              {unread ? <span className="badge b-action">{unread} unread</span> : null}
            </div>
            <ul className="list-rows">
              {(["administrative", "clinical"] as const)
                .filter((cat) => cat === "administrative" || canClinical)
                .map((cat) => {
                  const t = threads.find((x) => x.category === cat);
                  return (
                    <li key={cat}>
                      <div className="grow">
                        <b>{LABEL[cat]}</b>
                        <p className="small muted">
                          {t?.lastMessageAt ? (
                            <>
                              Last message <DateTime value={t.lastMessageAt} timeZone={data.profile.timeZone} />
                            </>
                          ) : (
                            "No messages yet"
                          )}
                        </p>
                      </div>
                      <Link href={`/portal/cases/${c.id}/messages${cat === "clinical" ? "?thread=clinical" : ""}`}>Open</Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
