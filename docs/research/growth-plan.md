# Growth plan: ranking and being chosen

Prepared 2026-10-09 in answer to the owner's question "how can you make my site pop number 1 everywhere in the world".
Labels: **OBSERVED** (seen directly), **SUPPORTED** (several sources agree), **INFERRED** (reasoned from evidence),
**HYPOTHESIS** (needs testing). Nothing here is legal advice; items touching advertising rules or professional ethics are
marked for the owner's sign-off.

## The honest answer first

- **Nobody can guarantee a #1 ranking.** Google and Bing decide rankings, change them constantly, and personalize them by
  location. Anyone who promises #1 is selling something. What we control: being the most useful, trustworthy result for the
  searches we can actually serve, and measuring whether it works.
- **"Everywhere in the world" would hurt you.** A licensed counselor can only see clients physically located in a state where
  they hold a license or compact privilege. Ranking in Ohio or California today would bring people you must turn away, and
  ads there would waste money. The target is: **top results for high-intent leave-paperwork searches in Tennessee and
  Mississippi**, then each new state the day a privilege is issued. The compact research (`compact-states.md`) recommends
  Ohio, Georgia and Minnesota: Tennessee went live in the Counseling Compact in September 2026, so a Tennessee home license
  can apply for privileges there now. Mississippi is not live yet.
- **Ranking is the smaller problem.** The research found that people choose (or regret) a service based on: a real clinician,
  a clear price with no surprise charges, someone answering the employer's follow-up questions, and forms the employer
  accepts. Being findable gets the click; those things get the booking and the word of mouth.

## 1. Technical foundation (built, needs a domain to go live)

Done in this build:
- Server-rendered pages, self-hosted fonts, no third-party scripts, no images in the hero: good for Core Web Vitals
  (INFERRED; measure after launch).
- Canonical URLs, Open Graph tags, sitemap with guides and state pages, robots rules that hide the portal and every
  non-production host.
- Structured data: MedicalBusiness, Service with Offer prices, FAQPage, Article. No ratings or reviews are emitted, because
  fabricated or self-served review markup violates Google's rules.
- Mobile layout tested at 360px, accessibility tested on every public page (WCAG 2.2 AA axe checks).

