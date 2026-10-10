import type { Metadata } from "next";
import { ButtonLink, Icon } from "@/components/ui";
import { BridgeArt, Credentials, SectionHead, ServiceCard } from "@/components/site";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, servicesLd } from "@/server/web/structured-data";
import { activeStates, enabledServices, sameDayService, siteSettings } from "@/server/web/public";
import {
  HOME_CREDIBILITY,
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
  const [{ brand }, states, services, sameDay] = await Promise.all([siteSettings(), activeStates(), enabledServices(), sameDayService()]);
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
              <ButtonLink href="#how-it-works" variant="secondary">
                {HOME_HERO.secondary}
              </ButtonLink>
            </div>
            <ul className="trust-inline" aria-label="Why people choose us">
              {HOME_HERO.trust.map((t) => (
                <li key={t.label}>
                  <Icon name={t.icon} size={18} />
                  <span>{t.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="hero2-art">
            <BridgeArt />
          </div>
        </div>
      </section>

      <section id="services" className="section section-sun" aria-labelledby="services-title">
        <div className="container">
          <SectionHead id="services-title" title={HOME_SERVICES_INTRO.title}>
            <p className="lede">{HOME_SERVICES_INTRO.body}</p>
          </SectionHead>
          <div className="svc-grid">
            <ServiceCard id="card-excuse" copy={SERVICE_CARD_EXCUSE} priceCents={sameDay?.priceCents ?? null} />
            <ServiceCard id="card-fmla" copy={SERVICE_CARD_FMLA} priceCents={leave?.priceCents ?? null} />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section" aria-labelledby="how-title">
        <div className="container">
          <SectionHead id="how-title" title={HOME_STEPS.title}>
            <p className="lede">{HOME_STEPS.body}</p>
          </SectionHead>
          <ol className="steps2">
            {HOME_STEPS.steps.map(([title, body], i) => (
              <li key={title}>
                <span className="num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>
                  <span className="visually-hidden">Step {i + 1}: </span>
                  {title}
                </h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <ButtonLink href="#services">{HOME_STEPS.cta}</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section section-sun" aria-labelledby="why-title">
        <div className="container">
          <SectionHead id="why-title" title={HOME_WHY.title}>
            <p className="lede">{HOME_WHY.body}</p>
          </SectionHead>
          <div className="why-grid">
            {HOME_WHY.blocks.map(([title, body]) => (
              <div key={title} className="why-block">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="creds-title">
        <div className="container split">
          <div className="stack">
            <h2 id="creds-title">{HOME_CREDIBILITY.title}</h2>
            <p className="lede">{HOME_CREDIBILITY.body}</p>
          </div>
          <Credentials />
        </div>
      </section>

      <section className="final-band" aria-labelledby="next-title">
        <div className="container final-inner">
          <h2 id="next-title">Take the Next Step With Confidence.</h2>
          <ButtonLink href="#services">Get Started</ButtonLink>
        </div>
      </section>
    </>
  );
}
