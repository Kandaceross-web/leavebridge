import Link from "next/link";
import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import { CredentialCards, CredentialDetail } from "@/components/site";
import { HOME_CREDIBILITY } from "@/config/home";

// Owner's credentials redesign (2026-10-10): the homepage keeps a compact trust section; the full disclosure lives here.

export const metadata: Metadata = {
  title: "Professional credentials",
  description:
    "The licenses, privilege to practice and national certification behind LeaveBridge Health's mental health services.",
  alternates: { canonical: "/credentials" },
};

export default function CredentialsPage() {
  return (
    <div className="container page stack stack-xl">
      <PageHead eyebrow="Professional credentials" title={HOME_CREDIBILITY.title} lede={HOME_CREDIBILITY.body} />
      <section aria-label="Where services are authorized">
        <CredentialCards />
      </section>
      <section className="cred-panel" aria-labelledby="cred-full-title">
        <h2 id="cred-full-title">Full Professional Credentials</h2>
        <CredentialDetail />
      </section>
      <p className="muted">
        Services are available only to people located in these states during care.{" "}
        <Link href="/availability">Where we serve</Link>
      </p>
    </div>
  );
}
