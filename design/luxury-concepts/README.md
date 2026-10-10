# Luxury redesign: three homepage concepts (preview stage)

Status 2026-10-10 (revised the same day for the owner's updated brief: less personal focus, no founder section, headshot or identity-based imagery; credentials kept in a discreet Clinical Credentials section; new "The experience" section). Previews only. Nothing in `src/` or `public-site/` changed; production (main → Cloudflare Pages) untouched.
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

## Concepts (reworked 2026-10-10 after the owner's reference sites)
References: Clinique La Prairie (primary), Lanserhof (simplicity), SHA (service presentation). The reference sites can't be
opened in a browser from this environment, so they were studied as page structure (navigation, section order, how services
and calls to action are presented), not as rendered visuals. No logos, wording, photos, code or claims were copied.
Shared across all three: short two-part headings with one italic phrase, one clear primary action, published fees.

- **A, Maison (after Clinique La Prairie)**: Cormorant Garamond + Inter. One full-bleed architectural key visual with the headline
  set on it, then a booking-style bar (service, format, fee, Begin Your Assessment); menu-style price list; quiet hairlines.
- **B, Concierge (after SHA)**: Libre Baskerville + Source Sans 3. Hero with an assessment summary panel; service cards with
  category tags and filter tabs (All, Assessment, After your assessment); closing band with Begin and Contact actions.
- **C, Quiet Clinic (after Lanserhof)**: DM Serif Display + Jost. A wide image, then a two-column statement (headline left,
  copy, actions and price right); process as three image cards with one line each and details on demand; plain price columns.

Recommendation: A. It follows the primary reference most closely, and the booking bar keeps the service, price and next step
visible directly under the key visual.

## Needed from the owner
- License numbers received 2026-10-10: MS 2581, TN 7581 (a photo is optional and not part of the design).
- Confirm display name "Kandace S. Ross, LPC, NCC" (records say Kandace Ross, LPC; LPC-MHSP in Tennessee).
- Editorial photos: licensed stock or commissioned interiors and architectural details, with no person as the focal point
  (preview uses labeled placeholders; this environment cannot reach stock sites).
- Confirm the $9.99 follow-up form meaning (catalog marks it OWNER_DECISION_REQUIRED).
- An accessibility statement page does not exist yet (footer link is a placeholder).
- support@leavebridgehealth.com mailbox is not set up yet.
