import Link from "next/link";
import type { Metadata } from "next";
import { Badge, ButtonLink, Icon, Money } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import { allServices, enabledServices, sameDayService } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "Services and pricing",
  description:
    "The mental-health leave services currently offered, their price, the types of leave documentation a clinician can complete when clinically supported, and what is not yet offered.",
};

export default async function ServicesPage() {
  const [enabled, all, sameDay] = await Promise.all([enabledServices(), allServices(), sameDayService()]);
  const later = all.filter((s) => !s.enabled);
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="Services"
        title="Our Services"
        lede="Choose the service that fits your needs. Clear pricing, confidential intake, and a straightforward process from the beginning."
      />

      <section className="stack" aria-labelledby="offered-title">
        <h2 id="offered-title">Currently offered</h2>
        {enabled.length ? (
          <div className="grid g3">
            {enabled.map((s) => (
              <article key={s.id} className="svc">
                <h3 className="mt-0 h3-size">{s.name}</h3>
                <p className="price">
                  {s.priceCents !== null ? <Money cents={s.priceCents} /> : "—"}
                  <small>self-pay</small>
                </p>
                <p className="muted">{s.summary}</p>
                {s.description ? (
                  <details className="more">
                    <summary>Learn more</summary>
                    <div>
                      <p>{s.description}</p>
                    </div>
                  </details>
                ) : null}
                <div className="btn-row">
                  <ButtonLink href={s.slug === "mental-health-leave-assessment" ? "/fmla-evaluations" : appHref("/start?entry=services")}>
                    {s.slug === "mental-health-leave-assessment" ? "View Service Details" : "Begin Your Evaluation"}
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            We are not accepting new assessments right now. Please check back soon.
          </p>
        )}
        <p className="small">
          <Link href="/pricing">Pricing and refunds</Link>
        </p>
      </section>

      {sameDay ? (
        <section className="stack" aria-labelledby="includes-title">
          <h2 id="includes-title">Also Offered</h2>
          <article className="svc-card svc-card-compact" aria-labelledby="same-day-title">
            <h3 id="same-day-title">Work &amp; School Excuse Evaluation</h3>
            <p className="svc-price">{sameDay.priceCents !== null ? <Money cents={sameDay.priceCents} /> : "—"}</p>
            <p>
              Request a confidential mental health evaluation for a work or school absence. Complete your intake online, provide information about your symptoms, and receive
              clear next steps regarding your documentation request.
            </p>
            <ButtonLink href="/work-school-excuses">View Service Details</ButtonLink>
          </article>
          <p className="svc-disclosure">
            Documentation requests are subject to appropriate clinical evaluation and approval. Screening completion alone does not guarantee an excuse.
          </p>
        </section>
      ) : null}

      <section className="grid g2" aria-label="Documentation and employer requirements">
        <div className="feature">
          <span className="bubble bubble-mint">
            <Icon name="file" size={24} />
          </span>
          <h2 className="h3-size">What can be completed</h2>
          <ul className="list-check">
            {[
              "Your employer's or leave administrator's certification form, when you upload it",
              "A clinician letter for continuous, intermittent or reduced-schedule leave",
              "A letter explaining the clinician's determination",
            ].map((t) => (
              <li key={t}>
                <Icon name="check" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Nothing is completed automatically. The outcome may be that no documentation is
            supported.
          </p>
        </div>
        <div className="feature">
          <span className="bubble bubble-sun">
            <Icon name="users" size={24} />
          </span>
          <h2 className="h3-size">Check with HR first</h2>
          <p>Ask your HR team or leave administrator:</p>
          <ul className="list-check">
            {[
              "Do you accept certification from a licensed mental-health clinician by telehealth?",
              "Which form do you need, and when is it due?",
              "Am I eligible for the leave I'm requesting?",
            ].map((t) => (
              <li key={t}>
                <Icon name="info" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            We don&rsquo;t decide FMLA eligibility or approve leave. Your employer or leave
            administrator does.
          </p>
        </div>
      </section>

      {later.length ? (
        <section className="stack" aria-labelledby="later-title">
          <h2 id="later-title">Not offered yet</h2>
          <ul className="list-rows card-flat">
            {later.map((s) => (
              <li key={s.id} className="row row-between">
                <div className="grow stack stack-sm">
                  <b>{s.name}</b>
                  <span className="small muted">{s.summary}</span>
                </div>
                <Badge tone="neutral">Coming later</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="small muted">
        Questions? <Link href="/faq">Read common questions</Link> or{" "}
        <Link href="/contact">contact us</Link>.
      </p>
    </div>
  );
}
