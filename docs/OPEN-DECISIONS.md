# Open decisions

Everything here needs a decision before real patients use the system.

**Who signs off (owner decision, 2026-10-08).** Zxryeni is the clinician and has waived outside legal and security
reviewers: "i don't need an attorney i am the clinician and i don't need a security reviewer". So every Legal (LEG),
Clinical (CLN), State rule (STR) and Security (SEC) row is now closed by the owner's own sign-off, answered one question at
a time in plain language (see `docs/OWNER-SIGNOFF.md`). A sign-off records the owner's decision and accepted risk; it is not
a legal opinion or a security audit, and nothing in this repository says otherwise. In place of an outside security
reviewer, `npm run security:check` runs an automated review on every release check.

Three technical rows still need **evidence that the work was done**, not only an acknowledgement: SEC-09 (signed AWS
Business Associate Addendum and HIPAA-eligible services only), SEC-10 (a completed backup restore drill) and SEC-14
(a penetration test of sign-in, MFA, sessions and access control). Production secrets are also still enforced by the
environment check.
The build makes a **safe, configurable default** for each so work can continue, and `npm run release:check` refuses a
production release while any row marked **Blocks production: Yes** is not **Closed**.

IDs match the Sprint 0 review register (`/mnt/project-files/leavebridge/08-review-register.md`). Rows added during the
rebuild are marked *(new)*. Nothing in this repository is legal advice or a compliance determination; code existing for a
control does not mean the control has been reviewed.

How to close a row: record the decision (who, when, what), make the configuration change in the admin console or code,
clear the matching review tag, and change Status to `Closed (YYYY-MM-DD, who)`. A row closed by the owner reads
`Closed (YYYY-MM-DD, Zxryeni, owner sign-off; outside review waived)`. A technical row reads
`Closed (YYYY-MM-DD, who, evidence: where the proof is)`; the release check refuses a technical row closed without evidence.

## Owner decisions

| ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
| --- | --- | --- | --- | --- | --- | --- |
| OWN-01 | Launch clinician(s): license types, home states, compacts | P0 | Yes | **Decided 2026-10-08 (owner):** Kandace Ross, LPC, NCC, licensed in Mississippi and Tennessee. Enter her real license numbers in Admin → Clinicians after verification against the MS and TN boards (STR-01). Dev seed mirrors the setup with fictional clinicians only. | Admin → Clinicians & licenses | Closed (2026-10-08, Zxryeni) |
| OWN-02 | Initial jurisdictions | P1 | Yes | **Owner direction 2026-10-08:** launch in MS and TN; three Counseling Compact expansion states are being researched in a separate thread. Each state still needs its activation checklist and compliance review. Dev fixture activates MS and TN. | Admin → States (activation checklist) | Open (MS, TN chosen; expansion pending) |
| OWN-03 | Coverage and backup clinician; target clinician count | P1 | Yes | Any authorized clinician in the state can be assigned by a director; no auto-assignment | Ops → case → assign | Open |
| OWN-04 | Identity verification requirement and method | P1 | Yes | Required: photo ID upload reviewed by staff; patient may continue while pending; vendor adapter seam exists | `services.requires_identity_verification`, `features.identityVerification`, `IDV_PROVIDER` | Open |
| OWN-05 | Price and exactly what it includes | P0 | Yes | **Owner decision 2026-10-08:** $279.99 covers the assessment and its paperwork only. Recertification visit $119.99. Follow-up forms $9.99 each. *Assumption to confirm:* "$9.99 a visit" means $9.99 per follow-up form request, separate from the $119.99 recertification visit. | Admin → Services & pricing; Business rules → pricing | Open (confirm $9.99 meaning) |
| OWN-06 | When payment is taken | P1 | Yes | After service selection, identity and financial consents, before intake (newest instruction) | `src/domain/cases/checklist.ts` gate order | Open |
| OWN-07 | Cancellation, late-cancel, no-show and refund amounts | P1 | Yes | 100% before intake submitted; placeholders elsewhere; refunds above policy need a second approver | Business rules → refundPolicy | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| OWN-08 | Support and clinical hours; response commitments | P1 | Yes | Placeholder hours and `example.invalid` contact details | Business rules → brand | Open |
| OWN-09 | Public turnaround statement | P1 | No | Non-committal message, no time promise | Business rules → turnaround | Open |
| OWN-10 | Recertification, extension, return-to-work: in or out of V1 | P1 | No | **Owner priced recertification ($119.99, visit) and follow-up forms ($9.99) on 2026-10-08**, so both are enabled. Extension and return-to-work stay disabled. Recertification and follow-up forms currently start as a new case; a one-click "order from my delivered case" flow is on the roadmap. | Admin → Services | Open (extension and return-to-work) |
| OWN-11 | Clinician contact with employers; fee | P2 | No | Not offered; external delivery disabled | `features.externalDelivery` | Open |
| OWN-12 | Secure messaging: who answers, how fast, limits | P1 | Yes | Enabled; administrative and clinical threads; "not monitored in real time" notice | `features.messaging` | Open |
| OWN-13 | Hosting approach | P0 | Yes | **Decided 2026-10-08 (owner): AWS** (ECS Fargate, RDS, S3+KMS, SES/SNS). Requires an AWS BAA before PHI (SEC-09). | `docs/DEPLOYMENT.md`, `infra/` | Closed (2026-10-08, Zxryeni) |
| OWN-14 | RPO/RTO | P1 | Yes | Proposed RPO 5 min (PITR), RTO 4 h | `docs/DEPLOYMENT.md` | Open |
| OWN-15 | Video vendor and BAAs | P1 | Yes | Stub provider: no video; join shows "not configured" | `VIDEO_PROVIDER`, `src/server/providers/video.ts` | Open |
| OWN-16 | Domains for site and app | P0 | Yes | **Decided 2026-10-08 (owner): split domains.** **Domain bought 2026-10-09:** `leavebridgehealth.com` at Cloudflare Registrar, DNS at Cloudflare. Public site `https://www.leavebridgehealth.com`, portals `https://app.leavebridgehealth.com` (`HOST_MODE=split`). Records and the DNS-only rule are in `docs/DEPLOYMENT.md`. | `SITE_ORIGIN`, `APP_ORIGIN`, `ATTRIBUTION_COOKIE_DOMAIN`, `src/proxy.ts` | Closed (2026-10-09, Zxryeni) |
| OWN-17 | Support/Billing/Compliance roles at launch | P2 | No | All roles exist; admin can grant them | Admin → Staff & roles | Open |
| OWN-18 | Approve visual direction | P0 | No | Built to the Sprint 0 visual direction artifact **Revised 2026-10-09 (v0.2)** after owner feedback ("more therapy and happy bold but professional but welcoming"): Fraunces soft serif, lagoon teal, coral, sunshine; applied in `src/app/globals.css`; artifact https://claude.ai/artifact/9i1Af2LTEoGWh8XVfM35ut awaiting owner approval. | `src/app/globals.css` | Open |
| OWN-19 | Waitlist for inactive states | P2 | No | On (email + state only) | `features.waitlist` | Open |
| OWN-20 | Advertising platforms | P1 | Yes | None; optional analytics script allowed on marketing pages only, never in the app | `SITE_ANALYTICS_SRC` | Open |
| OWN-21 *(new)* | Self-service password reset by email | P1 | Yes | Not built; page directs to support | `src/app/(auth)/forgot-password` | Open |
| OWN-22 *(new)* | Ad platforms and conversion tracking | P1 | Yes | First-party attribution only (no ad pixels anywhere; nothing sent to ad platforms). Paid campaigns should tag links with UTM parameters. Uploading conversions to Google/Microsoft/Meta is not built. | `src/domain/attribution.ts`, Admin → Acquisition, `docs/MEASUREMENT.md` | Open |
| OWN-23 *(new)* | Which credential signs which form type | P0 | Yes | Site copy says forms are completed by a licensed mental-health clinician and tells people to check whether their employer, insurer or leave administrator accepts that provider type. Forum evidence shows some administrators refuse counselor or LMFT signatures (see research report). Tied to LEG-01. | Screening `provider_type_accepted`; FAQ | Open |
| OWN-24 *(new)* | What happens when an employer won't accept a completed form | P1 | Yes | Corrections and clarifications of our own forms at no charge; copy of assessment records if the employer requires a different provider type; refunds follow the refund policy, not the employer's decision. Shown in FAQ, checkout and the documents page | `src/config/catalog.ts` FAQ; portal documents page | Open |
| OWN-25 *(new)* | Lead channels: referral partners (therapists, EAPs, unions), no referral fees, optional screening follow-up email, guide email capture | P2 | No | Therapist page and basics check built; no referral payments; no email capture or abandonment follow-up | `docs/research/growth-plan.md` section 7 | Open |

