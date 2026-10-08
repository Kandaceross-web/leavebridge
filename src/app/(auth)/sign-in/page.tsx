import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton, TextField } from "@/components/forms";
import { Banner } from "@/components/ui";
import { signInAction } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card card stack">
        <div className="stack stack-sm">
          <h1>Sign in</h1>
          <p className="muted">{sp.staff ? "Staff sign-in requires two-step verification." : "Welcome back. Sign in to your secure portal."}</p>
        </div>
        {sp.signed_out ? <Banner tone="sage">You have been signed out.</Banner> : null}
        {sp.expired ? <Banner tone="info">Your session ended for your security. Please sign in again.</Banner> : null}
        <ActionForm action={signInAction}>
          {(state) => (
            <>
              <input type="hidden" name="next" value={sp.next ?? ""} />
              <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email as string | undefined} error={state.fieldErrors?.email} />
              <TextField name="password" label="Password" type="password" autoComplete="current-password" required error={state.fieldErrors?.password} />
              <SubmitButton block pendingText="Signing in…">
                Sign in
              </SubmitButton>
            </>
          )}
        </ActionForm>
        <div className="stack stack-sm small">
          <Link href="/forgot-password">Forgot your password?</Link>
          <p className="muted">
            New here? <Link href="/start">Check if we can help</Link> before creating an account.
          </p>
        </div>
      </div>
    </div>
  );
}
