import type { Metadata } from "next";
import { withActor } from "@/server/db/actor";
import { verificationLinkUsable } from "@/server/services/email-verification";
import { ButtonLink } from "@/components/ui";
import { confirmEmailAction } from "../actions";

// The token is in this page's URL, so the browser must not pass it on as a referrer.
export const metadata: Metadata = { title: "Confirm your email", referrer: "no-referrer", robots: { index: false, follow: false } };

/**
 * Landing page for the email confirmation link. Opening it does not use the link (mail scanners open
 * links too); the button does.
 */
export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token === "done") {
    return (
      <div className="container-narrow page stack stack-lg">
        <div className="card stack">
          <p className="eyebrow">Email confirmed</p>
          <h1>Thank you. Your email is confirmed.</h1>
          <p className="lede">You can continue in your portal.</p>
          <div className="btn-row">
            <ButtonLink href="/portal">Go to your portal</ButtonLink>
          </div>
        </div>
      </div>
    );
  }
  const usable = await withActor({ kind: "system", reason: "email verification" }, (ctx) => verificationLinkUsable(ctx, token));
  if (!usable) {
    return (
      <div className="container-narrow page stack stack-lg">
        <div className="card stack">
          <p className="eyebrow">Link not available</p>
          <h1>This link has expired or was already used</h1>
          <p className="lede">
            Each link works once and only for a limited time. Sign in to your portal to send a new one. If you already confirmed your email, there is nothing else to do.
          </p>
          <div className="btn-row">
            <ButtonLink href="/portal">Go to your portal</ButtonLink>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container-narrow page stack stack-lg">
      <div className="card stack">
        <p className="eyebrow">One more step</p>
        <h1>Confirm your email</h1>
        <p className="lede">Select the button to confirm this is your email address.</p>
        <form action={confirmEmailAction.bind(null, token)}>
          <button type="submit" className="btn btn-primary">
            Confirm my email
          </button>
        </form>
      </div>
    </div>
  );
}
