# Website Corrections, Spec V1: Change Log and Report

Date: 2026-10-10. Branch: `claude/project-thread-itwjwl` (staging only). **Not deployed to www.**

Rollback point: `main` at `e8b39cb` (the live site). Nothing in this change touches `main`; to discard it, delete the branch.

Screenshots (iPhone 390px and desktop 1440px, fictional data): `/mnt/project-files/leavebridge/design/spec-v1/screenshots/`.

## A. Pages changed

| Page | Change |
| --- | --- |
| `/` Homepage | Rebuilt: new hero, two service cards, three steps, "Care That Respects Your Time", credentials, final call to action |
| `/work-school-excuses` | **New** service page (Part 6). Replaces `/services/same-day-mental-health-assessment`, which now redirects here (301) |
| `/fmla-evaluations` | **New** service page (Part 7) |
| `/services` | Retitled "Our Services"; compact excuse card (Part 8); "Explore Your Leave Options" (Part 9). $119.99 and $9.99 still listed |
| `/how-it-works` | Three-step summary on top; the detailed 7-step leave flow kept below |
| `/faq` | 20 questions in the spec's order, in two sections; new "Evaluation Requirements" section |
| `/pricing` | Link updated to the new excuse page |
| Header and footer (all public pages) | New navigation, "Get Started" button, compact mobile header, four-column footer |
| Excuse checkout (portal) | Title, price, supporting text, clinician-review and processing-time notes, button text |
| Leave checkout (portal) | Title, price, supporting text, button text |
| Emails | Four templates rewritten (Part 17); one new "assessment completed" email |

### Files modified

