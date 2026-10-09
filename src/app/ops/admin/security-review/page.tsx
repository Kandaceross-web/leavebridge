import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextArea } from "@/components/forms";
import { Badge, Banner, DateTime, KeyValue, PageHead } from "@/components/ui";
import { requireStaffSession, run } from "@/server/auth/guards";
import { SECURITY_REVIEW_INTERVAL_DAYS, SECURITY_REVIEW_ROLES, securityReviewStatus, securityReviewSummary } from "@/server/services/security-review";
import { hasRole } from "@/domain/policy";
import { recordSecurityReviewAction } from "./actions";

export const metadata: Metadata = { title: "Monthly security review" };

export default async function SecurityReviewPage() {
  const { actor } = await requireStaffSession([...SECURITY_REVIEW_ROLES]);
  const canSeeAudit = hasRole(actor, ["admin", "compliance"]);
  const { status, summary } = await run(actor, async (ctx) => ({ status: await securityReviewStatus(ctx), summary: await securityReviewSummary(ctx) }));

  return (
    <>
      <PageHead
        eyebrow="Oversight"
        title="Monthly security review"
        lede="Once a month, look over the audit log and the access grants, then record that the review was done. Counts below cover the last 30 days."
      />

      {status.due ? (
        <Banner tone="warn" icon="alert">
          {status.lastReviewAt ? (
            <>
              The monthly security review is due. Last recorded <DateTime value={status.lastReviewAt} dateOnly />.
            </>
          ) : (
            "No monthly security review has been recorded yet."
          )}
        </Banner>
      ) : (
        <Banner tone="sage" icon="check">
          Last review recorded <DateTime value={status.lastReviewAt} dateOnly />. The next one is due within {SECURITY_REVIEW_INTERVAL_DAYS} days of it.
        </Banner>
      )}

      <section className="card stack" aria-labelledby="counts-h">
        <h2 id="counts-h">Last 30 days</h2>
        <p className="small muted">
          Since <DateTime value={summary.since} dateOnly />. From the audit log; counts only.
        </p>
        <KeyValue
          items={[
            [
              "Emergency access approved",
              <>
                <b>{summary.emergencyAccessApproved}</b>
                {summary.emergencyAccessSelfApproved ? (
                  <>
                    {" "}
                    <Badge tone="alert">{summary.emergencyAccessSelfApproved} self-approved</Badge>
                  </>
                ) : (
                  <span className="muted"> (none self-approved)</span>
                )}
              </>,
            ],
            ["Records opened under emergency access", <b key="u">{summary.emergencyAccessUses}</b>],
            ["Failed sign-ins", <b key="f">{summary.failedSignIns}</b>],
            ["Account lockouts", <b key="l">{summary.lockouts}</b>],
            [
              "Audit chain (tamper check)",
              summary.chainBrokenAt === null ? (
                <Badge tone="done">Intact</Badge>
              ) : (
                <Badge tone="alert">{`Broken at row #${summary.chainBrokenAt}`}</Badge>
              ),
            ],
          ]}
        />
        {summary.chainBrokenAt !== null ? (
          <Banner tone="alert" icon="alert">
            The audit log fails verification from row #{summary.chainBrokenAt}. Escalate it as a security incident; do not modify the table.
          </Banner>
        ) : null}
        <ul className="list-plain stack stack-sm">
          <li>
            <Link href="/ops/admin/access">Review access grants</Link> <span className="small muted">(self-approved grants are marked)</span>
          </li>
          {canSeeAudit ? (
            <>
              <li>
                <Link href="/ops/audit?action=access_grant.">Audit events for emergency access</Link>
              </li>
              <li>
                <Link href="/ops/audit?action=auth.">Audit events for sign-ins and lockouts</Link>
              </li>
            </>
          ) : (
            <li className="small muted">The full audit log is open to admin and compliance roles.</li>
          )}
        </ul>
      </section>

      <section className="card stack" aria-labelledby="record-h">
        <h2 id="record-h">Record this month&rsquo;s review</h2>
        <ActionForm action={recordSecurityReviewAction}>
          <TextArea
            name="note"
            label="Note (optional)"
            hint="A short note for your records, for example follow-ups. No patient names or clinical details."
            maxLength={500}
            rows={3}
          />
          <div>
            <SubmitButton pendingText="Recording…">Record review done</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
