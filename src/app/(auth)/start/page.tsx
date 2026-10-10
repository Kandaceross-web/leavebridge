import type { Metadata } from "next";
import Link from "next/link";
import { Banner, Icon } from "@/components/ui";
import { beginScreening } from "./actions";
import { SAME_DAY_SERVICE_NAME } from "@/config/same-day";

export const metadata: Metadata = { title: "Check if we can help" };

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const sameDay = sp.product === "same-day";
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack stack-sm">
        {sameDay ? (
          <>
            <p className="eyebrow">{SAME_DAY_SERVICE_NAME} · About 1 minute</p>
            <h1>Let&rsquo;s check we can help</h1>
            <p className="lede">
              Two quick question sets about where you are and your safety. No account or payment
              needed yet.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">Step 1 of 7 · About 2 minutes</p>
            <h1>Let&rsquo;s see if we can help</h1>
            <p className="lede">
              A few questions about where you are, your safety, and your leave request. No account or
              payment needed.
            </p>
          </>
        )}
      </header>
      {sp.expired ? (
        <Banner tone="info">
          Your previous answers expired for your privacy. Please start again.
        </Banner>
      ) : null}
      <div className="card stack">
        <ul className="list-check">
          <li>
            <Icon name="check" />
            <span>Your answers are encrypted and used only to check availability.</span>
          </li>
          <li>
            <Icon name="check" />
            {sameDay ? (
              <span>
                This is an automated screening. It is not a clinician examination, a diagnosis, FMLA
                certification or a work excuse.
              </span>
            ) : (
              <span>
                We don&rsquo;t decide FMLA eligibility. A licensed clinician makes every clinical
                decision later.
              </span>
            )}
          </li>
          <li>
            <Icon name="check" />
            <span>If you are in immediate danger, call 911 or call or text 988 now.</span>
          </li>
        </ul>
        <form action={beginScreening}>
          <input type="hidden" name="ref" value={sp.ref ?? ""} />
          {sameDay ? <input type="hidden" name="product" value="same-day" /> : null}
          {/* Which call to action brought the visitor here (e.g. home-hero). Not personal data. */}
          <input type="hidden" name="entry" value={/^[a-z0-9-]{1,40}$/.test(sp.entry ?? "") ? sp.entry : ""} />
          <button type="submit" className="btn btn-primary">
            Begin
          </button>
        </form>
      </div>
      <p className="small muted">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
