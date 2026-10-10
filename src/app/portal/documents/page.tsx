import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Banner, DateTime, Empty, Icon, PageHead } from "@/components/ui";
import { ISSUED_KIND_LABEL, myIssuedDocuments } from "@/server/services/issued-documents";
import { requirePatientSession, run } from "@/server/auth/guards";
import { patientCases } from "@/server/services/cases";
import { myDeliveredDocuments, myPatientProfile } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { actor } = await requirePatientSession();
  const { profile, cases, docs, issued, features } = await run(actor, async (ctx) => {
    const list = await patientCases(ctx);
    const issued = await myIssuedDocuments(ctx);
    const issuedFiles = new Set(issued.map((i) => i.d.fileId));
    return {
      profile: await myPatientProfile(ctx),
      cases: list.map((c) => c.c),
      // Signed letters issued with a verification number are listed once, below, with that number.
      docs: (await myDeliveredDocuments(ctx, list.map((c) => c.c.id))).filter((d) => !d.signedFileId || !issuedFiles.has(d.signedFileId)),
      issued,
      features: await getSetting(ctx.tx, "features"),
    };
  });
  const refOf = (id: string) => cases.find((c) => c.id === id)?.reference ?? "";

  return (
    <div className="stack stack-lg" style={{ maxWidth: 860 }}>
      <PageHead title="Documents" lede="Signed documents your clinician has delivered. Download them and share them with your employer or leave administrator as needed." />
      {!features.externalDelivery ? (
        <Banner tone="info" icon="info">
          Sending documents directly to your employer is not available yet. You can download your documents and share them yourself. You stay in control of who receives them.
        </Banner>
      ) : null}
      {docs.length ? (
        <ul className="list-rows">
          {docs.map((d) => (
            <li key={d.id}>
              <Icon name="file" />
              <div className="grow">
                <b>{d.title}</b>
                <p className="small muted">
                  Case {refOf(d.caseId)} · Delivered <DateTime value={d.updatedAt} timeZone={profile.timeZone} />
                </p>
              </div>
              <div className="btn-row">
                {d.signedFileId ? (
                  <a className="btn btn-secondary btn-sm" href={`/api/files/${d.signedFileId}`} download>
                    Download PDF
                  </a>
                ) : (
                  <span className="small muted">Preparing download</span>
                )}
                <Link className="small" href={`/portal/cases/${d.caseId}/releases`}>
                  Release authorizations
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : issued.length ? null : (
        <Empty title="No documents yet">If your clinician completes documentation, it will appear here after it is signed and delivered.</Empty>
      )}
      {issued.length ? (
        <section className="stack stack-sm" aria-labelledby="issued-h">
          <h2 id="issued-h">Screening records and letters</h2>
          <p className="small muted">
            Each has a document number and a QR code. Anyone you share it with can confirm it at <Link href="/verify">the verification page</Link>.
          </p>
          <ul className="list-rows">
            {issued.map(({ d, reference }) => (
              <li key={d.id}>
                <Icon name="file" />
                <div className="grow">
                  <b>{ISSUED_KIND_LABEL[d.kind]}</b>
                  <p className="small muted">
                    {reference} · Issued <DateTime value={d.issuedAt} timeZone={profile.timeZone} /> · <span className="mono">{d.publicId}</span>
                  </p>
                </div>
                {d.status === "valid" ? (
                  <a className="btn btn-secondary btn-sm" href={`/api/files/${d.fileId}`} download>
                    Download PDF
                  </a>
                ) : (
                  <Badge tone="alert">Revoked</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="card-flat stack stack-sm" aria-labelledby="employer-h">
        <h2 id="employer-h">If your employer has questions or doesn&rsquo;t accept a form</h2>
        <ul>
          <li>Ask your employer exactly what is missing or why the form wasn&rsquo;t accepted.</li>
          <li>
            Send that request to us in <Link href="/portal/messages">your messages</Link>. If a form we completed is incomplete or unclear, your clinician corrects or clarifies it
            at no extra charge.
          </li>
          <li>If your employer only accepts certain provider types, we can give you a copy of your assessment records to take to a provider your employer accepts.</li>
        </ul>
        <p className="small muted">Refunds follow the refund policy shown before you paid. They depend on how far your case progressed, not on your employer&rsquo;s decision.</p>
      </section>
      <p className="fine">
        Your clinician&rsquo;s documents reflect their independent clinical judgment. Decisions about leave are made by your employer or leave administrator.
      </p>
    </div>
  );
}
