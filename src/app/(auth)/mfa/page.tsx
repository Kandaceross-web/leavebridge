import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton, TextField } from "@/components/forms";
import { getSession } from "@/server/auth/session";
import { otpauthUri } from "@/server/auth/totp";
import { enrollmentSecret, mfaAction } from "../actions";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const s = await getSession();
  if (!s) redirect("/sign-in");
  const enroll = s.mfaEnrolled ? null : await enrollmentSecret();
  return (
    <div className="auth-wrap">
      <div className="auth-card card stack">
        <h1>{enroll ? "Set up two-step verification" : "Two-step verification"}</h1>
        {enroll ? (
          <div className="stack stack-sm">
            <p className="muted">
              Add this account to an authenticator app (such as 1Password, Authy, Google or
              Microsoft Authenticator), then enter the 6-digit code it shows.
            </p>
            <div className="card-quiet stack stack-sm">
              <p className="small muted">Setup key</p>
              <p className="mono break" style={{ fontSize: 17, letterSpacing: "0.08em" }}>
                {enroll.secret.match(/.{1,4}/g)?.join(" ")}
              </p>
              <a className="small" href={otpauthUri(enroll.secret, enroll.email)}>
                Open in authenticator app
              </a>
            </div>
          </div>
        ) : (
          <p className="muted">Enter the 6-digit code from your authenticator app.</p>
        )}
        <ActionForm action={mfaAction}>
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <TextField
            name="code"
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            required
          />
          <SubmitButton block pendingText="Checking…">
            Verify
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
