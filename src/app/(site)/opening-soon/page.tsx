import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { isPublicPreview } from "@/server/env";

export const metadata: Metadata = {
  title: "Opening soon",
  description: "LeaveBridge Health is preparing to open in Mississippi and Tennessee.",
  robots: { index: false, follow: true },
};

/** Where app links point on the static public preview (see src/server/web/app-link.ts). */
export default function OpeningSoonPage() {
  if (!isPublicPreview) notFound();
  return (
    <div className="container-narrow page stack stack-lg">
      <header className="stack">
        <p className="eyebrow">Opening soon</p>
        <h1>We&rsquo;re not booking assessments yet</h1>
        <p className="lede">
          LeaveBridge Health is getting ready to open for people in Mississippi and Tennessee.
          Screening, accounts and appointments will open here at launch.
        </p>
      </header>
      <p>
        While you wait, our guides explain how FMLA works for mental health, who can complete the
        forms, and what your employer can see.
      </p>
      <div className="cluster">
        <ButtonLink href="/resources">Read the guides</ButtonLink>
        <ButtonLink href="/resources/fmla-basics-check" variant="secondary">
          Check the FMLA basics
        </ButtonLink>
      </div>
      <div className="card card-lavender stack stack-sm">
        <h2>Need help right now?</h2>
        <p>
          If you are in danger or thinking about harming yourself, call or text 988, call 911, or go
          to the nearest emergency room. <Link href="/crisis">More crisis resources</Link>
        </p>
      </div>
    </div>
  );
}
