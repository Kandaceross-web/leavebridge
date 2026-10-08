import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton, TextField } from "@/components/forms";
import { getSession } from "@/server/auth/session";
import { stepUpAction } from "../actions";

export const metadata: Metadata = { title: "Confirm it's you" };

export default async function StepUpPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  if (!(await getSession())) redirect("/sign-in");
  return (
    <div className="auth-wrap">
      <div className="auth-card card stack">
        <h1>Confirm it&rsquo;s you</h1>
        <p className="muted">Signing, recording determinations and other sensitive actions need a fresh confirmation of your password.</p>
        <ActionForm action={stepUpAction}>
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
          <SubmitButton block pendingText="Confirming…">
            Confirm
          </SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
