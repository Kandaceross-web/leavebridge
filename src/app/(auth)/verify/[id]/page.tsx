import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, FileField, SubmitButton } from "@/components/forms";
import { Badge, Banner, KeyValue } from "@/components/ui";
import { clientIpKey } from "@/server/request";
import { rateLimit } from "@/server/rate-limit";
import { verifyDocument, type PublicVerification } from "@/server/services/issued-documents";
import { isDomainError } from "@/domain/errors";
import { checkUploadedCopyAction } from "../actions";

export const metadata: Metadata = { title: "Document verification", referrer: "no-referrer", robots: { index: false, follow: false } };

const when = (d: Date) => `${d.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" })} Central`;

export default async function VerifyResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let result: PublicVerification | null = null;
  let limited = false;
  try {
    await rateLimit("verify", await clientIpKey());
    result = await verifyDocument(decodeURIComponent(id));
  } catch (e) {
    if (!isDomainError(e) || e.code !== "rate_limited") throw e;
    limited = true;
  }

  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack stack-sm">
        <p className="eyebrow">Document verification</p>
        <h1>
          {limited
            ? "Please wait a moment"
            : !result?.found
              ? "Document not found"
              : result.status === "valid"
                ? "This document is genuine and valid"
                : "This document has been revoked"}
        </h1>
      </header>

      {limited ? (
        <Banner tone="info" icon="clock">
          Too many checks from this connection. Please wait a few minutes and try again.
        </Banner>
      ) : !result?.found ? (
        <div className="card stack stack-sm">
          <p>
            No document with {result?.documentNumber ? <span className="mono">{result.documentNumber}</span> : "this number"} was issued by this practice. Check the number and try again. A
            document that cannot be found here should not be relied on.
          </p>
          <p>
            <Link href="/verify">Check another number</Link>
          </p>
        </div>
      ) : (
        <section className="card stack" aria-labelledby="res-h">
          <div className="card-head">
            <h2 id="res-h">{result.kindLabel}</h2>
            {result.status === "valid" ? <Badge tone="done">Valid</Badge> : <Badge tone="alert">Revoked</Badge>}
          </div>
          <KeyValue
            items={[
              ["Document number", <span key="n" className="mono">{result.documentNumber}</span>],
              ["Type", result.kindLabel],
              ["Issued", when(result.issuedAt!)],
              ...(result.issuer?.clinician ? ([["Signed by", result.issuer.clinician]] as [string, string][]) : []),
              ["Issuing practice", result.issuer?.practice ?? "—"],
              ...(result.status === "revoked" && result.revokedAt ? ([["Revoked", when(result.revokedAt)]] as [string, string][]) : []),
            ]}
          />
          {result.detail?.length ? (
            <div className="stack stack-sm">
              <h3>Compare with the copy you were given</h3>
              <ul>
                {result.detail.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="small muted">
                If the name or dates on your copy are different, the copy was changed after it was issued and should not be relied on.
              </p>
            </div>
          ) : null}
          {result.status === "revoked" ? (
            <Banner tone="warn" icon="alert">
              The issuing practice revoked this document. It should no longer be relied on. Contact the person who gave it to you for a current document.
            </Banner>
          ) : null}
          {result.kind === "automated_screening_record" ? (
            <p className="small muted">
              An automated screening record documents that screening questionnaires were completed. It is not a clinician examination, diagnosis, leave certification or work excuse.
            </p>
          ) : null}
        </section>
      )}

      {result?.found && result.documentNumber ? (
        <section className="card-flat stack stack-sm" aria-labelledby="copy-h">
          <h2 id="copy-h">Check a copy for changes</h2>
          <p className="small muted">Choose the PDF you received. It is compared with the issued document here and is not stored.</p>
          <ActionForm action={checkUploadedCopyAction.bind(null, result.documentNumber)}>
            <FileField name="copy" label="PDF to check" accept="application/pdf" required />
            <SubmitButton variant="secondary" pendingText="Checking…">
              Compare
            </SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      <p className="fine">This page shows only whether a document is genuine and current. It never shows health information or who the document is about.</p>
    </div>
  );
}
