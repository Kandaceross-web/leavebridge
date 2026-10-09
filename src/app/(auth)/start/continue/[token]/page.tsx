import type { Metadata } from "next";
import { withActor } from "@/server/db/actor";
import { continueLinkUsable } from "@/server/services/continue-link";
import { ButtonLink, Icon } from "@/components/ui";
import { redeemContinueLinkAction } from "../../actions";

// The token is in this page's URL, so the browser must not pass it on as a referrer.
export const metadata: Metadata = { title: "Continue where you left off", referrer: "no-referrer" };

/**
 * Landing page for the "continue" email link. Opening it does not use the link (mail scanners
 * open links too); the button does, restoring the screening in this browser and going to sign-up.
 */
export default async function ContinueLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usable = await withActor({ kind: "anonymous" }, (ctx) => continueLinkUsable(ctx, token));
  if (!usable) {
    return (
      <div className="container-narrow page stack stack-lg">
        <div className="card stack">
          <p className="eyebrow">Link not available</p>
          <h1>This link has expired or was already used</h1>
          <p className="lede">
            Each link works once and only for a limited time. For your privacy, we may also have
            deleted your earlier answers. You can start again; it takes about 2 minutes.
          </p>
          <div className="btn-row">
            <ButtonLink href="/start">Start again</ButtonLink>
            <ButtonLink href="/sign-in" variant="quiet">
              I already have an account
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container-narrow page stack stack-lg">
      <div className="card stack">
        <p className="eyebrow">Welcome back</p>
        <h1>Continue where you left off</h1>
        <p className="lede">
          Your earlier answers are saved, so you can go straight to creating your secure account.
        </p>
        <ul className="list-check">
          <li>
            <Icon name="check" />
            <span>This link works once. After you continue, it stops working.</span>
          </li>
          <li>
            <Icon name="check" />
            <span>Your answers were not in the email, and we did not keep your email address.</span>
          </li>
        </ul>
        <form action={redeemContinueLinkAction.bind(null, token)}>
          <button type="submit" className="btn btn-primary">
            Continue to create your account
          </button>
        </form>
      </div>
    </div>
  );
}
