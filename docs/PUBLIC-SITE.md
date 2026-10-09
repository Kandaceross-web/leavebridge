# Public site before launch (Cloudflare Pages)

Approved by the owner on 2026-10-09: the public pages go live at www.leavebridgehealth.com on Cloudflare Pages before the
patient app launches. The portal and everything that can touch patient data stay off until the release check passes.

## What is published

`public-site/` is a static copy of the marketing pages, made by `npm run build && npm run public:export`
(`scripts/export-public-site.ts`). It is committed so Cloudflare Pages can serve it without building anything.

- Every page from the sitemap (home, services, pricing, how it works, employers, for therapists, FAQ, guides, Mississippi
  and Tennessee, crisis, legal pages) plus `/opening-soon`.
- An "Opening soon" banner on every page. Buttons that lead into the app ("Check if we can help", "Sign in") go to
  `/opening-soon`. The contact, employer, therapist and waitlist forms are replaced by "This form opens at launch".
- No framework JavaScript, cookies, analytics or forms. The only script is the FMLA basics check, which runs in the browser
  and sends nothing. `_headers` sets a strict CSP (`script-src 'self'`, `connect-src 'none'`, `form-action 'none'`).
- Search engines are told not to index it (`noindex`, robots.txt disallows everything) until LEG-05 and LEG-17 are closed
  in OPEN-DECISIONS. Re-run the export after they close and it becomes indexable.

Because nothing on the public site handles patient data, Cloudflare's proxy (orange cloud) is fine for www. The app host
(app.leavebridgehealth.com) must stay DNS only, as DEPLOYMENT.md says.

## Updating it

After changing public pages or content: `npm run build && npm run public:export`, check the diff in `public-site/`,
commit and push to `main`. Cloudflare Pages deploys the new copy on its own.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Repository | Kandaceross-web/leavebridge |
| Production branch | `main` |
| Framework preset | None |
| Build command | (empty) |
| Build output directory | `public-site` |
| Custom domain | `www.leavebridgehealth.com` |

## At launch

When the app goes live, decide whether www stays on Cloudflare Pages (forms then post to the app host) or moves to AWS with
the app (DEPLOYMENT.md, "Domain and DNS"). Until then, the apex `leavebridgehealth.com` should redirect to www with a
Cloudflare redirect rule.
