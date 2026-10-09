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
| Ops → Admin → Waitlist | Where to get licensed next: waitlist sign-ups and unserved screenings by state, sorted by their sum; "Email N people that we now serve <State>" once a state is active | Built; admin and clinical director; counts only, never addresses |
| PageSpeed Insights | Core Web Vitals on the live site | None |

"Unserved demand" counts completed screenings stopped by the `STATE_NOT_ACTIVE` or `APPOINTMENT_STATE_NOT_ACTIVE` rule,
by appointment state. People stopped that way see a waitlist form on their result page (email and state only; the state
is preselected from their answers and can be changed; no screening answer is stored with it), as on `/availability`.

When a state becomes active, the Waitlist page sends each waiting address one email (subject "LeaveBridge Health is now
available in <State>", a link to `/start?entry=waitlist`, and a note that it is the only one), then deletes those rows.
What remains is `waitlist_notices` (state, count, sender, date) and one `waitlist.notified` audit event with the state
and count. Addresses never appear in the page, logs, URLs, analytics or audit metadata.

## Link conventions

- Campaign links: `utm_source`, `utm_medium`, `utm_campaign` (lowercase, hyphens), for example
  `?utm_source=psychology-today&utm_medium=directory&utm_campaign=profile`.
- Screening CTAs carry `?entry=` naming where the button sits (`home-hero`, `pricing`, `guide-<slug>`, `state-<slug>`,
  `header`, `footer`, `availability`), or `waitlist` for the link in the "we now serve your state" email.
- Never put health information, names or emails in any URL.
