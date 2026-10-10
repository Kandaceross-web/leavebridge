import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Badge, Banner, DateTime, DraftBadge, KeyValue, PageHead, ReviewTag } from "@/components/ui";
import { env } from "@/server/env";
import { requireStaffSession, run } from "@/server/auth/guards";
import { getSetting } from "@/server/settings";
import { workExcuseDetail } from "@/server/services/work-excuse";
import { DOCUMENT_TEMPLATES } from "@/config/document-templates";
import { SAME_DAY_REVIEW } from "@/config/same-day";
import { SETTING_DEFS } from "@/config/settings";
import { longDate } from "@/domain/same-day/rules";
import { isDomainError } from "@/domain/errors";
import { approveLetterAction, claimLetterAction, declineLetterAction } from "../../actions";

export const metadata: Metadata = { title: "Work excuse letter request" };

const STATUS: Record<string, { label: string; tone: "action" | "done" | "neutral" }> = {
  requested: { label: "Waiting for a clinician", tone: "action" },
  approved: { label: "Approved and issued", tone: "done" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export default async function LetterRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { actor } = await requireStaffSession(["clinician", "clinical_director"]);
  const data = await run(actor, async (ctx) => ({ d: await workExcuseDetail(ctx, id), setting: await getSetting(ctx.tx, "workExcuseLetter") })).catch((e) => {
    if (isDomainError(e) && (e.code === "not_found" || e.code === "forbidden")) notFound();
    throw e;
  });
  const { setting } = data;
  if (data.d.limited) {
    const l = data.d;
    return (
      <div className="stack stack-lg" style={{ maxWidth: 960 }}>
        <PageHead eyebrow="Work excuse letter request" title={l.row.reference} actions={<Badge tone={STATUS[l.request.status]!.tone}>{STATUS[l.request.status]!.label}</Badge>} />
        <p className="small">
          <Link href="/ops/same-day">All same-day screenings</Link>
        </p>
        {l.request.status === "requested" ? (
          <section className="card stack stack-sm" aria-labelledby="claim-h">
            <h2 id="claim-h">Review this request</h2>
            <p className="small muted">
              Requested <DateTime value={l.request.createdAt} />. Take the request to see the screening and the proposed letter. You must be authorized in the patient&rsquo;s state ({l.row.jurisdictionCode ?? "—"}).
            </p>
            <ActionForm action={claimLetterAction.bind(null, id)}>
              <SubmitButton>Assign to me</SubmitButton>
            </ActionForm>
          </section>
        ) : (
          <p className="muted">This request has been decided. Details are visible to the clinician who reviewed it.</p>
        )}
      </div>
    );
  }
  const d = data.d;
  const fields = DOCUMENT_TEMPLATES.work_excuse_letter.fields;
  const draft = d.current ?? (d.proposed as unknown as Record<string, string>);
  const open = d.request.status === "requested";
  const showTags = env.APP_ENV !== "production";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 960 }}>
      <PageHead eyebrow="Work excuse letter request" title={d.row.reference} actions={<Badge tone={STATUS[d.request.status]!.tone}>{STATUS[d.request.status]!.label}</Badge>} />
      <p className="small">
        <Link href="/ops/same-day">All same-day screenings</Link> · <Link href={`/ops/same-day/${d.row.id}`}>Screening</Link>
      </p>

      {sp.approved ? (
        <Banner tone="sage" icon="check">
          Signed and issued. The patient was told it is ready in their portal.
        </Banner>
      ) : null}

      <section className="card stack" aria-labelledby="req-h">
        <h2 id="req-h">What the patient asked for</h2>
        <KeyValue
          items={[
            ["First day away", d.input.startDate ? longDate(d.input.startDate) : "—"],
            ["Last day away", d.input.endDate ? longDate(d.input.endDate) : "—"],
            ["Expected return", d.input.returnDate ? longDate(d.input.returnDate) : "—"],
            ["Requested", <DateTime key="r" value={d.request.createdAt} />],
            ["Screening finished", d.screeningCompletedAt ? <DateTime key="s" value={d.screeningCompletedAt} /> : "—"],
          ]}
        />
        {d.input.note ? (
          <div className="stack stack-sm">
            <h3>Patient&rsquo;s note</h3>
            <p className="card-quiet">{d.input.note}</p>
          </div>
        ) : null}
      </section>

      {d.summary ? (
        <section className="card-flat stack" aria-labelledby="sum-h">
          <h2 id="sum-h">Automated screening summary</h2>
          {d.summary.sections.map((s) => (
            <div key={s.heading} className="stack stack-sm">
              <h3>{s.heading}</h3>
              {s.lines.map((l) => (
                <p key={l} className="small">
                  {l}
                </p>
              ))}
            </div>
          ))}
          <p className="fine">These are the patient&rsquo;s self-reported screening results. Use your own clinical judgment, and contact the patient if you need more information.</p>
        </section>
      ) : null}

      {open && !d.isAssignedToMe ? (
        <section className="card stack stack-sm" aria-labelledby="claim-h">
          <h2 id="claim-h">Review this request</h2>
          <p className="small muted">Take the request to review it. You must be authorized in the patient&rsquo;s state ({d.row.jurisdictionCode ?? "—"}).</p>
          <ActionForm action={claimLetterAction.bind(null, id)}>
            <SubmitButton>Assign to me</SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      {open && d.isAssignedToMe ? (
        <>
          <section className="card stack" aria-labelledby="draft-h">
            <div className="card-head">
              <h2 id="draft-h">Letter</h2>
              {showTags ? <ReviewTag tag={SAME_DAY_REVIEW.letter} /> : null}
            </div>
            <div className="suggestion stack stack-sm">
              <DraftBadge>PROPOSED · CLINICIAN REVIEW REQUIRED</DraftBadge>
              <p className="small">
                The system prepared this proposal from the patient&rsquo;s request (rule-based, no AI). Nothing is signed until you approve. Edit anything, or decline below.
              </p>
            </div>
            <ActionForm action={approveLetterAction.bind(null, id)}>
              {fields.map((f) =>
                f.kind === "textarea" ? (
                  <TextArea key={f.key} name={f.key} label={f.label} hint={f.help} defaultValue={draft[f.key] ?? ""} required={f.required} rows={8} maxLength={6000} />
                ) : (
                  <TextField key={f.key} name={f.key} label={f.label} hint={f.help} type={f.kind === "date" ? "date" : "text"} defaultValue={draft[f.key] ?? ""} required={f.required} maxLength={200} />
                ),
              )}
              <div className="card-quiet stack stack-sm">
                <div className="row row-between">
                  <b>Attestation</b>
                  {showTags ? <ReviewTag tag={SETTING_DEFS.workExcuseLetter.reviewTag} /> : null}
                </div>
                <p className="small">{setting.attestation}</p>
              </div>
              <Checkbox name="attest" required>
                I have reviewed this request and the screening, and I approve this letter as written under my license.
              </Checkbox>
              <SubmitButton pendingText="Signing…">Approve, sign and issue</SubmitButton>
              <p className="fine">You will be asked to confirm your password. Your electronic signature is applied only now, to this exact text.</p>
            </ActionForm>
          </section>

          <section className="card-flat stack" aria-labelledby="decline-h">
            <h2 id="decline-h">Decline</h2>
            <ActionForm action={declineLetterAction.bind(null, id)}>
              <TextArea name="message" label="Message to the patient" hint="Shown in their portal. The email only says there is an update." required rows={4} maxLength={4000} />
              <Checkbox name="recommend">Recommend a full clinician-led assessment</Checkbox>
              <SubmitButton variant="secondary" pendingText="Saving…">
                Decline request
              </SubmitButton>
            </ActionForm>
          </section>
        </>
      ) : null}

      {d.issued ? (
        <section className="card-flat stack stack-sm" aria-labelledby="iss-h">
          <h2 id="iss-h">Issued letter</h2>
          <KeyValue
            items={[
              ["Document number", <span key="n" className="mono">{d.issued.publicId}</span>],
              ["Issued", <DateTime key="i" value={d.issued.issuedAt} />],
              ["Status", d.issued.status === "valid" ? "Valid" : "Revoked"],
            ]}
          />
          <a href={`/api/files/${d.issued.fileId}`} target="_blank" rel="noopener noreferrer" className="small">
            Open signed PDF<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </section>
      ) : null}

      {d.request.status === "declined" && d.declineMessage ? (
        <section className="card-flat stack stack-sm" aria-labelledby="dec-h">
          <h2 id="dec-h">Declined</h2>
          <p className="small">{d.declineMessage}</p>
        </section>
      ) : null}
    </div>
  );
}
