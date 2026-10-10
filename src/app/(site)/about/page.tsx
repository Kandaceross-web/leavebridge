import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink, Icon } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import { siteSettings } from "@/server/web/public";
import { PUBLIC_PROVIDER } from "@/config/provider";

export const metadata: Metadata = {
  title: "About and clinical credentials",
  description: "About LeaveBridge Health and the licensed professional counselor who provides independent assessments.",
};

export default async function AboutPage() {
  const { brand } = await siteSettings();
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="About"
        title={`About ${brand.name}`}
        lede="Telehealth assessments for adults whose mental health is affecting their work."
      />

      <section className="grid g3" aria-label="How we work">
        <div className="feature">
          <span className="bubble bubble-teal"><Icon name="badge" size={24} /></span>
          <h2 className="h3-size">Independent judgment</h2>
          <p>
            A licensed clinician makes every determination. No software does, and the fee is the same whatever the outcome.
          </p>
        </div>
        <div className="feature">
          <span className="bubble bubble-sun"><Icon name="shield" size={24} /></span>
          <h2 className="h3-size">Licensed where you are</h2>
          <p>
            You are matched with a clinician licensed where you are physically located during care.
          </p>
        </div>
        <div className="feature">
          <span className="bubble"><Icon name="lock" size={24} /></span>
          <h2 className="h3-size">Your records, your choice</h2>
          <p>
            A private portal. Nothing goes to an employer without your written authorization.
          </p>
        </div>
      </section>

      <section className="split" aria-labelledby="creds-title">
        <div className="stack stack-sm">
          <p className="eyebrow">Clinical credentials</p>
          <h2 id="creds-title">Who provides your assessment</h2>
          <p className="muted">
            Assessments are provided by a licensed professional counselor, not a physician. You can verify a license with
            the licensing board of the state that issued it.
          </p>
        </div>
        <ul className="creds">
          <li>
            <span>Clinician</span>
            <span>
              {PUBLIC_PROVIDER.name}, {PUBLIC_PROVIDER.postNominals}
            </span>
          </li>
          <li>
            <span>Profession</span>
            <span>{PUBLIC_PROVIDER.profession}</span>
          </li>
          {PUBLIC_PROVIDER.licenses.map((l) => (
            <li key={l.state}>
              <span>{l.state}</span>
              <span>
                {l.title} ({l.abbreviation}), license no. {l.number}
              </span>
            </li>
          ))}
          {PUBLIC_PROVIDER.certifications.map((c) => (
            <li key={c}>
              <span>Certification</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-quiet stack" aria-labelledby="scope-title">
        <h2 id="scope-title" className="mt-0">
          What we do, and what we don&rsquo;t
        </h2>
        <p className="muted">
          We provide assessments and, when clinically supported, leave documentation. We do not provide emergency care, ongoing therapy or medication management,
          and we do not decide FMLA eligibility or approve leave; those decisions belong to your employer or leave administrator.
        </p>
        <div className="btn-row">
          <ButtonLink href="/how-it-works" variant="secondary">
            How it works
          </ButtonLink>
          <Link href="/availability" className="btn btn-quiet">
            Where we serve
          </Link>
        </div>
      </section>
    </div>
  );
}
