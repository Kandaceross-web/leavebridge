import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, PageHead } from "@/components/ui";
import { FmlaBasicsCheck } from "@/components/fmla-basics-check";
import { isProduction } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "FMLA basics check: does FMLA likely apply to your job?",
  description:
    "Three questions about your job, not your health, to see whether the basic FMLA eligibility rules likely apply. Nothing you enter is sent or saved.",
  alternates: { canonical: "/resources/fmla-basics-check" },
};

// LEGAL_REVIEW_REQUIRED (LEG-17): describes the federal FMLA eligibility rules; owner sign-off pending.
export default function FmlaBasicsCheckPage() {
  return (
    <div className="container-narrow page stack stack-xl">
      <PageHead
        eyebrow="Guides"
        title="FMLA basics check"
        lede="Three questions about your job, not your health. Your answers stay in your browser: nothing is sent, saved or tracked."
      />
      {!isProduction ? (
        <Banner tone="warn" icon="alert">
          <b>Pending review.</b> This check describes the federal FMLA eligibility rules and is not
          final until signed off.
        </Banner>
      ) : null}
      <FmlaBasicsCheck />
      <p className="small muted">
        General information, not legal advice. Some jobs (for example airline flight crews) have
        special rules, and state laws may give more leave. The{" "}
        <a href="https://www.dol.gov/agencies/whd/fmla">Department of Labor</a> explains the full
        rules.
      </p>
      <div className="card card-sun stack stack-sm">
        <h2>Need medical documentation for leave?</h2>
        <p className="muted">
          A licensed clinician can assess how your symptoms affect your work. See{" "}
          <Link href="/resources/who-can-complete-fmla-forms">who can complete FMLA forms</Link>{" "}
          first.
        </p>
        <div className="btn-row">
          <ButtonLink href={appHref("/start?entry=fmla-basics-check")}>
            Begin Your Assessment
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