## Legal

| ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
| --- | --- | --- | --- | --- | --- | --- |
| LEG-01 | Whether the launch clinician's license type is accepted as a "health care provider" for FMLA certification; effect on screening and copy | P0 | Yes | Screening asks whether the employer restricts provider types → NEEDS REVIEW; copy tells people to check with HR **Owner sign-off 2026-10-08:** relies on 29 CFR 825.125(b)(4) (any provider whose certification the employer or its group health plan accepts). That coverage depends on each employer, so the site, screening and checkout keep telling people to check with HR first, and employer rejection is handled per OWN-24. | Screening ruleset; FAQ | Closed (2026-10-08, Zxryeni, owner sign-off; outside review waived) |
| LEG-02 | Provider entity, corporate practice, who contracts, payment descriptor | P0 | Yes | Neutral descriptor "Professional assessment service" | `src/server/providers/payments.ts` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| LEG-03 | HIPAA covered-entity status; state health-privacy laws; NPP | P0 | Yes | Built as if HIPAA applies (encryption, RLS, audit, minimum necessary); NPP placeholder page | Legal pages; `docs/COMPLIANCE.md` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| LEG-04 | All consent documents | P1 | Yes | Placeholder text marked `[LEGAL REVIEW REQUIRED]`, versioned, hash-signed | Admin → Consents | Open |
| LEG-05 | Consumer-facing copy and status labels | P1 | Yes | Neutral labels; no outcome words; determinations shown as clinician message | `src/domain/cases/state-machine.ts`, site pages | Open |
| LEG-06 | AI drafting/OCR vendor agreements | P1 | Yes | `features.aiDrafting` and `formExtraction` off; Bedrock adapter only | Business rules → features | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| LEG-07 | Release authorization content; communication with employers | P1 | Yes | Patient-created releases recorded; external sending disabled | `features.externalDelivery`; release consent placeholder | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| LEG-08 | Good Faith Estimate obligations | P1 | Yes | Price shown before payment; no GFE document generated | Pricing page; checkout | Open (2026-10-09, Zxryeni chose to issue a written Good Faith Estimate before payment; build pending) |
| LEG-09 | Refund policy under consumer law; chargebacks | P1 | Yes | Placeholder policy, tagged | Business rules → refundPolicy | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| LEG-10 | Retention of screening data from people who never book | P1 | Yes | Answers purged after 30 days (`purgeExpiredScreenings` job) | Business rules → retention; `scripts/jobs.ts` | Open |
| LEG-11 | Identity verification permissibility and handling | P1 | Yes | ID images encrypted, staff-only, audited | Identity service | Open |
| LEG-12 | Payment processor data | P1 | Yes | Only an opaque payment id and neutral description sent | Payment provider | Open |
| LEG-13 | Email/SMS consent and content | P1 | Yes | Email "something is waiting" only; SMS off and opt-in | Templates; `features.smsNotifications` | Open |
| LEG-14 | Analytics, cookies, consent banner | P1 | Yes | No analytics, no third-party cookies; only essential cookies | `SITE_ANALYTICS_SRC` unset | Open |
| LEG-15 | Terms, privacy policy, NPP text | P1 | Yes | Placeholder pages, tagged | Admin → Content | Open |
| LEG-16 | E-signature validity; employer acceptance of e-signed forms | P1 | Yes | Typed-name consent with hash and auth evidence; clinician signature bound to content hash with step-up | Consents, signatures | Open |
| LEG-17 | FAQ content touching FMLA/ADA/state law | P1 | Yes | FAQ entries tagged LEGAL_REVIEW_REQUIRED where they touch law | Admin → Content | Open |
| LEG-18 | Records access and amendment process | P2 | No | Placeholder legal page; requests via support | Legal pages | Open |
| LEG-19 | Trademark clearance | P1 | Yes | Name and mark used as working brand | Brand setting | Open |
| LEG-20 | Breach notification and incident response | P1 | Yes | Audit log and alerts design only | `docs/SECURITY.md` | Open |