Still needed (owner actions):
1. **Buy the domain** (OWN-16). Nothing ranks until it exists. Prefer a short brand domain; keyword-stuffed domains carry no
   real advantage (SUPPORTED by Google's public statements).
2. **Google Search Console and Bing Webmaster Tools**: verify the domain, submit `/sitemap.xml`. Free; this is where you see
   which searches show you and at what position.
3. **Measure Core Web Vitals on the live site** with PageSpeed Insights; fix anything below "Good".

## 2. Google Business Profile: probably not eligible, don't fake it

Google's guidelines say online-only businesses are not eligible for a Business Profile; a profile needs a location where
you meet clients in person, or a service-area business that travels to customers (SUPPORTED by Google's published
guidelines). Virtual offices and mailbox addresses used only to get a listing violate those guidelines and get suspended.

- If Kandace already sees clients in person at a real office in MS or TN, that practice may list its own profile and mention
  telehealth leave assessments as a service. **Owner decision.**
- Otherwise skip it. The organization structured data and directory profiles (section 5) do the job a profile would.

## 3. Reviews: the rules are stricter for counselors

This is the area most likely to cause harm if copied from other industries.

- **ACA Code of Ethics C.3.b**: counselors who use testimonials do not solicit them from current clients, former clients, or
  anyone vulnerable to undue influence (SUPPORTED; applies to an LPC, NCC). Many state counseling boards adopt the ACA code.
  So **no review-request emails, no "rate us" screens, no incentives**.
- **FTC rule on fake reviews (effective October 2024)**: bans fake reviews, buying reviews, and incentives tied to positive
  sentiment (SUPPORTED).
- **HIPAA**: never reply to a review in a way that confirms the person was a client, even if they posted it themselves
  (SUPPORTED by HHS enforcement history). A safe reply: "We can't discuss anyone's care publicly. Please contact us at
  [support line] so we can help."

What to do instead (INFERRED):
- Let reviews arrive unsolicited on third-party sites; respond with the generic reply above.
- Earn trust with verifiable facts: license numbers linked to the MS and TN board lookups, the clinician's real name and
  photo, the flat price, the outcome-neutral refund rule, and a clear "what happens if your employer asks questions" promise.
  Competitors mostly hide these (research report, competitor gaps 1, 2, 6 and 8).

Owner sign-off needed: confirm "no review solicitation" as policy.

## 4. Content: answer what people actually search

Built this round: six guides and MS/TN pages, mapped to the strongest demand clusters. Next, in priority order (each needs
owner sign-off as a reviewed draft before publishing, and each must contain real, specific information, never a state name
swapped into national copy):

| Priority | Page | Why | Label |
| --- | --- | --- | --- |
| 1 | "What happens if your employer asks follow-up questions" | Unanswered employer clarifications are the category's top complaint; 29 CFR 825.307 allows them | SUPPORTED |
| 2 | "Short-term disability paperwork for mental health: what we can and can't complete" | Strong autocomplete demand; honest scope builds trust | OBSERVED demand; scope needs sign-off |
| 3 | "Is an online FMLA certification accepted?" | Comparison-stage searches; answers the "is this a scam" fear | OBSERVED |
| 4 | "How a mental health leave assessment works, step by step" (with the clinician as author) | "What to say to my doctor" searches; fear of not being believed | OBSERVED |
| 5 | "Working with a leave administrator (Sedgwick, Lincoln, etc.)" | Employer-specific searches outnumber state ones; never imply affiliation | HYPOTHESIS |
| 6 | Tennessee state employees: sick leave bank and certification | TN-specific, real rules | SUPPORTED; needs sign-off |
| 7 | One page per new state, only on the day a license or privilege is active | Avoids doorway pages | Policy |

Every guide should carry the clinician's byline and license (expertise signals matter for health topics: Google's quality
guidance treats health as "Your Money or Your Life"; SUPPORTED).

Do not target: "doctor's note template/free", "guaranteed FMLA approval", employer brand names in page titles.

## 5. Links and directories (earned, never bought)