- `src/app/globals.css`: colors, type scale, spacing, buttons, header, new homepage and service-page styles
- `src/app/(site)/layout.tsx`: navigation, header buttons, mobile menu, footer
- `src/app/(site)/page.tsx`: homepage
- `src/app/(site)/work-school-excuses/page.tsx`: new
- `src/app/(site)/fmla-evaluations/page.tsx`: new
- `src/app/(site)/services/page.tsx`, `how-it-works/page.tsx`, `faq/page.tsx`, `pricing/page.tsx`
- `src/app/(site)/services/same-day-mental-health-assessment/page.tsx`: deleted (redirected)
- `src/components/site.tsx`: new (bridge illustration, service card, credentials list, section heading)
- `src/config/home.ts`: homepage copy (owner's wording)
- `src/config/catalog.ts`: FAQ content and email templates
- `src/domain/notifications/templates.ts`, `src/server/services/cases.ts`: new `assessment_completed` email on case submission
- `src/app/portal/screening/[id]/pay/page.tsx`, `src/app/portal/cases/[id]/checkout/page.tsx`: checkout copy
- `src/app/sitemap.ts`, `next.config.ts`, `scripts/export-public-site.ts`: new pages in the sitemap, redirect, Cloudflare `_redirects`
- `tests/e2e/public.spec.ts`, `tests/e2e/same-day.spec.ts`: updated for the new copy and pages
- `public-site/`: regenerated static export

No database migration. No change to scoring, clinical criteria, approval rules, refund rules, prices or identity checks.

## B. Exact copy changes

Copy from the spec was used verbatim, except where flagged in section E. Homepage copy is in `src/config/home.ts`; service-page copy is in each page file.

Where the spec asked for facts it didn't provide, the text states what the system actually does:
- "What You Receive" on the excuse page.
- Clinician review and processing time on the excuse checkout.
- The FAQ answers.

## C. Visual changes

- Palette kept: ivory, espresso, forest green and champagne. Added a darker forest for the final band.
- Headings: 40 to 60px on the homepage hero, 32 to 44px for sections, 25 to 28px for cards. Body text is 17px on desktop.
- Buttons: 50px tall on mobile with a full-width primary action.
- Header: the logo is 185px wide, and the header is 76px tall on mobile. The menu icon has a 44px tap target.
- Two service cards with equal weight, with the price, a short benefit line, five inclusions, one button and a disclosure.
- No founder photo. The hero uses an abstract bridge line drawing, which is hidden on small phones.

## D. Functional changes

- A 301 redirect sends `/services/same-day-mental-health-assessment` to `/work-school-excuses`. It is set in both the app and the Cloudflare `_redirects` file.
- The new pages are added to the XML sitemap.
- Each new page has a canonical URL, a unique title and description, and Open Graph tags (Part 18).
- New email `assessment_completed`: it is sent when a patient submits a leave case, replacing the generic "update" email at that point.
- Checkout button text is now "Continue to Secure Payment".
- No analytics were added (see E7).

## E. Items requiring owner approval

1. **"Work & School" wording.** The letter the clinician signs covers work absences only. No school documentation exists. Either the site says "Work" only, or a school version of the letter is built. (Launch-blocking for school.)
2. **"Evaluation" for the $29.99 service.** The questionnaires are scored by software. A clinician reviews only the letter request (and any safety hold). The spec rules say not to present automated screening as an individualized evaluation. The service page explains this split, but the card and checkout titles say "Evaluation".
3. **Workplace accommodations.** The site now names accommodations (footer link, leave options). There is no accommodation document type; the clinician can only address it on an employer form the patient uploads.
4. **"Tell Us About Your Absence… the date of your absence."** Absence dates are asked when the patient requests the letter, after the screening, not at intake.
5. **Service names in the catalog.** Checkout summaries, receipts and the Good Faith Estimate still use "Same-Day Mental Health Assessment" and "Mental Health Leave Assessment". Renaming them changes those documents.
6. **$119.99 recertification and $9.99 follow-up form.** The spec's homepage cards leave these out. They are unchanged on Services and Pricing.
7. **Analytics (Part 19).** Event tracking would be new infrastructure, and the spec requires approval for that. Nothing was added. The site has only a first-party attribution cookie and server-side counts.
8. **Credential wording.** The spec's Tennessee title leaves out "Approved Supervisor"; the owner-confirmed version was kept.
9. **FAQ answers.** Answers that depend on open decisions carry review tags, which are visible on staging only:
   - turnaround
   - school documentation
   - additional states
   - clinical criteria
10. **"Clinical Disclosures"** in the footer links to the existing Telehealth Disclosures page.
11. **"Patient Sign In"** was added to the desktop header and footer, beyond the spec's link lists.
12. **"Doctor's excuse."** Still pending. The site says "work excuse letter" because the clinician is an LPC-S, not a physician.

## F. Testing results (actually run, 2026-10-10)

- `npm run lint`: pass. `npm run typecheck`: pass.
- `npm test`: 170 of 170 unit and integration tests pass.
- `npm run build`: pass. `npm run public:export`: 31 pages exported, with the `_redirects` file written.
- `npm run test:e2e`: 104 of 104 browser tests pass at 360px and 1280px. This covers:
  - accessibility (axe), one H1 per page and no sideways scrolling on every public page, including the two new ones
  - the redirect
  - the full $29.99 flow end to end
  - the leave checkout
- Sideways scrolling was also checked on home, both service pages, services, how-it-works, FAQ, pricing and the excuse checkout at 320, 375, 390, 430, 768, 1024 and 1440px. There was no overflow.
- **Not tested:**
  - real email delivery (development outbox only)
  - real payment (Stripe is not connected)
  - a real iPhone (screenshots use a 390px browser viewport)
  - the live Cloudflare deployment of this branch

## G. Deployment status

**Not deployed.** The work is committed to `claude/project-thread-itwjwl` only. www.leavebridgehealth.com still serves `main` at `e8b39cb`. Merging to `main` publishes it, and that waits for the owner's approval.

## Part 20: Workflow answers (from the code)

1. **Does a clinician review the $29.99 service?** The questionnaires are scored automatically. A clinician reviews a screening only if a safety answer places it on hold. Each letter request is reviewed by a clinician individually, at no extra charge.
2. **Who approves a letter?** A clinician or clinical director. They must be signed in with two-step verification, re-verified within 5 minutes, assigned to the case and licensed in the patient's state. They also confirm an attestation.
3. **How long does it take?** The screening record is ready immediately. Safety holds are reviewed the next business day. No letter turnaround is promised. REQUIRES OWNER APPROVAL to state one.
4. **What is generated automatically?**
   - the screening record PDF
   - a proposed letter draft for the clinician
   - the Good Faith Estimate
5. **What needs a clinician signature?** Every letter and every leave-case document.
6. **What if the clinician declines?** The clinician must write a reason. The patient is notified and may be invited to book a full assessment.
7. **Refund on a declined letter?** The letter request is free, so there is nothing to refund. The $29.99 screening is not refunded once the record is issued.
8. **Past absences?** Yes, starting up to 14 days before the screening, for up to 31 days.
9. **States?** Mississippi and Tennessee only. Adding states REQUIRES OWNER APPROVAL.
10. **Age and scope?** Adults 18 and older only, checked twice. Letters cover work only; there is no school letter.
11. **Turnaround shown publicly?** Only "Most people can start their intake the same day." Anything more REQUIRES OWNER APPROVAL.
12. **Refunds?**
    - 100% before review starts, if the request is outside our scope, or in an emergency.
    - 0% for a no-show, a late cancellation or after a determination.
    - A held same-day screening is flagged for billing review. The final rule REQUIRES OWNER APPROVAL.
13. **Can documents be verified?** Yes, by a random LB- number, a QR code, a digitally signed PDF and a content hash. The production signing certificate is still to be set up.
14. **Can a letter be edited after issue?** No. Documents can't be changed; a clinician can revoke one. There is one letter per screening.
15. **What does $279.99 include?** The assessment and completion of the employer's form when the clinician finds it supported. Recertification ($119.99) and later forms ($9.99) are separate.
16. **Leave types?**
    - Supported: continuous, intermittent, reduced schedule, and the employer form.
    - Return-to-work is built but turned off.
    - There is no accommodation document type.
17. **Analytics?** No funnel tracking: a first-party attribution cookie, server-side counts and the audit log only. Adding tracking REQUIRES OWNER APPROVAL.
18. **Emails?** These are the templates in `src/config/catalog.ts`, updated to the Part 17 wording. They contain no clinical details. No "documentation approved" email exists; patients are told only that a document is available.
