import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextField } from "@/components/forms";
import { Icon } from "@/components/ui";
import { lookupDocumentAction } from "./actions";

export const metadata: Metadata = {
  title: "Verify a document",
  description: "Confirm that a screening record or letter was issued by the practice and has not been revoked.",
};

export default function VerifyLookupPage() {
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack stack-sm">
        <p className="eyebrow">Document verification</p>
        <h1>Verify a document</h1>
        <p className="lede">Enter the document number printed at the top of the document, or scan its QR code.</p>
      </header>
      <ActionForm action={lookupDocumentAction} className="form card">
        <TextField name="documentNumber" label="Document number" placeholder="LB-XXXX-XXXX-XXXX-XXXX-XXXX" autoComplete="off" maxLength={40} required />
        <SubmitButton pendingText="Checking…">Check document</SubmitButton>
      </ActionForm>
      <ul className="list-check small">
        <li>
          <Icon name="lock" />
          <span>This page confirms only whether a document is genuine and current. It never shows health information or who the document is about.</span>
        </li>
        <li>
          <Icon name="info" />
          <span>To check that a copy has not been changed, open the result and compare the PDF you received.</span>
        </li>
      </ul>
    </div>
  );
}
