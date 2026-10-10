import Link from "next/link";
import type { Metadata } from "next";
import { Badge, ButtonLink, Icon, Money } from "@/components/ui";
import { SiteHero } from "@/components/illustration";
import { allServices, enabledServices, sameDayService } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "FMLA and leave services",
  description:
    "The mental-health leave services currently offered, their price, the types of leave documentation a clinician can complete when clinically supported, and what is not yet offered.",
};

const LEAVE_TYPES = [
  { name: "Continuous leave", body: "One unbroken period away, such as several weeks.", bubble: "" },
  { name: "Intermittent leave", body: "Separate days or part-days as symptoms require.", bubble: " bubble-lav" },
  { name: "Reduced schedule", body: "Fewer hours a day or days a week, for a time.", bubble: " bubble-mint" },
];

export default async function ServicesPage() {
  const [enabled, all, sameDay] = await Promise.all([enabledServices(), allServices(), sameDayService()]);
  const later = all.filter((s) => !s.enabled);
  return (
    <div className="container page stack stack-xl">
      <SiteHero
        eyebrow="FMLA / Leave Services"
        title="Leave services"
        lede="Independent assessments when mental-health symptoms are affecting your work."
        art="services"
        artAlt="Illustration of a calendar showing a block of leave, separate days off and shorter days, beside a person with a warm drink."
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
                  <ButtonLink href={appHref("/start?entry=services")}>
                    Check if we can help
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
          <Link href="/pricing">What&rsquo;s included and refunds</Link>
        </p>
      </section>

      {sameDay ? (
        <section className="card-flat stack stack-sm" aria-labelledby="same-day-title">
          <h2 id="same-day-title">{sameDay.name}</h2>
          <p className="muted">
            An automated screening with a signed record, available any time
            {sameDay.priceCents !== null ? (
              <>
                {" "}
                for <Money cents={sameDay.priceCents} />
              </>
            ) : null}
            . It is not a clinician examination, leave certification or work excuse.
          </p>
          <p>
            <Link href="/services/same-day-mental-health-assessment">About the {sameDay.name}</Link>
          </p>
        </section>
      ) : null}

      <section className="stack" aria-labelledby="types-title">
        <div className="stack stack-sm">
          <h2 id="types-title">Types of leave documentation</h2>
          <p className="lede">
            Completed only if the clinician finds it clinically supported. They decide what, if
            anything, fits.
          </p>
        </div>
        <div className="grid g3">
          {LEAVE_TYPES.map((t) => (
            <div key={t.name} className="feature">
              <span className={`bubble${t.bubble}`}>
                <Icon name="calendar" size={24} />
              </span>
              <h3>{t.name}</h3>
              <p>{t.body}</p>
            </div>
          ))}
        </div>
      </section>

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
