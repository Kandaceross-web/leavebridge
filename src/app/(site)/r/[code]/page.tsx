import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink, Icon } from "@/components/ui";
import { referralOrg } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const org = await referralOrg(code);
  return org
    ? {
        title: org.headline ?? "Mental health leave assessments",
        description: "Independent mental-health leave assessments by licensed clinicians.",
        robots: { index: false },
      }
    : { title: "Not found" };
}

export default async function ReferralLandingPage({ params }: Props) {
  const { code } = await params;
  const org = await referralOrg(code);
  if (!org) notFound();
  return (
    <div className="container-narrow page stack stack-xl">
      <header className="stack">
        <p className="eyebrow">Referred by {org.name}</p>
        <h1>{org.headline ?? "Mental health leave assessments"}</h1>
        <p className="lede">
          LeaveBridge Health offers independent assessments by licensed mental-health clinicians for
          people whose mental-health symptoms may be affecting their work.
        </p>
      </header>
      <div className="card stack">
        <h2>What to know</h2>
        <ul className="list-check">
          <li>
            <Icon name="check" />
            <span>
              A licensed clinician makes an independent determination about whether leave
              documentation is clinically supported.
            </span>
          </li>
          <li>
            <Icon name="lock" />
            <span>
              Your information stays private. {org.name} does not receive any clinical information
              unless you authorize it in writing.
            </span>
          </li>
          <li>
            <Icon name="info" />
            <span>
              We do not decide leave eligibility or approve leave. Those decisions remain with your
              employer or leave administrator.
            </span>
          </li>
        </ul>
        <div className="btn-row">
          <ButtonLink href={appHref(`/start?ref=${encodeURIComponent(org.code)}`)}>
            Check if we can help
          </ButtonLink>
          <ButtonLink href="/how-it-works" variant="quiet">
            How it works
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
