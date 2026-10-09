# Compliance decisions

What the software does to support compliance, and what it deliberately leaves to the owner, counsel and clinical
leadership. Nothing in this repository is legal or clinical advice, and having a control in code is not the same as
being compliant. Every unresolved item is tracked in [OPEN-DECISIONS.md](OPEN-DECISIONS.md); rows marked
"Blocks production: Yes" fail `npm run release:check`.

## How unreviewed content is handled

* Legal and clinical text (consents, legal pages, FAQ answers, crisis content, notification templates, screening rules,
  questionnaires, document templates) lives in the database or in typed config with a **review tag**
  (`LEGAL_REVIEW_REQUIRED`, `CLINICAL_REVIEW_REQUIRED`, `STATE_RULE_REQUIRED`, `OWNER_DECISION_REQUIRED`,
  `SECURITY_REVIEW_REQUIRED`).
* Tagged content shows a visible tag in the admin console. It works in development so the journey can be exercised.
* Clearing a tag is an audited admin action; the release check fails while any published or enabled item still carries
  one.
* Placeholder legal pages are labelled as placeholders. The build does not invent terms, privacy language, consent
  wording, clinical criteria, state rules or retention periods.

## Decisions the code enforces regardless of configuration

| Area | Behaviour |
| --- | --- |
| Clinical independence | Only a licensed clinician with an active license or compact privilege for the patient's attested location can record a determination. Both outcomes (supported / not supported) are presented without a default. Rationale and findings are required. |
| Payment ≠ outcome | Copy and consents say payment covers an assessment, not a result. No status label says approved, qualified or certified. Refunds follow the configured policy, not the determination. |
| Emergencies | An emergency screening outcome shows crisis resources and stops. It never creates a case or a payment. Later safety flags place the case on `safety_hold`. |
| AI | Off by default. When on, drafts are labelled, cite their sources, cannot be signed and cannot change status. |
| Location | The patient attests their physical location at intake and again when joining a video visit; a mismatch blocks the visit. |
| Licensure | Clinicians only see and act on cases in jurisdictions they are authorized for; activating a state needs a recorded compliance review. |
| Employer services | Employers get educational content and referral links only. No employer account can see patient data. Release to anyone happens only through a patient-signed release authorization. |
| Minimum necessary | Non-clinical staff see administrative fields only; identity documents are visible only during verification. |
| Fixture data | Fictional, flagged `is_fixture`; production refuses to start with dev providers, and the release check fails while fixture users exist. |

## Configurable defaults that need a decision (summary)

Price and what it covers (OWN-05), refund and cancellation amounts (OWN-07, LEG-09), launch clinicians and active
states (OWN-01, OWN-02, STR-01), session length and when a video visit is needed (CLN-11, CLN-13), screening and safety
rules (CLN-01, CLN-02, CLN-03), validated measures (CLN-05), retention periods (LEG-10, STR-05), consent texts
(LEG-04, STR-04), HIPAA status and privacy notices (LEG-03, LEG-15), identity verification (OWN-04, LEG-11), video vendor
(OWN-15, SEC-08), AI vendor and limits (LEG-06, SEC-04, CLN-06), and email/SMS consent (LEG-13).

## Good Faith Estimate (LEG-08)

Owner decision 2026-10-09: self-pay patients get a written Good Faith Estimate (45 CFR 149.610) before they pay.

* **When.** The checkout step issues the estimate once the payment gate is open and shows it above the payment button.
  `startCheckout` will not create a payment without one, and refuses if the estimate the patient was shown is no longer
  current. A new estimate is issued only when the service or the amount changes; otherwise the existing one is shown.
* **Content** (`src/domain/payments/good-faith-estimate.ts`): patient name and date of birth; the service's name and
  description, and the visit date if one is booked; one line item for the service being bought at its current self-pay
  price; the diagnosis-code statement; provider name (brand setting), NPI, TIN and where services are furnished
  (telehealth to the patient's state); and the four disclaimers, including the $400 dispute threshold and
  https://www.cms.gov/nosurprises.
* **Owner data.** NPI, TIN, service (CPT) code, the diagnosis-code statement (CLN-12: no diagnosis field), the
  disclaimer wording and the dispute link live in the `goodFaithEstimate` setting, tagged `OWNER_DECISION_REQUIRED`.
  NPI, TIN and service code start empty and read "Not yet provided" outside production. `npm run release:check` fails
  while any of the three is empty, even with the tag cleared, and production refuses to issue an estimate without them.
* **Record.** Each estimate is a row in `good_faith_estimates` (append-only trigger, RLS like payments) holding the exact
  content encrypted, the amount, the issue time and a SHA-256 of the canonical content. Issuing and PDF downloads are
  audited (`estimate.issued`, `estimate.downloaded`). Retention follows the clinical record setting (7 years by
  default, above the rule's 6).
* **Copies.** `/portal/cases/[id]/estimate` is a print-friendly page (print or save as PDF), and `/api/estimates/[id]`
  returns a PDF rendered from the stored content. Staff see every estimate on the case's Payments tab. Only ids appear
  in URLs; the payment processor still receives only the amount and the neutral description.

## Out of scope

Tennessee DMH services, general therapy, IV hydration, wellness shots, med spa, primary care, urgent care, medication
management and Call-On-Doc are not built. Phase-2 virtual care has architecture notes only ([ROADMAP.md](ROADMAP.md)).
