import "server-only";
import { env } from "../env";

/**
 * schema.org builders for public pages. They describe what the service is and costs, and nothing
 * more: no aggregate ratings, reviews, medical claims, or guarantees.
 */

const origin = () => env.SITE_ORIGIN.replace(/\/$/, "");

export function organizationLd(brandName: string, states: { name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${origin()}/#organization`,
    name: brandName,
    url: `${origin()}/`,
    logo: `${origin()}/icon.svg`,
    medicalSpecialty: "Psychiatric",
    description: "Independent mental-health leave assessments by licensed clinicians, by secure telehealth. Self-pay.",
    areaServed: states.map((s) => ({ "@type": "State", name: s.name })),
    paymentAccepted: "Credit card",
  };
}

export function servicesLd(services: { slug: string; name: string; summary: string; priceCents: number | null }[], states: { name: string }[]) {
  return services
    .filter((s) => s.priceCents !== null)
    .map((s) => ({
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name,
      description: s.summary,
      serviceType: "Mental health leave assessment",
      provider: { "@id": `${origin()}/#organization` },
      areaServed: states.map((st) => ({ "@type": "State", name: st.name })),
      offers: { "@type": "Offer", price: ((s.priceCents ?? 0) / 100).toFixed(2), priceCurrency: "USD", url: `${origin()}/pricing` },
    }));
}

export function faqLd(entries: { title: string; bodyMd: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({ "@type": "Question", name: e.title, acceptedAnswer: { "@type": "Answer", text: e.bodyMd } })),
  };
}

export function articleLd(input: { title: string; description: string; path: string; updatedAt: Date; brandName: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: `${origin()}${input.path}`,
    dateModified: input.updatedAt.toISOString(),
    publisher: { "@id": `${origin()}/#organization`, name: input.brandName },
  };
}
