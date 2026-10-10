import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, Checkbox, SubmitButton, TextField } from "@/components/forms";
import { Banner } from "@/components/ui";
import { withActor } from "@/server/db/actor";
import { currentScreening } from "@/server/services/screening";
import { signUpAction } from "../actions";
import { SAME_DAY_SERVICE_NAME } from "@/config/same-day";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignUpPage() {
  const screening = await withActor({ kind: "anonymous" }, (ctx) => currentScreening(ctx));
  if (
    !screening ||
    screening.status !== "completed" ||
    !["AVAILABLE", "NEEDS_REVIEW"].includes(screening.outcome ?? "")
  )
    redirect("/start");
  return (
    <div className="auth-wrap">
      <div className="auth-card card stack" style={{ maxWidth: 560 }}>
        <div className="stack stack-sm">
          <p className="eyebrow">
            {screening.product === "same_day_screening" ? SAME_DAY_SERVICE_NAME : "Step 2 of 7"}
          </p>
          <h1>Create your secure account</h1>
          <p className="muted">
            Use your legal name as it appears on your photo ID. Your clinician&rsquo;s documents
            will use this name.
          </p>
        </div>
        {screening.outcome === "NEEDS_REVIEW" ? (
          <Banner tone="info" icon="info">
            A clinician will review a few of your answers before payment. You can create your
            account and get started now.
          </Banner>
        ) : null}
        <ActionForm action={signUpAction}>
          <div className="grid g2" style={{ gap: 16 }}>
            <TextField
              name="firstName"
              label="Legal first name"
              autoComplete="given-name"
              required
            />
            <TextField
              name="lastName"
              label="Legal last name"
              autoComplete="family-name"
              required
            />
          </div>
          <TextField
            name="preferredName"
            label="Preferred name (optional)"
            autoComplete="nickname"
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            hint="We only send notices that something is waiting in your portal, never health details."
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            hint="At least 12 characters. A short phrase works well."
          />
          <TextField
            name="dateOfBirth"
            label="Date of birth"
            type="date"
            autoComplete="bday"
            required
          />
          <input type="hidden" name="timeZone" value="America/Chicago" />
          <Checkbox name="ageAttest" required>
            I confirm I am 18 or older.
          </Checkbox>
          <Checkbox name="termsAccept" required>
            I agree to the{" "}
            <Link href="/legal/terms" target="_blank">
              Terms of Use
            </Link>{" "}
            and acknowledge the{" "}
            <Link href="/legal/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </Checkbox>
          <SubmitButton block pendingText="Creating your account…">
            Create account
          </SubmitButton>
        </ActionForm>
        <p className="small muted">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