## Clinical

| ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
| --- | --- | --- | --- | --- | --- | --- |
| CLN-01 | Emergency workflow at every touchpoint | P0 | Yes | Screening EMERGENCY ends the flow with crisis resources and no account; intake/measure safety answers raise a safety event, mark the case urgent and show crisis resources; ops Safety queue with acknowledge/hold | Screening ruleset; intake; Ops → Safety | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| CLN-02 | Crisis content | P0 | Yes | 988 / 911 / nearest ER placeholder content Mississippi DMH helpline and Tennessee Statewide Crisis Line added site-wide 2026-10-09. | Business rules → crisis | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| CLN-03 | Screening questions and outcome rules | P0 | Yes | Conservative v1 ruleset, tagged | Admin → Screening & measures | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| CLN-04 | Intake template content | P1 | Yes | Intake v1, tagged | Questionnaires | Open |
| CLN-05 | Validated instruments, licensing, scoring | P2 | Yes | PHQ-9 and GAD-7 with published items/scoring; scores visible to clinicians only; can be disabled | Admin → Screening & measures | Open |
| CLN-06 | AI suggestion boundaries | P1 | Yes | Off; when on, only fields marked `aiAllowed`, cited, clinician must accept | `src/config/document-templates.ts` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| CLN-07 | Clinical messaging policy | P1 | Yes | Clinical thread visible to patient, assigned clinician and directors | Messaging | Open |
| CLN-08 | Sustainable turnaround | P1 | No | No promise published | Business rules → turnaround | Open |
| CLN-09 | Director role, supervision, reassignment | P1 | Yes | Directors see all clinical data and can reassign | Policy | Open |
| CLN-10 | Patient-facing determination messages | P1 | Yes | Clinician writes the patient message per case; no canned outcome text | Determination form | Open |
| CLN-11 | Session length and structure | P1 | Yes | 50 minutes for the assessment service | Admin → Services | Open |
| CLN-12 | Diagnosis within scope per license type | P0 | Yes | Templates have no diagnosis field; findings are free text | Document templates | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| CLN-13 | Telehealth suitability; in-session identity/location check | P1 | Yes | Location re-attested at join; canServe re-checked | Scheduling | Open |
| CLN-14 | Assessment note and documentation templates | P1 | Yes | Draft templates for continuous, intermittent, reduced schedule, RTW, summary letter, employer form | `src/config/document-templates.ts` | Open |

## State rules

| ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
| --- | --- | --- | --- | --- | --- | --- |
| STR-01 | Compact privilege verification and recognition | P0 | Yes | Privileges recorded manually with verifier and dates; never inferred Owner will enter verified MS and TN license numbers from the board lookups before launch; state activation already refuses a state with no verified authorization. | Admin → Clinicians | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| STR-02 | Credential expiring between booking and session | P1 | Yes | canServe evaluated on the appointment date at booking and again at join and signing | Scheduling; documents | Open |
| STR-03 | Patient location at time of service | P1 | Yes | Attested at verification and at every join; mismatch blocks join | Identity; scheduling | Open |
| STR-04 | State telehealth consent/disclosures | P1 | Yes | Per-state disclosure text field and per-state consent documents supported; none authored | Admin → States; Consents | Open |
| STR-05 | Retention periods | P1 | Yes | 7 years clinical and audit (placeholder) | Business rules → retention | Open |
| STR-06 | Mandatory reporting / duty to warn effects on consent | P1 | Yes | Not authored | Consents | Open |
| STR-07 | State paid-leave forms | P2 | No | Out of scope | — | Open |

