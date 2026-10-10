# Luxury redesign: three homepage concepts (preview stage)

Status 2026-10-10: previews only. Nothing in `src/` or `public-site/` changed; production (main → Cloudflare Pages) untouched.
Rollback point: commit `fd69b11` on main (live site as of 2026-10-10).

Rebuild: `node design/luxury-concepts/build.mjs --shots` (needs `npm ci`; writes concept-*.html and screenshots/).
Shared copy lives in `content.mjs`, so all three concepts carry identical facts.

## What exists today (summary)
- Next.js 16 App Router, React 19, TypeScript, Drizzle + Postgres 16 with row-level security, Vitest, Playwright + axe.
- Route groups: `(site)` public pages, `(auth)` sign-in/sign-up/MFA and screening (`/start`), `portal/` patient, `ops/` staff console.
- Styling: one global stylesheet (`src/app/globals.css`) plus CSS modules; fonts via @fontsource; shared UI in `src/components/ui.tsx`.
- Workflow: screening → account, ID and location check → Stripe payment → intake (history, PHQ-9/GAD-7, uploads, save and resume)
  → clinician review and 30-min video visit when needed → determination → signed documents in portal, patient controls sharing.
- Prices (`src/config/catalog.ts`): $279.99 assessment, $119.99 recertification, $9.99 follow-up form; $29.99 same-day screening built but not launched.
- Public site is a static export (`public-site/`) with no forms, cookies or analytics.

## Proposed frontend changes after a pick
Replace the tokens and type in `globals.css`, rebuild header/footer/wordmark, buttons, service cards, process steps, FAQ,
clinician profile, dashboard panels and status chips in the chosen style, then apply them to public pages and the patient journey.
No changes to scoring, clinical rules, auth, payments, refunds or document permissions.

## Concepts
- **A, Editorial Private Care**: Cormorant Garamond + Inter. One tall 4:5 photograph with a champagne offset frame; menu-style price list
  with dotted leaders; hairlines instead of boxes. Journey: read, trust, then act.
- **B, Contemporary Concierge**: Libre Baskerville + Source Sans 3. Hero photo with an assessment summary panel (service, format, clinician,
  fee, next step); sage trust band with line icons; numbered timeline; three price cards. Journey: see the offer and act in the first screen.
- **C, Boutique Healthcare**: DM Serif Display + Jost. Wide immersive photo with an ivory panel set into it; each step told as a photo
  "chapter"; one framed price card with gold double rules. Journey: feel reassured, then read the price.

Recommendation: B. Price, clinician and next step are all visible above the fold on desktop, and it carries over most naturally
to the patient portal (panels, steps, status).

## Needed from the owner
- Professional photo (1200 × 1500 px) and biography; license numbers.
- Confirm display name "Kandace S. Ross, LPC, NCC" (records say Kandace Ross, LPC; LPC-MHSP in Tennessee).
- Editorial photos: licensed stock or commissioned (preview uses labeled placeholders; this environment cannot reach stock sites).
- Confirm the $9.99 follow-up form meaning (catalog marks it OWNER_DECISION_REQUIRED).
- An accessibility statement page does not exist yet (footer link is a placeholder).
- support@leavebridgehealth.com mailbox is not set up yet.
