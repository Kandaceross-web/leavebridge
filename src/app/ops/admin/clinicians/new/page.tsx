import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, Checkbox, SubmitButton, TextArea, TextField } from "@/components/forms";
import { Banner, PageHead } from "@/components/ui";
import { requireStaffSession } from "@/server/auth/guards";
import { isDevLike } from "@/server/env";
import { createClinicianAction } from "../actions";

export const metadata: Metadata = { title: "Add clinician" };

export default async function NewClinicianPage() {
  await requireStaffSession(["admin"]);
  return (
    <>
      <p className="small">
        <Link href="/ops/admin/clinicians">← Clinicians</Link>
      </p>
      <PageHead
        eyebrow="Configuration"
        title="Add clinician"
        lede="The clinician starts in onboarding status. Add verified licenses or privileges and service authorizations before activating."
      />
      {isDevLike ? (
        <Banner tone="info" icon="info">
          Development environment: use fictional names, emails (e.g. @leavebridge.test) and license numbers only.
        </Banner>
      ) : null}
      <div className="card">
        <ActionForm action={createClinicianAction}>
          <TextField name="email" label="Sign-in email" type="email" autoComplete="off" required />
          <TextField name="initialPassword" label="Initial password" type="password" autoComplete="new-password" required hint="Share it through a secure channel; the clinician enrolls two-step verification on first sign-in." />
          <TextField name="legalName" label="Legal name" required maxLength={160} />
          <TextField name="displayName" label="Display name" required maxLength={160} hint="Shown to patients, for example “Jordan Rivera, LPC”." />
          <TextField name="credentials" label="Credentials" required maxLength={60} placeholder="LPC" />
          <TextField name="degree" label="Degree" maxLength={60} />
          <TextField name="npi" label="NPI" inputMode="numeric" maxLength={10} hint="10 digits, optional." />
          <TextArea name="bio" label="Bio" rows={4} maxLength={3000} />
          <TextField name="malpracticeCarrier" label="Malpractice carrier" maxLength={160} />
          <TextField name="malpracticeExpiresOn" label="Malpractice coverage expires" type="date" />
          <Checkbox name="publicProfile">Show a public profile</Checkbox>
          <Checkbox name="director">Also grant the clinical director role</Checkbox>
          <div>
            <SubmitButton pendingText="Creating…">Create clinician</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
