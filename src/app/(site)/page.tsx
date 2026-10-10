import Link from "next/link";
import type { Metadata } from "next";
import { Banner, ButtonLink, Money } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, servicesLd } from "@/server/web/structured-data";
import { activeStates, enabledServices, isProduction, sameDayService, siteSettings } from "@/server/web/public";
import { appHref } from "@/server/web/app-link";
import {
  HOME_EXPERIENCE,
  HOME_FAQ,
  HOME_HERO,
  HOME_SAME_DAY,
  HOME_SERVICE_COPY,
  HOME_STEPS,
  HOME_TRUST,
  HOME_UNDERSTAND,
} from "@/config/home";
import { PUBLIC_PROVIDER } from "@/config/provider";

// "Maison" homepage (owner choice, 2026-10-10). Copy lives in src/config/home.ts; prices come from the live catalog.
// It describes the existing workflow and never promises an outcome. Claims about who may certify FMLA leave and
// what employers see are LEGAL_REVIEW_REQUIRED.

export const metadata: Metadata = {
  title: { absolute: "LeaveBridge Health · Mental health assessments and leave documentation support" },
  description:
    "Professional mental health assessments and leave documentation support, thoughtfully delivered online by a licensed professional counselor. Published self-pay fees, no subscription.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [{ brand, refundPolicy }, states, services, sameDay] = await Promise.all([
    siteSettings(),
    activeStates(),
    enabledServices(),
    sameDayService(),
  ]);
  const primary = services[0];
  const price = primary?.priceCents ?? null;
  const stateNames = states.map((s) => s.name).join(" and ");
  const priceText = price !== null ? `$${(price / 100).toFixed(2)}` : "the published fee";
  const faq: [string, string][] = [...HOME_FAQ, ["What is your refund policy?", refundPolicy.summary]];
  return (
    <>
      <JsonLd data={[organizationLd(brand.name, states), ...servicesLd(services, states)]} />
      <section className="kv-hero" aria-labelledby="hero-title">
        <div className="kv-art" aria-hidden="true">
          <span className="light" />
          <span className="arch" />
        </div>
        <div className="kv-text">
          <div className="container">
            <p className="eyebrow">{HOME_HERO.eyebrow}</p>
            <h1 id="hero-title">
              Your Wellbeing Deserves <em>Exceptional</em> Care.
            </h1>
            <p className="sub">{HOME_HERO.sub}</p>
            <div className="btn-row">
              <Link href={appHref("/start?entry=home-hero")} className="btn btn-light">
                {HOME_HERO.primary}
              </Link>
              <Link href="#services" className="btn btn-outline-light">
                {HOME_HERO.secondary}
              </Link>
            </div>
            <p className="note-line">{HOME_HERO.note}</p>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="bookbar" role="group" aria-label="Assessment at a glance">
          <dl>
            <dt>Service</dt>
            <dd>{primary?.name ?? "Mental Health Leave Assessment"}</dd>
          </dl>
          <dl>
            <dt>Format</dt>
            <dd>Online clinical assessment</dd>
          </dl>
          <dl>
            <dt>Fee</dt>
            <dd className="price-val">{price !== null ? <Money cents={price} /> : "—"}</dd>
          </dl>
          <ButtonLink href={appHref("/start?entry=home-bookbar")}>{HOME_HERO.primary}</ButtonLink>
        </div>

        <div className="trust-row">
          {HOME_TRUST.map(([title, body]) => (
            <div key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="section" aria-labelledby="understand-title">
        <div className="container split">
          <div className="stack stack-lg">
            <p className="eyebrow">The assessment</p>
            <h2 id="understand-title">
              Thoughtful care, <em>clearly</em> explained.
            </h2>
          </div>
          <div>
            {HOME_UNDERSTAND.body.map((p, i) => (
              <p key={p} className={i === 0 ? "intro-lead" : "mt-2"}>
                {p}
              </p>
            ))}
            <div className="fit">
              <div>
                <h3>Who it is for</h3>
                <ul>
                  <li>Adults 18 and older</li>
                  <li>Anxiety, depression, burnout or other symptoms affecting work</li>
                  <li>
                    Located in {stateNames || "a state we serve"} during care.{" "}
                    <Link href="/availability">Where we serve</Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3>What it is not</h3>
                <ul>
                  {HOME_UNDERSTAND.notFor.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="disclose stack stack-sm">
              {!isProduction ? (
                <Banner tone="warn" icon="alert">
                  <b>Pending legal review.</b> These statements about employers and FMLA rules are not final until
                  reviewed.
                </Banner>
              ) : null}
              <p>{HOME_UNDERSTAND.qualification}</p>
              <p>
                FMLA rules limit which providers may certify leave, and some employers accept only certain license
                types. Please ask HR or your leave administrator whether they accept a licensed professional counselor
                before you pay. <Link href="/faq">Learn more</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="experience-title">
        <div className="container split">
          <div className="stack stack-lg">
            <p className="eyebrow">The experience</p>
            <h2 id="experience-title">
              Quality and <em>convenience</em>, together.
            </h2>
          </div>
          <dl className="exp-list">
            {HOME_EXPERIENCE.map(([title, body]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title">
              Three stages, <em>one</em> private portal.
            </h2>
          </div>
          <ol className="steps-ed">
            {HOME_STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{s.title}</h3>
                <p>{s.lede}</p>
                <ul>
                  {s.details.map((d) => (
                    <li key={d}>{d.replace("{price}", priceText)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="mt-4">
            <Link href="/how-it-works">See every step in detail</Link>
          </p>
        </div>
      </section>

      <section id="services" className="section section-sun" aria-labelledby="services-title">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Services and fees</p>
            <h2 id="services-title">
              Transparent, <em>published</em> pricing.
            </h2>
            <p className="lede">Self-pay. No subscription, and we do not bill insurance.</p>
          </div>
          <div className="menu-list">
            {services.map((s) => {
              const copy = HOME_SERVICE_COPY[s.slug];
              const href =
                copy?.href === "portal" ? appHref("/sign-in") : appHref("/start?entry=home-services");
              return (
                <article key={s.slug} className="menu-item" aria-labelledby={`svc-${s.slug}`}>
                  <div className="menu-head">
                    <h3 id={`svc-${s.slug}`}>{s.name}</h3>
                    <span className="dots" aria-hidden="true" />
                    {s.priceCents !== null ? (
                      <span className="amt">
                        <Money cents={s.priceCents} />
                      </span>
                    ) : null}
                    {copy ? <span className="unit">{copy.unit}</span> : null}
                  </div>
                  <div className="act">
                    <p className="for">{copy?.forWho ?? s.summary}</p>
                    <ButtonLink href={href} variant={copy?.href === "portal" ? "secondary" : "primary"}>
                      {copy?.cta ?? "Learn more"}
                    </ButtonLink>
                  </div>
                  {copy ? (
                    <dl>
                      <div>
                        <dt>Includes</dt>
                        <dd>
                          <ul>
                            {copy.includes.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                      <div>
                        <dt>You will need</dt>
                        <dd>{copy.prereq.replace("{states}", stateNames || "a state we serve")}</dd>
                      </div>
                      <div>
                        <dt>Please note</dt>
                        <dd>{copy.scope}</dd>
                      </div>
                    </dl>
                  ) : null}
                </article>
              );
            })}
            {sameDay ? (
              <article className="menu-item" aria-labelledby="svc-same-day">
                <div className="menu-head">
                  <h3 id="svc-same-day">{sameDay.name}</h3>
                  <span className="dots" aria-hidden="true" />
                  {sameDay.priceCents !== null ? (
                    <span className="amt">
                      <Money cents={sameDay.priceCents} />
                    </span>
                  ) : null}
                  <span className="unit">{HOME_SAME_DAY.unit}</span>
                </div>
                <div className="act">
                  <p className="for">{HOME_SAME_DAY.forWho}</p>
                  <ButtonLink href="/services/same-day-mental-health-assessment" variant="secondary">
                    {HOME_SAME_DAY.cta}
                  </ButtonLink>
                </div>
                <dl>
                  <div>
                    <dt>Includes</dt>
                    <dd>
                      <ul>
                        {HOME_SAME_DAY.includes.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>You will need</dt>
                    <dd>{HOME_SAME_DAY.prereq.replace("{states}", stateNames || "a state we serve")}</dd>
                  </div>
                  <div>
                    <dt>Please note</dt>
                    <dd>{HOME_SAME_DAY.scope}</dd>
                  </div>
                </dl>
              </article>
            ) : null}
          </div>
          <p className="small muted mt-3">
            Payment does not guarantee a diagnosis, certification, documentation or approval of leave.{" "}
            <Link href="/pricing">Pricing and refunds</Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="creds-title">
        <div className="container split">
          <div className="stack stack-lg">
            <p className="eyebrow">Clinical credentials</p>
            <h2 id="creds-title">
              Licensed, <em>accountable</em> care.
            </h2>
            <p className="muted">
              Assessments are provided by a licensed professional counselor, not a physician.{" "}
              <Link href="/about">About our practice</Link>
            </p>
          </div>
          <ul className="creds">
            <li>
              <span>Clinician</span>
              <span>
                {PUBLIC_PROVIDER.name}, {PUBLIC_PROVIDER.postNominals}
              </span>
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
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="faq-title">
        <div className="container faq-grid">
          <div className="intro">
            <p className="eyebrow">Questions</p>
            <h2 id="faq-title">
              Before you <em>begin</em>.
            </h2>
            <p>
              <Link href="/faq">All frequently asked questions</Link>
            </p>
          </div>
          <div className="faq">
            {faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container final" aria-labelledby="next-title">
        <p className="eyebrow">Your next step</p>
        <h2 id="next-title">
          Begin with a <em>brief</em> screening.
        </h2>
        <p>About two minutes. No account or payment needed.</p>
        <ButtonLink href={appHref("/start?entry=home-footer")}>{HOME_HERO.primary}</ButtonLink>
      </section>
    </>
  );
}