Directories where an LPC can legitimately list (INFERRED fit; check each one's terms):
- **Psychology Today** therapist directory: list Kandace's MS and TN licenses, mention FMLA and leave assessments as a
  specialty, link to the site. Paid monthly listing; one of the most-visited mental-health directories.
- **TherapyDen** and similar free directories.
- **State associations**: Mississippi Counseling Association; Licensed Professional Counselors Association of Tennessee.
- **NBCC**: the NCC credential's public verification gives a trust link, not an SEO one.

Employer and HR outreach (HYPOTHESIS; test small):
- Offer a free, plain-language "Reading a mental-health FMLA certification" guide for HR teams, and pitch it to MS and TN
  SHRM chapters, chambers of commerce (Jackson, Memphis, Nashville, Knoxville, Chattanooga) and small-business
  associations. HR pages that link to it are the highest-quality links available to a new site.
- Local journalists: mental-health leave requests are rising (ComPsych reported roughly +300% 2019–2024; Littler's 2026
  employer survey). Offer Kandace as a quoted source through journalist-request services. Earned coverage brings links.

Never: buy links, join link networks, or publish guest posts on unrelated sites. These get sites penalized (SUPPORTED by
Google's spam policies).

## 6. Paid search, carefully

- Google Ads allows telehealth mental-health services, but **personalized advertising based on health conditions is
  prohibited**: no remarketing lists built from site visitors' health interest (SUPPORTED by Google's personalized
  advertising policy). Search ads on keywords are fine.
- Conversion tracking must stay HIPAA-safe (OWN-22): no Google or Meta pixel on screening or portal pages. Use the first-party
  acquisition report, or a server-side upload containing only an ad click and a conversion flag, never health data, and only
  after owner sign-off.
- Start with a small Tennessee/Mississippi-only budget on exact high-intent terms ("fmla paperwork for anxiety", "online fmla
  certification mental health", "fmla doctor near me") and measure cost per completed assessment before scaling. HYPOTHESIS:
  no cost data exists yet.

## 7. Lead channels

Every channel below keeps tracking pixels off screening, portal and clinical pages, and never sends health information to
an email, advertising or analytics tool.

### Built in this round

| Channel | What it is | Why it's safe | Label |
| --- | --- | --- | --- |
| **FMLA basics check** (`/resources/fmla-basics-check`) | Three questions about the job (employer size, months, hours), not health. Ends in "check if we can help" | Runs in the browser only; answers are never sent or saved (tested) | SUPPORTED demand ("fmla eligibility" and "how to get fmla" queries) |
| **For therapists and EAPs** (`/for-therapists`) | Referral page for therapists, group practices and EAPs whose clients need forms they don't complete. Inquiry form tagged `therapist-inquiry` in the acquisition report | Asks for no client details; no referral payments | SUPPORTED: "my therapist won't fill it out" was a top pain point |
| **Unions and EAPs** on the employer page | Added as audiences; organizations can get a referral link (`/r/<code>`) with its own landing headline, and the acquisition report counts it | Existing referral-link system; employer never sees who used it | INFERRED |
| **CTA entry labels** | Every "Check if we can help" button names its page, so the report shows which pages produce screenings | First-party only | Built |

### Recommended next (needs owner sign-off)

- **Therapist outreach list (HYPOTHESIS, cheapest high-yield):** email or call 20–30 group practices in Memphis, Nashville,
  Knoxville, Chattanooga and Jackson that don't complete leave forms, and offer them a referral link. Track by link.
- **EAPs and unions (HYPOTHESIS):** EAP counselors are short-term and often can't certify; union stewards field leave
  questions. Same referral-link offer.
- **Psychology Today profile** (section 5) works as a lead channel as well as a link.

### Not built, and why

- **Email capture for a guide.** An email address tied to "mental health leave guide" is sensitive. It would need its own
  consent, a mail provider under a BAA, and generic content only. The guides are already free and public, so a gate mostly
  adds friction. Revisit if traffic grows. **Owner decision (LEG-13/14).**
- **Follow-up for people who abandon screening.** Screening is anonymous until someone creates an account, which is the
  privacy promise. Following up would mean asking for an email first. A safe version: an optional "email me a link to
  continue" box on the result page, opt-in, with a message that says only "your LeaveBridge link". **Owner decision.**
- **Referral credits or fees.** The ACA Code of Ethics (A.10.b) bars counselors from giving or receiving commissions,
  rebates or other remuneration for referrals, and paying patients to recruit others means asking them to disclose they were
  clients. **Recommended: never.** The therapist page says so publicly.
- **Paid-search remarketing.** Prohibited for health conditions under Google's personalized advertising policy (section 6).

## 8. The measurement loop (monthly)

1. **Search Console**: queries, impressions, average position, click-through rate per page.
2. **Acquisition report** (Ops → Admin → Acquisition, built): screenings, accounts, payments and completed assessments by
   channel, landing page and CTA entry; small counts shown as "<5"; emergency screenings excluded.
3. **Unserved demand** (same report): people screening from states you don't serve yet. That is the evidence for which
   expansion state to activate first.
4. **Decide**: pages with impressions but few clicks get better titles; pages with clicks but few screenings get clearer
   copy; channels with screenings but no payments get a look at objections.
5. Record each change and its result so the next month starts from evidence.

## What the owner can do this week

1. Buy the domain.
2. Answer the remaining sign-off questions so the site can launch.
3. Create the Psychology Today profile (it can link to the site once live).
4. Confirm "no review solicitation" as policy.
5. Tell us whether there is an in-person office (decides the Business Profile question).