## Security

| ID | Decision | Priority | Blocks production | Safe default in this build | Where it lives | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-01 | Authentication design and session lifetimes | P0 | Yes | In-app auth: scrypt, DB sessions, TOTP MFA required for staff, step-up 5 min, idle 15/30 min | Business rules → security; `src/server/auth` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| SEC-02 | Encryption and RLS review | P0 | Yes | AES-256-GCM field/file encryption with keyring; RLS on all PHI tables; runtime role is not owner | `drizzle/0001_security_controls.sql`, `src/server/crypto.ts` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| SEC-03 | Break-glass model | P1 | Yes | Time-boxed grant requested with reason, approved by another director/admin, audited | Admin → Access grants | Open |
| SEC-04 | AI vendor configuration | P1 | Yes | Bedrock adapter (no training by AWS terms; verify); off by default | `AI_PROVIDER` | Closed (2026-10-09, Zxryeni, owner sign-off; outside review waived) |
| SEC-05 | Payment data minimization | P1 | Yes | Hosted checkout; no card data touches the app | Payment provider | Open |
| SEC-06 | Upload pipeline | P1 | Yes | 15 MB, magic-byte type check, PDF structure check, EICAR test; ClamAV adapter for production | `src/server/providers/scan.ts` | Open |
| SEC-07 | Screening purge job | P1 | Yes | `npm run jobs -- purge-screenings` (schedule daily) | `scripts/jobs.ts` | Open |
| SEC-08 | Video vendor security review | P1 | Yes | No vendor | — | Open |
| SEC-09 | AWS account architecture / HIPAA-eligible services; signed AWS BAA *(evidence required)* | P0 | Yes | Terraform skeleton only. **2026-10-09 (owner):** AWS organization "Kandaceross-Team" created, advanced features on, BAA accepted on the management account. Evidence still needed: the AWS Artifact agreement record showing it is the organization-wide BAA (covering the workload accounts, not only the management account), and workloads limited to HIPAA-eligible services. | `infra/` | Open |
| SEC-10 | Backup, restore drill, DR *(evidence required)* | P1 | Yes | RDS PITR + snapshot plan documented | `docs/DEPLOYMENT.md` | Open |
| SEC-11 | Error monitoring PHI scrubbing | P1 | Yes | No third-party error monitoring; allow-list logger only | `src/server/logger.ts` | Open |
| SEC-12 | Logging allow-list review | P1 | Yes | Allow-list enforced in code | `src/server/logger.ts` | Open |
| SEC-13 | Audit log tamper resistance | P1 | Yes | Append-only triggers + hash chain + verify tool; Object Lock archive planned | `src/server/audit.ts` | Open |
| SEC-14 | Penetration test of sign-in, MFA, sessions and access control *(evidence required)* | P1 | Yes | Not done. Automated tools are acceptable; the result and fixes must be recorded. Built-in coverage today: E2E role-isolation tests and `npm run security:check` | — | Open |
| SEC-15 | Formal security risk assessment | P1 | Yes | Not done | — | Open |
| SEC-16 | Incident response plan | P1 | Yes | Not done | — | Open |
| SEC-17 *(new)* | Dev-only dependency advisories (eslint-config-next → braces; drizzle-kit → esbuild) | P2 | No | Production dependencies have 0 known vulnerabilities; dev tools only | `package.json` | Open |
| SEC-18 *(new)* | Row-level security for contact_messages, notifications, signatures and waitlist, which rely on service-layer checks today | P2 | No | Found by the automated review 2026-10-09; reported as a warning on every release check | `scripts/security-findings.ts` | Open |
