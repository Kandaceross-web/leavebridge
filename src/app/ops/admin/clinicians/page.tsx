import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Banner, ButtonLink, DateTime, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { expiringCredentials, listClinicians } from "@/server/services/admin";
import { clinicianSummaries } from "@/server/services/admin-queries";
import { hasRole } from "@/domain/policy";

export const metadata: Metadata = { title: "Clinicians & licenses" };

const STATUS_TONE = { active: "done", onboarding: "progress", inactive: "neutral" } as const;

export default async function CliniciansPage() {
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canEdit = hasRole(actor, ["admin"]);
  const { rows, summary, expiring } = await run(actor, async (ctx) => ({
    rows: await listClinicians(ctx),
    summary: await clinicianSummaries(ctx),
    expiring: await expiringCredentials(ctx, 90),
  }));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="Clinicians & licenses"
        lede="Licenses, compact privileges and service authorizations are recorded only after manual verification. Nothing renews automatically."
        actions={canEdit ? <ButtonLink href="/ops/admin/clinicians/new">Add clinician</ButtonLink> : null}
      />
      {expiring.length ? (
        <section aria-label="Expiring credentials">
          <Banner tone="warn" icon="clock">
            <p>
              <b>
                {expiring.length} credential{expiring.length === 1 ? "" : "s"} expired or expiring within 90 days
              </b>
            </p>
            <ul className="list-plain small">
              {expiring.map((e, i) => (
                <li key={i}>
                  <b>{e.kind}</b> · {e.who} · {e.detail} · {e.expiresOn < today ? "expired " : "expires "}
                  <DateTime value={e.expiresOn} dateOnly />
                </li>
              ))}
            </ul>
          </Banner>
        </section>
      ) : null}
      {rows.length ? (
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table className="t">
            <caption className="visually-hidden">Clinicians</caption>
            <thead>
              <tr>
                <th scope="col">Clinician</th>
                <th scope="col">Status</th>
                <th scope="col">Credentials</th>
                <th scope="col">Active licenses</th>
                <th scope="col">Active privileges</th>
                <th scope="col">States authorized</th>
                <th scope="col">Malpractice expires</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, email }) => {
                const s = summary[c.id];
                return (
                  <tr key={c.id}>
                    <th scope="row">
                      <Link href={`/ops/admin/clinicians/${c.id}`}>{c.displayName}</Link>
                      <div className="fine break">{email}</div>
                    </th>
                    <td>
                      <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    </td>
                    <td>{c.credentials}</td>
                    <td className="num">{s?.licenses ?? 0}</td>
                    <td className="num">{s?.privileges ?? 0}</td>
                    <td>{s?.states.length ? s.states.map((st) => <span key={st} className="tag" style={{ marginRight: 4 }}>{st}</span>) : <span className="muted">None</span>}</td>
                    <td className="nowrap">
                      <DateTime value={c.malpracticeExpiresOn} dateOnly />
                      {!c.malpracticeExpiresOn || c.malpracticeExpiresOn < today ? (
                        <>
                          {" "}
                          <Badge tone="alert">Missing or expired</Badge>
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No clinicians yet.</p>
      )}
      <p className="fine">
        Authorization to provide a service in a state is never inferred from a license. Eligibility (the canServe check) is evaluated at
        assignment, scheduling, session join and signing.
      </p>
    </>
  );
}
