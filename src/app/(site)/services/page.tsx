import Link from "next/link";
import type { Metadata } from "next";
import { Badge, Banner, ButtonLink, Icon, Money, PageHead } from "@/components/ui";
import { allServices, enabledServices, sameDayService } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";

export const metadata: Metadata = {
  title: "FMLA and leave services",
  description:
    "The mental-health leave services currently offered, their price, the types of leave documentation a clinician can complete when clinically supported, and what is not yet offered.",
};

const LEAVE_TYPES = [
  {
    name: "Continuous leave",
    body: "Time away from work for a single, unbroken period, such as several consecutive weeks.",
  },
  {
    name: "Intermittent leave",
    body: "Time off in separate blocks as symptoms or treatment require, such as occasional days or partial days.",
  },
  {
    name: "Reduced schedule",
    body: "Working fewer hours per day or fewer days per week for a period of time.",
  },
];

export default async function ServicesPage() {
  const [enabled, all, sameDay] = await Promise.all([enabledServices(), allServices(), sameDayService()]);
  const later = all.filter((s) => !s.enabled);
  return (
    <div className="container page stack stack-xl">
      <PageHead
        eyebrow="FMLA / Leave Services"
        title="Leave services"
        lede="Independent clinical assessments for adults whose mental-health symptoms may be affecting their ability to work."
      />

      <section className="stack" aria-labelledby="offered-title">
        <h2 id="offered-title">Currently offered</h2>
        {enabled.length ? (
          <div className="grid g2">
            {enabled.map((s) => (
              <article key={s.id} className="svc">
                <h3 className="mt-0">{s.name}</h3>
                <p className="price">
                  {s.priceCents !== null ? <Money cents={s.priceCents} /> : "—"}
                  <small>self-pay</small>
                </p>
                <p className="muted">{s.summary}</p>
                <p className="small">{s.description}</p>
                <div className="btn-row">
                  <ButtonLink href={appHref("/start?entry=services")}>
                    Check if we can help
                  </ButtonLink>
                  <ButtonLink href="/pricing" variant="quiet">
                    What&rsquo;s included
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

      <section className="card-quiet stack" aria-labelledby="types-title">
        <h2 id="types-title">Types of leave documentation</h2>
        <p className="muted">
          When the clinician determines it is clinically supported, they can complete documentation
          for one of these arrangements, as appropriate to your situation. The clinician decides
          what, if anything, is supported.
        </p>
        <div className="grid g3">
          {LEAVE_TYPES.map((t) => (
            <div key={t.name} className="card-flat stack stack-sm">
              <h3>{t.name}</h3>
              <p className="small muted">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid g2" aria-label="Documentation and employer requirements">
        <div className="stack">
          <h2>What can be completed</h2>
          <ul className="list-check">
            {[
              "Your employer's or leave administrator's medical certification form, when you upload it",
              "A clinician letter for continuous leave, intermittent leave or a reduced schedule",
              "A letter explaining the clinician's determination",
            ].map((t) => (
              <li key={t}>
                <Icon name="check" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Documentation is completed only when the clinician finds it clinically supported. It is
            not completed automatically, and the outcome may be that no documentation is supported.
          </p>
        </div>
        <div className="stack">
          <h2>Check with HR first</h2>
          <p className="muted">
            Employers and leave administrators decide which provider types they accept for medical
            certification, and whether you are eligible for FMLA or other leave. Before you start,
            ask your HR team or leave administrator:
          </p>
          <ul className="list-check">
            {[
              "Whether they accept certification from a licensed mental-health clinician via telehealth",
              "Which form they need and when it is due",
              "Whether you are eligible for the leave you are requesting",
            ].map((t) => (
              <li key={t}>
                <Icon name="info" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Banner tone="info" icon="info">
            We do not decide FMLA eligibility or approve leave. Those decisions belong to your
            employer or leave administrator.
          </Banner>
        </div>
      </section>

      {later.length ? (
        <section className="stack" aria-labelledby="later-title">
          <h2 id="later-title">Not currently offered</h2>
          <p className="muted">These services may be offered later. We cannot provide them yet.</p>
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
        Have a question about a service? <Link href="/faq">Read common questions</Link> or{" "}
        <Link href="/contact">contact us</Link>.
      </p>
    </div>
  );
}
