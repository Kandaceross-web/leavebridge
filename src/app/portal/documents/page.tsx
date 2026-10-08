import Link from "next/link";
import type { Metadata } from "next";
import { Banner, DateTime, Empty, Icon, PageHead } from "@/components/ui";
import { requirePatientSession, run } from "@/server/auth/guards";
import { patientCases } from "@/server/services/cases";
import { myDeliveredDocuments, myPatientProfile } from "@/server/services/portal-queries";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { actor } = await requirePatientSession();
  const { profile, cases, docs, features } = await run(actor, async (ctx) => {
    const list = await patientCases(ctx);
    return {
      profile: await myPatientProfile(ctx),
      cases: list.map((c) => c.c),
      docs: await myDeliveredDocuments(ctx, list.map((c) => c.c.id)),
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
      ) : (
        <Empty title="No documents yet">If your clinician completes documentation, it will appear here after it is signed and delivered.</Empty>
      )}
      <p className="fine">
        Your clinician&rsquo;s documents reflect their independent clinical judgment. Decisions about leave are made by your employer or leave administrator.
      </p>
    </div>
  );
}
