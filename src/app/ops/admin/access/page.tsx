import Link from "next/link";
import type { Metadata } from "next";
import { Badge, DateTime, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { listAccessGrants } from "@/server/services/admin";
import { getSetting } from "@/server/settings";
import { caseReferences } from "@/server/services/admin-queries";
import { hasRole } from "@/domain/policy";
import { InlineAction } from "../_lib/ui";
import { approveGrantAction, revokeGrantAction } from "./actions";

export const metadata: Metadata = { title: "Access grants" };

export default async function AccessGrantsPage() {
  const { actor } = await requireStaffSession(["admin", "compliance", "clinical_director"]);
  const canApprove = hasRole(actor, ["admin", "clinical_director"]);
  const { rows, refs, allowSelf } = await run(actor, async (ctx) => {
    const rows = await listAccessGrants(ctx);
    const allowSelf = (await getSetting(ctx.tx, "security")).allowSelfApprovedAccess;
    return { rows, refs: await caseReferences(ctx, rows.map((r) => r.g.caseId)), allowSelf };
  });
  const now = new Date().getTime();
  return (
    <>
      <PageHead
        eyebrow="Oversight"
        title="Access grants"
        lede={
          allowSelf
            ? "Break-glass access is time-limited and requires a written reason. You can approve your own request; it is marked self-approved for later review, and every use is recorded in the audit log."
            : "Break-glass access is time-limited, requires a reason and a second person's approval, and every use is recorded in the audit log."
        }
        actions={
          <Link href="/ops/admin/security-review" className="btn btn-secondary btn-sm">
            Monthly security review
          </Link>
        }
      />
      {rows.length ? (
        <div className="tbl-wrap" tabIndex={0} role="region" aria-label="Table, scrolls sideways on small screens">
          <table className="t">
            <caption className="visually-hidden">Break-glass access grants</caption>
            <thead>
              <tr>
                <th scope="col">Requested</th>
                <th scope="col">Requester</th>
                <th scope="col">Case</th>
                <th scope="col">Reason</th>
                <th scope="col">Expires</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ g, email }) => {
                const expired = new Date(g.expiresAt).getTime() <= now;
                const state = g.revokedAt ? "revoked" : expired ? "expired" : g.approvedBy ? "approved" : "pending";
                const own = g.granteeUserId === actor.userId;
                const selfApproved = !!g.approvedBy && g.approvedBy === g.granteeUserId;
                return (
                  <tr key={g.id}>
                    <td className="nowrap">
                      <DateTime value={g.createdAt} />
                    </td>
                    <td className="break">{email}</td>
                    <td className="mono">{g.caseId ? (refs[g.caseId] ?? "Unknown") : "All cases"}</td>
                    <td className="small break" style={{ minWidth: 200 }}>
                      {g.reason}
                    </td>
                    <td className="nowrap">
                      <DateTime value={g.expiresAt} />
                    </td>
                    <td>
                      {state === "approved" ? (
                        <Badge tone="alert">{selfApproved ? "Active access, self-approved" : "Active access"}</Badge>
                      ) : state === "pending" ? (
                        <Badge tone="action">Awaiting approval</Badge>
                      ) : state === "revoked" ? (
                        <Badge>Revoked</Badge>
                      ) : (
                        <Badge>Expired</Badge>
                      )}
                    </td>
                    <td>
                      <div className="btn-row">
                        {state === "pending" && canApprove && (!own || allowSelf) ? (
                          <InlineAction action={approveGrantAction} fields={{ grantId: g.id }} variant="primary" pendingText="Approving…">
                            Approve
                          </InlineAction>
                        ) : null}
                        {state === "pending" && own && !(canApprove && allowSelf) ? <span className="fine">Your request needs another approver</span> : null}
                        {state === "pending" || state === "approved" ? (
                          <InlineAction action={revokeGrantAction} fields={{ grantId: g.id }} variant="danger" pendingText="Revoking…">
                            Revoke
                          </InlineAction>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No access grants have been requested.</p>
      )}
    </>
  );
}
