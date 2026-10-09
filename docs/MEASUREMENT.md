# Measurement

How LeaveBridge measures where patients come from without putting health information into analytics or advertising
systems. The plan for using these numbers is in `docs/research/growth-plan.md`.

## Rules

- No third-party advertising pixels or tags anywhere. The source scan in `npm run security:check` fails the release if a
  known tracking host appears in the code.
- Optional privacy-focused analytics (`SITE_ANALYTICS_SRC`) loads on marketing pages only, never on `/start`, the portal or
  ops. It needs LEG-14 sign-off before it is turned on.
- Attribution is first-party: the `lb_attr` cookie (90 days, httpOnly) stores the channel, source, campaign, landing path,
  referrer host and the name of any ad network click ID (never its value). It is copied onto the screening, then the case,
  and onto contact messages. Set `ATTRIBUTION_COOKIE_DOMAIN` to the parent domain when the site and app use split hosts.
- Ad conversion upload is not built (OWN-22).

## Tools

| Tool | What it answers | Setup |
| --- | --- | --- |
| Google Search Console | Which searches show the site, position, clicks | Verify domain, submit `/sitemap.xml` |
| Bing Webmaster Tools | Same for Bing and the engines it powers | Import from Search Console |
| Ops → Admin → Acquisition | Screenings, accounts, payments, completed assessments by channel, landing page, CTA entry or search term; unserved demand by state | Built; admin only; counts under 5 shown as "<5"; emergency screenings excluded |
| PageSpeed Insights | Core Web Vitals on the live site | None |

## Link conventions

- Campaign links: `utm_source`, `utm_medium`, `utm_campaign` (lowercase, hyphens), for example
  `?utm_source=psychology-today&utm_medium=directory&utm_campaign=profile`.
- Screening CTAs carry `?entry=` naming where the button sits (`home-hero`, `pricing`, `guide-<slug>`, `state-<slug>`,
  `header`, `footer`).
- Never put health information, names or emails in any URL.
