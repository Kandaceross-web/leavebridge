import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink, Empty, Icon, PageHead } from "@/components/ui";
import { publicClinicians, siteSettings } from "@/server/web/public";
import styles from "../site.module.css";

export const metadata: Metadata = {
  title: "About and clinical team",
  description: "About LeaveBridge Health and the licensed mental-health clinicians who provide independent assessments.",
};

export default async function AboutPage() {
  const [{ brand }, team] = await Promise.all([siteSettings(), publicClinicians()]);
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="About"
        title={`About ${brand.name}`}
        lede="A telehealth service for adults whose mental-health symptoms may be affecting their ability to work, built around an independent clinical assessment."
      />

      <section className="grid g3" aria-label="How we work">
        <div className="card-flat stack stack-sm">
          <Icon name="badge" size={22} />
          <h2>Independent judgment</h2>
          <p className="muted small">
            Every determination is made by a licensed clinician using their own professional judgment. No software makes clinical decisions, and the fee is the
            same whatever the outcome.
          </p>
        </div>
        <div className="card-flat stack stack-sm">
          <Icon name="shield" size={22} />
          <h2>Licensed where you are</h2>
          <p className="muted small">
            Clinicians are licensed in the states they serve, and you are matched with a clinician licensed where you are physically located during care.
          </p>
        </div>
        <div className="card-flat stack stack-sm">
          <Icon name="lock" size={22} />
          <h2>Your records, your choice</h2>
          <p className="muted small">
            Your information stays in a private portal. You decide who receives any documents, and nothing is shared with an employer without your written
            authorization.
          </p>
        </div>
      </section>

      <section className="stack" aria-labelledby="team-title">
        <h2 id="team-title">Our clinical team</h2>
        {team.length ? (
          <ul className="grid g2 list-plain">
            {team.map((c) => (
              <li key={c.id} className="card stack stack-sm">
                <h3 className={styles.clinicianName}>{c.displayName}</h3>
                <p className="small muted">{c.credentials}</p>
                {c.bio ? <p className="small">{c.bio}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Clinician profiles are coming soon">Our clinicians are licensed in each state we serve.</Empty>
        )}
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
