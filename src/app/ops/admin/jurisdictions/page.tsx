import Link from "next/link";
import type { Metadata } from "next";
import { Badge, DateTime, PageHead, ReviewTag } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listJurisdictions } from "@/server/services/admin";
import { servableClinicianCounts } from "@/server/services/admin-queries";
import { YesNo } from "../_lib/ui";

export const metadata: Metadata = { title: "States" };

export default async function JurisdictionsPage() {
  const { actor } = await requireStaffSession(["admin", "compliance"]);
  const [rows, servable] = await run(actor, async (ctx) => [await listJurisdictions(ctx), await servableClinicianCounts(ctx)] as const);
  const active = rows.filter((r) => r.isActive).length;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHead
        eyebrow="Configuration"
        title="States"
        lede={
          <>
            {active} of {rows.length} jurisdictions are active. Every state starts inactive; activation requires the
            checklist on each state&rsquo;s page. State-specific rules are marked <ReviewTag tag="STATE_RULE_REQUIRED" /> until reviewed.
          </>
        }
      />
      <div className="tbl-wrap">
        <table className="t">
          <caption className="visually-hidden">Jurisdictions and their configuration</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Status</th>
              <th scope="col">Telehealth authorized</th>
              <th scope="col">Servable clinicians</th>
              <th scope="col">Active authorizations</th>
              <th scope="col">Last review</th>
              <th scope="col">Next review due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => {
              const overdue = j.nextReviewDueOn !== null && j.nextReviewDueOn < today;
              return (
                <tr key={j.code}>
                  <th scope="row">
                    <Link href={`/ops/admin/jurisdictions/${j.code}`}>
                      {j.name} <span className="tag">{j.code}</span>
                    </Link>
                  </th>
                  <td>{j.isActive ? <Badge tone="done">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td>
                    <YesNo value={j.telehealthAuthorized} />
                  </td>
                  <td className="num">{servable[j.code] ?? 0}</td>
                  <td className="num">{j.activeAuthorizations}</td>
                  <td>
                    <DateTime value={j.lastReviewOn} dateOnly />
                  </td>
                  <td>
                    <DateTime value={j.nextReviewDueOn} dateOnly />
                    {overdue ? (
                      <>
                        {" "}
                        <Badge tone="alert">Overdue</Badge>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fine">
        Servable clinicians counts clinicians who would pass the eligibility check today for at least one service if the state were active
        (active profile, current malpractice coverage, an active service authorization backed by a current license or compact privilege).
      </p>
    </>
  );
}
