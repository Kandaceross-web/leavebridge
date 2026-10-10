# Luxury homepage design previews

Three standalone homepage concepts for the LeaveBridge Health redesign, built 2026-10-10 for owner review.
Nothing here is wired into the app, the `public-site/` export or production. The rollback point is the branch
`rollback/pre-luxury-redesign-2026-10-10` (main at `fd69b11`).

| File | |
| --- | --- |
| `index.html` | Comparison page and recommendation |
| `a.html`, `b.html`, `c.html` | Concept A (Editorial Private Care), B (Contemporary Concierge), C (Boutique Healthcare) |
| `content.py` | The single source of homepage copy, shared by all three concepts |
| `build.py` | Renders the three pages: `python3 design-previews/build.py` |
| `img/` | Optimized WebP photography (800 and 1600 px) |
| `screenshots/` | Desktop (1440 px) and mobile (390 px) captures, hero and full page |

Open `design-previews/index.html` in a browser. Fonts load from Google Fonts in the previews only; the
implementation will self-host them with `@fontsource` like the current fonts, because the app's CSP allows no
third-party origins.

## Architecture summary (what the redesign must preserve)

- **Stack:** one Next.js 16 App Router app (React 19, TypeScript strict), PostgreSQL 16 with row-level security,
  Drizzle. Plain CSS (`src/app/globals.css` + CSS modules); fonts via `@fontsource`. Layers: `src/domain` (pure rules),
  `src/config` (seed catalog, screening, intake), `src/server/services` (all reads and writes, audited),
  `src/server/providers` (Stripe, S3, SES/SNS, Chime, AI off).
- **Surfaces:** public site `(site)`, screening and auth `(auth)` (`/start/*`, sign-in, MFA, step-up),
  patient portal `/portal`, operations console `/ops`. Split hosts in production (www and app).
- **Patient workflow:** anonymous screening → account → ID and location → service → consents → payment → intake →
  PHQ-9/GAD-7 → uploads → clinician review → video visit when the clinician requires it → independent determination →
  signed documents → portal delivery → close-out. Same-day automated screening has its own flow and verifiable records.
- **Public site today:** static export in `public-site/`, served by Cloudflare Pages from `main`, `noindex`, with an
  "Opening soon" banner. Any push to `main` that changes `public-site/` goes live.
- **Frontend changes proposed after a concept is chosen:** replace the tokens and type in `globals.css`, rebuild
  `components/nav.tsx`, `ui.tsx` and `forms.tsx` as the reusable set (buttons, cards, steps, FAQ, clinician profile,
  status, dashboard panels), restyle `(site)` pages then `(auth)` and `/portal`. No changes to services, scoring,
  consents, payments, permissions or the case state machine.

## Facts used and what still needs the owner

Verified in the repository: prices ($279.99, $119.99, $9.99) in `src/config/catalog.ts`; Mississippi and Tennessee
only; Kandace Ross, LPC, NCC (OPEN-DECISIONS OWN-01); refund rules (pricing page); support email and hours; crisis lines.

Flagged, not invented:
- Clinician photograph, biography, experience and license numbers (STR-01 board verification).
- Display name: records say "Kandace Ross"; the brief says "Kandace S. Ross". Previews use the records.
- The $9.99 follow-up form meaning is still marked "confirm with owner" (OWN-05).
- Refund policy is labelled "pending legal review" on the live site.
- The Same-Day Mental Health Assessment ($29.99) is enabled and on the live services and pricing pages but is not in
  the brief; it is left off these homepages until the owner decides (OWN-30, LEG-30).
- Session length: the catalog says 30 minutes (CLN-11, 2026-10-09) while OPEN-DECISIONS says 50 minutes.
- No accessibility statement page exists yet.

## Photography (all Pexels License: free commercial use, no attribution required)

| File | Source |
| --- | --- |
| `a-hero` | https://www.pexels.com/photo/8374469/ |
| `b-hero` | https://www.pexels.com/photo/7005397/ |
| `c-hero` | https://www.pexels.com/photo/7275312/ (Dziana Hasanbekava) |
| `c-window` | https://www.pexels.com/photo/4816338/ (Kalz Michael), toned warm sepia |
| `c-detail` | https://www.pexels.com/photo/36511421/ |
| `c-laptop` | https://www.pexels.com/photo/4474047/ |

Pexels license: https://www.pexels.com/license/ . The license does not allow implying the people endorse the
practice, so every page states the photographs are illustrative and do not depict patients or clinicians.
