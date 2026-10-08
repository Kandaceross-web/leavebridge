import type { Metadata } from "next";
import Link from "next/link";
import { Banner, Icon } from "@/components/ui";
import { beginScreening } from "./actions";

export const metadata: Metadata = { title: "Check if we can help" };

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack stack-sm">
        <p className="eyebrow">Step 1 of 7 · About 2 minutes</p>
        <h1>Let&rsquo;s see if we can help</h1>
        <p className="lede">
          A few questions about where you are, your safety, and your leave request. No account or
          payment needed.
        </p>
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
            <span>
              We don&rsquo;t decide FMLA eligibility. A licensed clinician makes every clinical
              decision later.
            </span>
          </li>
          <li>
            <Icon name="check" />
            <span>If you are in immediate danger, call 911 or call or text 988 now.</span>
          </li>
        </ul>
        <form action={beginScreening}>
          <input type="hidden" name="ref" value={sp.ref ?? ""} />
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
