import type { ReactNode } from "react";
import { ButtonLink, Icon, Money } from "@/components/ui";
import type { ServiceCardCopy } from "@/config/home";
import { PUBLIC_PROVIDER } from "@/config/provider";

/** Abstract bridge line art for the homepage hero (owner spec V1, Part 4). Decorative only. */
export function BridgeArt() {
  return (
    <svg className="bridge-art" viewBox="0 0 520 380" aria-hidden="true" focusable="false">
      <circle cx="380" cy="104" r="46" className="sun" />
      <path d="M20 250 C 140 92, 380 92, 500 250" className="arch" />
      <path d="M70 250 C 170 140, 350 140, 450 250" className="arch-2" />
      <path d="M8 250 H512" className="deck" />
      <path d="M130 172 V250 M190 140 V250 M260 128 V250 M330 140 V250 M390 172 V250" className="piers" />
      <path d="M30 292 C 120 282, 200 300, 280 290 S 440 282, 500 292" className="water" />
      <path d="M80 322 C 160 314, 240 330, 320 320 S 430 314, 470 322" className="water water-2" />
    </svg>
  );
}

/** One of the two homepage service cards (Part 5): equal weight, price, five details, full-width action. */
export function ServiceCard({ copy, priceCents, id }: { copy: ServiceCardCopy; priceCents: number | null; id: string }) {
  return (
    <article className="svc-card" aria-labelledby={id}>
      <h3 id={id}>{copy.title}</h3>
      <p className="svc-price">{priceCents !== null ? <Money cents={priceCents} /> : "—"}</p>
      <p className="svc-benefit">{copy.benefit}</p>
      <p className="svc-summary">{copy.summary}</p>
      <div>
        <p className="svc-label">What’s Included</p>
        <ul className="svc-list">
          {copy.includes.map((x) => (
            <li key={x}>
              <Icon name="check" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
      <ButtonLink href={copy.href}>{copy.cta}</ButtonLink>
      <p className="svc-disclosure">{copy.disclosure}</p>
    </article>
  );
}

/** Restrained credentials list (Part 12). */
export function Credentials() {
  return (
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
  );
}

/** A simple titled section header used across the marketing pages. */
export function SectionHead({ eyebrow, title, children, id }: { eyebrow?: string; title: string; children?: ReactNode; id: string }) {
  return (
    <div className="section-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  );
}
