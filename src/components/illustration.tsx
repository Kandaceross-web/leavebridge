import Image from "next/image";
import type { ReactNode } from "react";

/*
 * Original flat illustrations for the public site, served from public/illustrations/ (self-hosted SVG, no third-party
 * requests, allowed by the static export's img-src 'self'). The people are abstract, not likenesses of real people.
 */
const ART = {
  hero: [560, 460],
  services: [480, 360],
  employers: [480, 360],
  therapists: [480, 360],
  pricing: [480, 360],
  privacy: [480, 360],
  location: [480, 360],
  "next-step": [480, 300],
  "steps/1-check": [160, 160],
  "steps/2-account": [160, 160],
  "steps/3-pay": [160, 160],
  "steps/4-intake": [160, 160],
  "steps/5-review": [160, 160],
  "steps/6-decision": [160, 160],
  "steps/7-deliver": [160, 160],
} as const;

export type ArtName = keyof typeof ART;

/** An illustration. Pass alt="" when the image only decorates text that already says the same thing. */
export function Illustration({
  name,
  alt,
  className,
  preload,
}: {
  name: ArtName;
  alt: string;
  className?: string;
  preload?: boolean;
}) {
  const [width, height] = ART[name];
  return (
    <Image
      src={`/illustrations/${name}.svg`}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      preload={preload}
      loading={preload ? undefined : "lazy"}
    />
  );
}

/** Page header for marketing pages: short headline and one-line lede. Text only in the "Maison" design. */
export function SiteHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-hero">
      <div className="page-hero-text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {children}
      </div>
    </header>
  );
}
