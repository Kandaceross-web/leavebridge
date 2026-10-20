import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Markdown, ReviewTag } from "@/components/ui";
import { CredentialCards, LoopVideo, Photo, SectionHead, ServiceCard } from "@/components/site";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, servicesLd } from "@/server/web/structured-data";
import { activeStates, enabledServices, publishedFaq, sameDayService, siteSettings } from "@/server/web/public";
import {
  HOME_CREDIBILITY,
  HOME_FAQ,
  HOME_FINAL,
  HOME_HERO,
  HOME_SERVICES_INTRO,
  HOME_STEPS,
  HOME_WHY,
  SERVICE_CARD_EXCUSE,
  SERVICE_CARD_FMLA,
} from "@/config/home";

// Owner spec V1 (2026-10-10), Parts 4, 5, 10, 11, 12 and 15. Copy lives in src/config/home.ts; prices come from the catalog.

export const metadata: Metadata = {
  title: { absolute: "LeaveBridge Health | Online Mental Health Evaluations" },
  description:
    "Explore confidential online mental health evaluations for work, school, and medical leave documentation. Convenient access and transparent pricing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LeaveBridge Health | Online Mental Health Evaluations",
    description:
      "Explore confidential online mental health evaluations for work, school, and medical leave documentation. Convenient access and transparent pricing.",
  },
};

export default async function HomePage() {
  const [{ brand }, states, services, sameDay, faqEntries] = await Promise.all([
    siteSettings(),
    activeStates(),
    enabledServices(),
    sameDayService(),
    publishedFaq(),
  ]);
  const faq = HOME_FAQ.keys.flatMap((k) => faqEntries.filter((e) => e.key === k));
  const leave = services.find((s) => s.slug === "mental-health-leave-assessment") ?? services[0];
  return (
    <>
      <JsonLd data={[organizationLd(brand.name, states), ...servicesLd(services, states)]} />
      <section className="hero2" aria-labelledby="hero-title">
        <div className="container hero2-grid">
          <div className="hero2-text">
            <h1 id="hero-title">{HOME_HERO.title}</h1>
            {HOME_HERO.body.map((p, i) => (
              <p key={p} className={i === 0 ? "lede" : "hero2-tagline"}>
                {p}
              </p>
            ))}
            <div className="btn-row">
              <ButtonLink href="#services">{HOME_HERO.primary}</ButtonLink>
              <Link href="#how-it-works" className="text-link">
                {HOME_HERO.secondary} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="hero2-photo">
            <LoopVideo name="hero-smile" />
          </div>
        </div>
      </section>

      <section id="services" className="section tone-sage" aria-labelledby="services-title">
        <div className="container">
          <SectionHead id="services-title" title={HOME_SERVICES_INTRO.title} />
          <div className="svc-grid">
            <ServiceCard
              id="card-excuse"
              accent="warm"
              copy={SERVICE_CARD_EXCUSE}
              photo="card-stretch"
              priceCents={sameDay?.priceCents ?? null}
            />
            <ServiceCard
              id="card-fmla"
              accent="green"
              copy={SERVICE_CARD_FMLA}
              photo="card-breathe"
              priceCents={leave?.priceCents ?? null}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section tone-sun" aria-labelledby="how-title">
        <div className="container editorial">
          <div className="editorial-photo">
            <Photo name="split-smile-man" sizes="(max-width: 860px) 100vw, 480px" />
          </div>
          <div className="editorial-text">
            <SectionHead id="how-title" title={HOME_STEPS.title}>
              <p className="lede">{HOME_STEPS.body}</p>
            </SectionHead>
            <ol className="steps-list">
              {HOME_STEPS.steps.map(([title, body], i) => (
                <li key={title}>
                  <span className="num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>
                      <span className="visually-hidden">Step {i + 1}: </span>
                      {title}
                    </h3>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section tone-blush" aria-labelledby="why-title">
        <div className="container editorial editorial-reverse">
          <div className="editorial-photo">
            <Photo name="split-smile-window" sizes="(max-width: 860px) 100vw, 480px" />
          </div>
          <div className="editorial-text">
            <SectionHead id="why-title" title={HOME_WHY.title}>
              <p className="lede">{HOME_WHY.body}</p>
            </SectionHead>
            <ul className="quiet-list">
              {HOME_WHY.points.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section cred-section" aria-labelledby="creds-title">
        <div className="container">
          <SectionHead id="creds-title" title={HOME_CREDIBILITY.title}>
            <p className="lede">{HOME_CREDIBILITY.body}</p>
          </SectionHead>
          <CredentialCards />
        </div>
      </section>

      {faq.length ? (
        <section className="section tone-sage" aria-labelledby="home-faq-title">
          <div className="container faq-grid">
            <div className="intro">
              <h2 id="home-faq-title">{HOME_FAQ.title}</h2>
              <p>
                <Link href="/faq">{HOME_FAQ.more}</Link>
              </p>
            </div>
            <div className="faq">
              {faq.map((e) => (
                <details key={e.id}>
                  <summary>{e.title}</summary>
                  <div className="answer">
                    <Markdown source={e.bodyMd} />
                    {e.reviewTag ? (
                      <p>
                        <ReviewTag tag={e.reviewTag} />
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="final-band final-photo" aria-labelledby="next-title">
        <LoopVideo name="band-bridge" className="final-bg" />
        <div className="container final-inner">
          <h2 id="next-title">{HOME_FINAL.title}</h2>
          <ButtonLink href="#services">{HOME_FINAL.cta}</ButtonLink>
        </div>
      </section>
    </>
  );
}
