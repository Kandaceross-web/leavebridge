import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
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
      <SiteHero
        eyebrow="Opening soon"
        title="We’re not booking assessments yet"
        lede="We’re getting ready to open in Mississippi and Tennessee. Screening, accounts and appointments open here at launch."
      />
      <p>While you wait, our guides explain FMLA for mental health and who can complete the forms.</p>
      <div className="btn-row">
        <ButtonLink href="/resources">Read the guides</ButtonLink>
        <ButtonLink href="/resources/fmla-basics-check" variant="secondary">
          Check the FMLA basics
        </ButtonLink>
      </div>
      <div className="crisis-card">
        <h2 className="h3-size">Need help right now?</h2>
        <p>
          If you are in danger or thinking about harming yourself, call or text 988, call 911, or go
          to the nearest emergency room. <Link href="/crisis">More crisis resources</Link>
        </p>
      </div>
    </div>
  );
}
