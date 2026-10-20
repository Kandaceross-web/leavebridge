import type { ReactNode } from "react";
import { ButtonLink, Icon, Money } from "@/components/ui";
import type { ServiceCardCopy } from "@/config/home";
import { PUBLIC_PROVIDER } from "@/config/provider";

/**
 * Photographs in public/images/: stills from the Pexels footage licensed for the ad campaign (commercial use, no
 * attribution required; credits in docs/IMAGE-CREDITS.md). Each has a 640px "-sm" and a full-size "-lg" WebP.
 * Decorative by default (empty alt): they set the mood and carry no information the text does not. People shown are
 * models from stock footage, not clients or staff.
 */
const PHOTOS = {
  "hero-smile": [864, 1080],
  "card-stretch": [1920, 1080],
  "card-breathe": [1920, 1080],
  "split-smile-man": [864, 1080],
  "split-smile-window": [864, 1080],
  "band-bridge": [1920, 840],
  "service-excuse": [1440, 1080],
  "page-leave": [1440, 1080],
} as const;
export type PhotoName = keyof typeof PHOTOS;

export function Photo({
  name,
  sizes,
  className,
  eager = false,
}: {
  name: PhotoName;
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  const [w, h] = PHOTOS[name];
  return (
    // Plain <img>: the public site is a static export with no image optimizer behind it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={`/images/${name}-lg.webp`}
      srcSet={`/images/${name}-sm.webp 640w, /images/${name}-lg.webp ${w}w`}
      sizes={sizes}
      width={w}
      height={h}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

/** One of the two homepage service cards: photograph, title, price, benefit, three inclusions, action, disclosure. */
export function ServiceCard({
  copy,
  priceCents,
  id,
  photo,
  accent,
}: {
  copy: ServiceCardCopy;
  priceCents: number | null;
  id: string;
  photo: PhotoName;
  accent: "warm" | "green";
}) {
  return (
    <article className={`svc-card svc-${accent}`} aria-labelledby={id}>
      <Photo name={photo} className="svc-photo" sizes="(max-width: 860px) 100vw, 600px" />
      <div className="svc-body">
        <h3 id={id}>{copy.title}</h3>
        <p className="svc-price">{priceCents !== null ? <Money cents={priceCents} /> : "—"}</p>
        <p className="svc-benefit">{copy.benefit}</p>
        <ul className="svc-list" aria-label="What’s included">
          {copy.includes.map((x) => (
            <li key={x}>
              <Icon name="check" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
        <ButtonLink href={copy.href}>{copy.cta}</ButtonLink>
        <p className="svc-disclosure">{copy.disclosure}</p>
      </div>
    </article>
  );
}

/** Credential cards, licenses first then privileges: where services are authorized (owner's credentials redesign, 2026-10-10). */
export function CredentialCards() {
  return (
    <ul className="cred-cards">
      {PUBLIC_PROVIDER.licenses.map((l) => (
        <li key={l.state} className={`cred-card cred-${l.kind === "license" ? "license" : "privilege"}`}>
          <h3>{l.state}</h3>
          <p className="cred-lines">
            {l.card.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          {l.card.number ? <p className="cred-number">{l.card.number}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/** The full credential disclosure, with the Georgia privilege's basis and home state spelled out. */
export function CredentialDetail({ headingLevel = 3 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="cred-detail">
      <p className="cred-name">
        {PUBLIC_PROVIDER.name}, {PUBLIC_PROVIDER.postNominals}
      </p>
      <dl>
        {PUBLIC_PROVIDER.licenses.map((l) => (
          <div key={l.state}>
            <dt>
              <H>{l.state}</H>
            </dt>
            <dd>
              {l.detail.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
              {l.detail.homeState ? <span>Home State: {l.detail.homeState}</span> : null}
              <span className="cred-number">{l.detail.number}</span>
            </dd>
          </div>
        ))}
        <div>
          <dt>
            <H>National Certification</H>
          </dt>
          <dd>
            {PUBLIC_PROVIDER.certifications.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </dd>
        </div>
      </dl>
      <p className="cred-note">
        Services are provided by a licensed professional counselor, not a physician. Each license
        and privilege can be verified with the licensing board of the state that issued it.
      </p>
    </div>
  );
}

/** A simple titled section header used across the marketing pages. */
export function SectionHead({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  id: string;
}) {
  return (
    <div className="section-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  );
}
