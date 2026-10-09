Signed by the owner 2026-10-09 (version 1.0). Not legal advice.

# Security Risk Analysis (HIPAA Security Rule, 45 CFR 164.308(a)(1)(ii)(A))

**LeaveBridge Health** — telehealth FMLA mental-health leave assessments
**Owner and only clinician:** Kandace Ross, LPC, NCC (licensed in Mississippi and Tennessee)

> **Read this first.** This is a **draft prepared from the software build for the owner's review.** It is **not an independent assessment**, not a security review or audit, not a penetration test, and not legal advice. It does not say the practice or the software is HIPAA compliant. It describes what the code and the project documents show today and lists what only the owner can answer. The owner reviews each section, corrects anything that is wrong, fills in every **[OWNER TO ANSWER: ...]**, and signs it. Until then, row SEC-15 in `docs/OPEN-DECISIONS.md` stays open.

| | |
| --- | --- |
| Draft date | 2026-10-09 |
| Prepared from | The LeaveBridge repo at commit `f223d33` (read only; nothing was changed) |
| Real patient data used | None. The app has not been deployed and holds only fictional data (`README.md`, `docs/KNOWN-LIMITATIONS.md`). |
| Related rows | SEC-15 (this document), SEC-09, SEC-10, SEC-14, SEC-16, SEC-06, SEC-08, SEC-11, SEC-18, LEG-20, OWN-14 |

How to read the citations: a file path in `code style` points to the place in the repo the statement comes from. Where this draft draws a conclusion the files do not state outright, it says **(inferred)**.

---

## 1. Purpose and scope

**Purpose.** HIPAA's Security Rule asks a covered entity to make an accurate and thorough assessment of the risks to the confidentiality, integrity and availability of the electronic protected health information (ePHI) it holds (45 CFR 164.308(a)(1)(ii)(A)). The owner chose to operate as if HIPAA applies (LEG-03, owner sign-off 2026-10-09, `docs/OWNER-SIGNOFF.md` Q10) and asked for this risk analysis to be drafted from the build (Q45).

**In scope.**

- The LeaveBridge web app: public screening, patient portal, clinician/staff ("ops") console, and its scheduled jobs.
- The cloud services the app is built to use: AWS (ECS Fargate, RDS Postgres 16, S3 with KMS, Secrets Manager, CloudFront + WAF, SES email, SNS text messages, CloudWatch logs), Amazon Chime SDK video (being built), Amazon Bedrock AI (off), Stripe payments, Sentry error reports (off), and Cloudflare (DNS and the static public site).
- The owner's own devices, accounts, workspace and habits, which the code cannot see. These parts are questions for the owner (section 6).

**Out of scope.** Anything not built (`docs/COMPLIANCE.md`, "Out of scope"), and the content of legal and clinical documents (covered by the other drafts in this folder).

**Current state (important).** The app is **not deployed anywhere**, the Terraform has **never been applied**, and the release check refuses a production launch while blocking decisions are open (`docs/KNOWN-LIMITATIONS.md`, `infra/terraform/README.md`, `docs/DEPLOYMENT.md`). The public marketing site is live-ready on Cloudflare Pages and holds no patient data (`docs/PUBLIC-SITE.md`). Many ratings below describe the risk **at launch** if nothing else changes.

---

## 2. Method

1. **Inventory.** List every place ePHI is created, received, stored or sent (section 3), from the code, migrations, Terraform skeleton and docs.
2. **Threats and vulnerabilities.** For each place, ask what could go wrong: someone sees data they should not (confidentiality), data is changed or faked (integrity), or data is lost or unreachable (availability).
3. **Current controls.** Record what the build already does, citing the file.
4. **Likelihood and impact.** Rate each on a simple scale:
   - **Likelihood** — Low (unlikely in a year), Medium (could happen in a year), High (expected unless fixed).
   - **Impact** — Low (little harm; few or no records; easy to fix), Medium (some records exposed or a service down for a day or more), High (many records or sensitive mental-health content exposed, records lost, or a reportable breach).
5. **Risk level** from this table:

   | | Impact Low | Impact Medium | Impact High |
   | --- | --- | --- | --- |
   | **Likelihood High** | Medium | High | High |
   | **Likelihood Medium** | Low | Medium | High |
   | **Likelihood Low** | Low | Low | Medium |

6. **Planned action and owner.** For each risk, the next step and who does it. "Owner" means Kandace Ross. "Build" means work in the software, which the owner approves. All ratings are proposals; the owner may change them (see O-27).

---

## 3. ePHI inventory and data flow

What counts as ePHI here (from `docs/DATABASE.md`, `docs/SECURITY.md`): screening answers, intake answers, PHQ-9/GAD-7 responses and scores, uploaded employer forms and photo IDs, location attestations, video visit details, assessment and case notes, determinations, signed documents, secure messages, safety events, payments and refunds tied to a person, Good Faith Estimates (with name and date of birth), and account details (name, email, phone).

### 3.1 Data-flow table

| # | Where | What ePHI | Created / received / stored / sent | How the build protects it | Agreement (BAA) status | Sources |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | **Patient and staff browsers → app** (`app.leavebridgehealth.com`, CloudFront + WAF → ECS) | Everything a patient types or uploads; everything staff view | Received and sent | HTTPS with HSTS; strict content security policy with per-request nonce; `no-store` caching on app paths; screening and portal pages only on the app host; nothing clinical kept in browser storage; screening answers kept on the server, keyed by a hashed cookie | AWS BAA (see F2) | `src/proxy.ts`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md` |
| F2 | **Postgres database** (AWS RDS Postgres 16) | All structured records listed above | Stored | Free-text clinical answers, screening answers, notes, rationale and messages encrypted by the app (AES-256-GCM) before saving; disk encryption with KMS; forced TLS to the database; app runs as `lb_app`, which does not own tables and cannot bypass row-level security; row-level security on PHI tables; append-only triggers on audit log, status history, determinations, signatures, document versions, notes, payment events and Good Faith Estimates; 35-day automated backups with point-in-time recovery; deletion protection in production; statement logging limited to schema changes | AWS organization BAA accepted on the management account 2026-10-09; **evidence it covers the workload account is still open (SEC-09)** | `drizzle/0001_security_controls.sql`, `drizzle/0004_good_faith_estimates.sql`, `drizzle/0005_waitlist_notices.sql`, `src/server/crypto.ts`, `infra/terraform/data.tf`, `docs/DATABASE.md` |
| F3 | **File uploads and generated documents** (AWS S3) | Employer forms, photo IDs, signed documents | Received, stored, sent back to authorized users | 15 MB limit; file type checked by content; PDFs with scripts, embedded files or passwords refused; files held unreadable until checked; encrypted by the app before upload, plus S3 KMS encryption; bucket public access blocked; versioning on; random object names with no personal details; downloads only through `/api/files/[id]` after an authorization check and an audit event | AWS BAA (SEC-09) | `src/server/providers/storage.ts`, `src/server/providers/scan.ts`, `infra/terraform/data.tf`, `docs/SECURITY.md` |
| F4 | **Malware scanning** (ClamAV, planned) | File bytes | Sent inside the AWS network | Adapter written; **ClamAV not set up yet**; the default `basic` scanner only checks file type and the EICAR test string | AWS BAA if run in AWS | `src/server/providers/scan.ts`, `docs/DEPLOYMENT.md` |
| F5 | **Email** (AWS SES) | Patient email address and first name; a "there is an update in your portal" message and link | Sent | Templates pass a linter that allows only first name, portal link, support email and brand (`src/domain/notifications/templates.ts`); production refuses to start with the dev outbox or the placeholder sender | AWS BAA (SEC-09); SES DNS records not yet created | `src/server/providers/messaging.ts`, `src/server/env.ts`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md` |
| F6 | **Text messages** (AWS SNS) | Patient phone number and the same minimal message | Sent | Off by default; only with recorded SMS consent and the feature flag | AWS BAA (SEC-09) | `src/server/providers/messaging.ts`, `docs/INTEGRATIONS.md` |
| F7 | **Payments** (Stripe hosted checkout) | Payer email, amount, neutral line item "Professional assessment service", an internal payment ID. **No** diagnosis, service name, case details or screening data. Card numbers never touch the app. | Sent; webhooks received | Hosted checkout; signed webhooks with a 5-minute window; stored once per event | No BAA; owner accepted this minimal design (LEG-12, SEC-05). **(Inferred)** the payer's email plus a charge from Defining You Therapeutic Services could hint that the person sought counseling; the owner accepted the design knowing this. | `src/server/providers/payments.ts`, `docs/INTEGRATIONS.md`, `docs/OWNER-SIGNOFF.md` Q9, Q19 |
| F8 | **Video visits** (Amazon Chime SDK, **being built**) | Live audio/video of the assessment; meeting identifiers | Sent live | Not built: the code today is a stub with no real call (`VIDEO_PROVIDER` allows only `stub`). Patients confirm their state before each join; a mismatch blocks the visit. | Owner chose Chime under the AWS BAA (Q42); build and BAA evidence pending (SEC-08) | `src/server/providers/video.ts`, `src/server/env.ts`, `docs/OPEN-DECISIONS.md` SEC-08 |
| F9 | **Error reports** (Sentry) | Designed to send none: error type, route pattern (e.g. `/portal/cases/[id]`), method and stack frames only. Never messages, real paths, headers, cookies, bodies, users or IPs. | Sent only if turned on | **Off** unless `SENTRY_DSN` is set **and** `SENTRY_BAA_SIGNED=1`; production refuses to start with a DSN but no BAA flag; server-only, no browser reporting | Owner chose Sentry (Q43); **BAA not signed yet (SEC-11)** | `src/server/error-reporting.ts`, `src/server/env.ts` |
| F10 | **AI drafting** (Amazon Bedrock, if ever enabled) | Record excerpts needed for the selected form fields | Sent only if turned on | **Off** (`AI_PROVIDER=disabled` by default; owner kept it off, Q13); when on, drafts must cite sources, cannot be signed and cannot change status; production refuses the dev stub and requires a model ID | Would rely on the AWS BAA; model must be covered with no training or retention (LEG-06, SEC-04) | `src/server/providers/ai.ts`, `src/server/env.ts` |
| F11 | **Application logs** (CloudWatch) | Designed to hold none | Stored 90 days, KMS-encrypted | Logger drops every field not on an allow-list (request id, route, status, error class, case reference, etc.); error messages are never logged; `console.*` blocked by the security check | AWS BAA | `src/server/logger.ts`, `infra/terraform/app.tf`, `scripts/security-findings.ts` |
| F12 | **Audit log** (in Postgres) | Who did what to which record (IDs and short codes, hashed IP) | Stored 7 years (setting) | Append-only trigger; hash chain checked daily by `verify-audit-chain`; reads of cases and intakes are audited. Off-site archive with Object Lock is planned, not built | AWS BAA | `src/server/audit.ts`, `drizzle/0001_security_controls.sql`, `docs/DEPLOYMENT.md`, `infra/terraform/data.tf` (TODO) |
| F13 | **Backups** (RDS automated backups and snapshots) | Full copy of the database | Stored | KMS-encrypted; point-in-time recovery; 35-day retention in the Terraform skeleton | AWS BAA | `infra/terraform/data.tf`, `docs/DATABASE.md` |
| F14 | **Secrets and keys** (Secrets Manager, KMS) | Not ePHI, but they unlock it: `ENCRYPTION_KEYS`, `HMAC_SECRET`, database and Stripe credentials | Stored | Injected into the app at start; production refuses development keys; migration credentials never given to the web app | AWS BAA | `src/server/env.ts`, `src/server/crypto.ts`, `infra/terraform/README.md` |
| F15 | **Public site** (Cloudflare Pages, `www`) and **DNS** (Cloudflare) | **None.** Static pages, no forms, no cookies, no analytics; the only script runs in the browser and sends nothing | n/a | Strict CSP (`connect-src 'none'`, `form-action 'none'`). **The app host must stay "DNS only"** so Cloudflare never sees form posts. | No BAA (not needed while no PHI passes through it; Cloudflare offers BAAs only on Enterprise) | `docs/PUBLIC-SITE.md`, `docs/DEPLOYMENT.md` |
| F16 | **Source code and deployment** (GitHub repo `Kandaceross-web/leavebridge`, container registry) | None (fictional data only) | n/a | Security check scans for secrets and tracking hosts on every release check | n/a | `docs/PUBLIC-SITE.md`, `scripts/security-findings.ts` |
| F17 | **Support email** (`support@leavebridgehealth.com`) | **(Inferred)** Patients will send personal and possibly health details, because the password-reset page tells them to email support | Received, stored | Outside the app; mailbox provider not named in the repo | Unknown — see O-14 | `src/app/(auth)/forgot-password/page.tsx`, `signoff/drafts/README.md` |
| F18 | **The owner's own devices** (laptop, phone, any tablet) | Whatever is viewed, downloaded, printed or photographed; the authenticator app for staff sign-in | Viewed, possibly stored | App side: staff need password + authenticator code, sign out after 15 minutes idle, re-confirm before signing; nothing cached by the browser. Device side: unknown | n/a | `src/config/settings.ts` (security), `src/server/auth/session.ts`; section 6 |
| F19 | **Phone calls or texts outside the app** (e.g. a backup when video fails) | Whatever is said or typed | Sent | Not part of the app | Unknown — see O-23 | `signoff/drafts/telehealth-consent.md` (backup-step placeholders) |

### 3.2 Simple flow

```
Patient browser ──HTTPS──> CloudFront + WAF ──> App (ECS) ──TLS──> Postgres (RDS, encrypted) ──> RDS backups
                                                  │  ├──> S3 (encrypted files) <── ClamAV scan (planned)
                                                  │  ├──> SES email / SNS text (minimal content)
                                                  │  ├──> Stripe (email + amount + neutral label only)
                                                  │  ├──> Chime video (being built)
                                                  │  ├──> Sentry (OFF until BAA) / Bedrock (OFF)
                                                  │  └──> CloudWatch logs (allow-listed fields only)
Owner's laptop/phone ──HTTPS + MFA──> same app (staff console)
Public site (Cloudflare Pages, www) ── no patient data, no forms
```

---

## 4. Current controls (summary)

What the build does today, so the owner can see the starting point. Code having a control does not mean the control has been independently tested (`docs/OPEN-DECISIONS.md`, intro).

| Area | Control in the build | Source |
| --- | --- | --- |
| Sign-in | scrypt password hashing; random session tokens stored only as hashes; secure, httpOnly cookies | `src/server/auth/password.ts`, `src/server/auth/session.ts` |
| Multi-factor | Authenticator-app (TOTP) code required for all staff; no recovery codes; enrolment by secret/link, no QR code | `src/config/settings.ts` (`requireStaffMfa: true`), `docs/KNOWN-LIMITATIONS.md` |
| Timeouts | Staff idle 15 min, patients 30 min, absolute 12 h; re-confirm identity within 5 min before determinations, signatures, config changes and emergency access | `src/config/settings.ts` |
| Lockout and rate limits | Lock after 5 failed sign-ins for 15 min; rate limits on sign-in, sign-up, screening, contact, uploads | `src/config/settings.ts`, `docs/SECURITY.md` |
| Who sees what | Role rules in the service layer (patient, clinician, director, support, billing, compliance, admin); support and billing see no clinical content | `src/domain/policy.ts` (per `docs/SECURITY.md`), `docs/COMPLIANCE.md` |
| Database second line | Row-level security on PHI tables; app role cannot bypass it; release check blocks if that changes | `drizzle/0001_security_controls.sql`, `scripts/security-findings.ts` |
| Emergency (break-glass) access | Reason required, time-boxed (4 h max), audited; owner allowed self-approval for a solo practice, marked "self-approved" for later review | `src/config/settings.ts`, `docs/OWNER-SIGNOFF.md` Q40 |
| Encryption | App-level AES-256-GCM for sensitive fields and all files; KMS at rest in RDS and S3; TLS in transit | `src/server/crypto.ts`, `infra/terraform/data.tf` |
| Integrity | Append-only tables; hash-chained audit log checked daily; signatures bound to the exact document version | `drizzle/0001_security_controls.sql`, `src/server/audit.ts` |
| Audit | Sign-ins, failures, lockouts, record views, uploads, downloads, signatures, config changes and more are logged | `src/server/audit.ts` |
| Logging | Allow-list logger; error messages never logged | `src/server/logger.ts` |
| Vendors | Payment, email, storage, video, AI and errors are behind adapters; production refuses development adapters and dev keys | `src/server/env.ts`, `docs/INTEGRATIONS.md` |
| Release gate | `npm run release:check` and `npm run security:check` block production on open decisions, RLS problems, secrets in code, tracking hosts, and serious dependency vulnerabilities | `docs/DEPLOYMENT.md`, `scripts/security-findings.ts` |
| Retention | Abandoned screening answers purged after 30 days (hourly job); clinical and audit 7 years; destruction otherwise manual | `src/config/settings.ts`, `docs/DATABASE.md` |

---

## 5. Risk register

IDs R-01 to R-20. "O-n" points to a question in section 6.

| ID | Risk (what could go wrong) | Weakness that makes it possible | Current controls | Likelihood | Impact | Risk level | Planned action | Who |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Owner's laptop or phone is lost, stolen or infected, exposing the staff console or downloaded patient documents | Owner-reported (O-1 to O-11): laptop and phone used only by the owner; full-disk encryption, phone lock and remote wipe, automatic updates, anti-malware and 5-minute auto-lock all on; authenticator backed up; documents stay in the portal; personal backups hold no patient data. Not independently checked | Staff MFA, 15-min idle sign-out, `no-store` caching, nothing clinical in browser storage | Low | High | **Medium** | Keep these settings; re-confirm at each yearly review | Owner |
| R-02 | Someone takes over the owner's staff account (phishing, reused password) | One staff account holds all access; no app recovery codes; no self-service password reset; penetration test not done (SEC-14). Owner uses a password manager with unique passwords (O-12) and a backed-up authenticator (O-6) | scrypt, lockout, TOTP MFA, step-up before signing, audit of sign-ins and failures | Low | High | **Medium** | Complete SEC-14; consider app recovery codes (build) | Owner; Build |
| R-03 | ePHI goes to a vendor without a BAA in place | AWS BAA evidence for the workload account not yet on file (SEC-09); Sentry BAA not signed; support mailbox provider unknown (F17) | Startup refuses Sentry without the BAA flag; DNS-only rule for Cloudflare; Stripe gets minimal data by design | Medium | High | **High** | Save the AWS Artifact record showing the organization-wide BAA covers the workload account, and limit workloads to HIPAA-eligible services (SEC-09); sign Sentry BAA before setting `SENTRY_BAA_SIGNED=1`; answer O-14 | Owner |
| R-04 | Cloud administrator accounts (AWS, GitHub, Cloudflare, Stripe, registrar) are taken over, giving access to data, keys or deployments | Owner reports MFA on AWS (root and admin), GitHub, Cloudflare, Stripe and email, used only by the owner (O-13); not independently checked | AWS org created with advanced features (SEC-09 note); Terraform keeps migration credentials away from the web app | Low | High | **Medium** | Keep MFA on; no shared logins; re-confirm at each yearly review | Owner |
| R-05 | No one notices or responds well to a breach or outage | No written incident plan (SEC-16, LEG-20); no SIEM or alerting wired; Sentry off; audit-chain job alarm described but not built | Hash-chained audit log, daily verify job, allow-list logs | Medium | High | **High** | Write and approve a short incident and breach-notification plan (SEC-16); wire an alarm on `verify-audit-chain` failure; fill O-20, O-21 | Owner; Build |
| R-06 | Video visits leak or are run on a tool without a BAA | Chime video built (commit e7713e5) but never run against real AWS or tested in a live call (inferred risk: a consumer video app could be used as a stopgap) | Join check (participant, time window, location, state authorization); opaque meeting ids (`src/server/providers/video.ts`); IAM policy denies recording and transcription (`docs/DEPLOYMENT.md`); production refuses `VIDEO_PROVIDER=stub` | Medium | High | **High** until a live test visit passes | Run a live test visit on AWS (SEC-08); confirm Chime is covered by the AWS BAA; do not use a non-BAA video app; decide the backup step (O-23) | Build; Owner |
| R-07 | Data is lost and cannot be restored (deletion, ransomware, failed region, mistake) | Restore drill not done (SEC-10); RPO/RTO undecided (OWN-14); single region; Terraform never applied | RDS PITR, 35-day backups, deletion protection in prod, S3 versioning (all in the skeleton) | Medium | High | **High** until SEC-10 evidence exists | Run and record a restore drill (SEC-10); decide RPO/RTO (OWN-14); confirm encryption keys are backed up (see R-08) | Owner; Build |
| R-08 | Encryption keys are lost (data becomes unreadable forever) or stolen (encrypted fields become readable) | Keys come from an environment keyring in Secrets Manager; KMS-wrapped data keys planned, not built | Production refuses dev keys; key IDs allow rotation; Secrets Manager + KMS in the reference design | Low | High | **Medium** | Keep a protected backup of `ENCRYPTION_KEYS` and test that the restore drill (SEC-10) decrypts records; plan the KMS-wrapped keys (build) | Owner; Build |
| R-09 | A harmful file is uploaded and later opened by the owner | ClamAV not set up yet; since commit e7713e5, `src/server/env.ts` refuses to start production without `SCAN_PROVIDER=clamav` and `CLAMAV_HOST` | Content-type check, size limit, PDF active-content refusal, EICAR test, files unreadable until clean | Medium | Medium | **Medium** | Run ClamAV before launch | Build; Owner |
| R-10 | A flaw lets one person see another person's records | Database row-level security groups **all staff together**: policies use `lb_is_internal()` (any staff or system actor), and `withActor()` sets only the actor kind and patient ID, so per-clinician limits live only in the service layer. `docs/DATABASE.md` describes finer per-clinician RLS than the SQL shows (inferred from `drizzle/0001_security_controls.sql` and `src/server/db/actor.ts`). The anonymous screening policy lets any anonymous actor's query see all anonymous screening rows at the database level; the service layer filters by hashed cookie. Contact messages, notifications and signatures have no RLS (SEC-18). No penetration test yet (SEC-14). | Service-layer `can()` checks first; RLS second; E2E role-isolation tests; release check blocks if RLS is off on case tables | Low | High | **Medium** | Complete SEC-14; correct `docs/DATABASE.md` or tighten the policies; close SEC-18 (build). With one clinician the per-clinician gap matters less, but it matters once anyone else gets a staff role | Build; Owner |
| R-11 | An email or text reaches the wrong person, revealing that someone uses a mental-health leave service | No email verification at sign-up; typos in addresses or phone numbers | Messages carry only first name and "update in your portal"; texts off unless opted in | Medium | Medium | **Medium** | Consider email verification at sign-up (build); keep messages minimal | Build |
| R-12 | Patients send health details to the support mailbox, which may not be covered by a BAA | support@ mailbox not created yet; owner chose Google Workspace with Google's BAA (O-14) | None in the app | High | Medium | **High until the Google Workspace mailbox and its BAA are in place** | Set up Google Workspace, accept its BAA, then create support@; build self-service password reset (OWN-21) | Owner; Build |
| R-13 | Cloudflare sees patient form data | If the orange-cloud proxy were turned on for `app`, or forms added to the static site | Documented DNS-only rule for `app`; static site has no forms and blocks outbound connections | Low | High | **Medium** | Check the Cloudflare DNS settings at launch and at each review; keep `app` DNS only | Owner |
| R-14 | Payment records reveal more than intended | Stripe holds the payer email and that they paid Defining You Therapeutic Services | Neutral line item; no case details; hosted checkout | Low | Low | **Low** | Keep the descriptor neutral when the Stripe account is set up (LEG-02) | Owner |
| R-15 | PHI ends up in logs or error reports | A developer adds a field or message that carries PHI | Allow-list logger; messages never logged; Sentry sends no messages, paths or users and is off without a BAA; `console.*` blocked | Low | Medium | **Low** | Keep the allow-list; spot-check logs after launch | Build |
| R-16 | AI drafting sends record excerpts to a model not covered by the BAA | Only if someone turns it on | Off by default; owner kept it off; production needs a named model | Low | Medium | **Low** | Re-run this analysis before turning AI on | Owner |
| R-17 | The audit log is altered by someone with administrator access | Audit log lives in the same database; Object Lock archive not built | Append-only trigger; app role cannot update or delete; daily hash-chain check | Low | Medium | **Low** | Build the Object Lock audit archive (planned in `infra/terraform/data.tf`) | Build |
| R-18 | Records are kept longer than needed, or destroyed wrongly | No automatic deletion of clinical records; destruction is manual | Retention settings (7 years); abandoned screenings purged at 30 days | Low | Medium | **Low** | Build the destruction job before the first records reach 7 years (STR-05 note); confirm state minimums | Build; Owner |
| R-19 | Visits or records are seen or heard by others where the owner works, or paper copies are mislaid | Owner works in a private home office on password-protected home Wi-Fi; no paper or fax (O-8, O-9, O-24) | None in the app | Low | Medium | **Low** | Keep the door closed during visits; re-confirm at each yearly review | Owner |
| R-20 | People who help the practice (now or later) access data without training, agreements or limits | Owner works alone (O-15); training done (O-17); owner is Security Official (O-18); standard sanctions policy adopted (O-19); admin can still grant any role | Roles limit non-clinical staff; role grants are audited | Low | High | **Medium** | Train and sign an agreement with anyone before granting a role | Owner |

**Highest risks (High), after the owner's answers on 2026-10-09:** R-03 vendors without BAA evidence, R-05 no incident plan or alerting, R-06 video not yet tested live, R-07 restore never tested, R-12 support mailbox not set up yet. R-01, R-02 and R-04 dropped to Medium on the owner's answers about devices, passwords and MFA.

---

## 6. Questions only the owner can answer

The code cannot see these. Please answer each in plain words; "I don't know yet" is a fine answer and becomes an action item.

**Devices (R-01)**
- O-1. Which devices will you use for practice work (laptop, phone, tablet)? Are they used only by you, or shared with anyone in your household? **Owner answer (2026-10-09):** A laptop and a phone, used only by me ("Laptop and phone, only me", decision card).
- O-2. Is full-disk encryption on for your laptop (FileVault on Mac, BitLocker or Device Encryption on Windows)? **Owner answer (2026-10-09):** Yes, full-disk encryption is on ("Yes, it's on", decision card; owner-reported, not independently checked).
- O-3. Does your phone have a passcode or biometric lock, and is "Find My" / remote wipe turned on? **Owner answer (2026-10-09):** Phone has a passcode or biometric lock and remote wipe is on ("Both are on", decision card; owner-reported).
- O-4. Do your laptop, phone and browser install updates automatically? **Owner answer (2026-10-09):** Laptop, phone and browser all update automatically ("Yes, all automatic", decision card; owner-reported).
- O-5. Is anti-malware protection on your laptop (for example, built-in Windows Security or macOS protections)? **Owner answer (2026-10-09):** Anti-malware protection is on, built-in or other ("Yes, built-in or other", decision card; owner-reported).
- O-6. Where does your authenticator app live, and how would you get back in if that phone were lost? **Owner answer (2026-10-09):** The authenticator is backed up, so codes survive losing the phone ("Yes, it's backed up", decision card; owner-reported). The app itself still has no MFA recovery codes (R-02).
- O-7. Will you download, print or screenshot patient documents? If so, where are they saved and how are they deleted or shredded? **Owner answer (2026-10-09):** No downloads, printing or screenshots; patient documents stay in the portal ("No, portal only", decision card).
- O-10. How quickly does each device lock itself when idle? **Owner answer (2026-10-09):** Laptop and phone auto-lock after 5 minutes or less ("5 minutes or less", decision card; owner-reported).
- O-11. Do you back up your own devices (for example iCloud, OneDrive, Time Machine), and could those backups contain patient information? **Owner answer (2026-10-09):** Personal device backups exist and hold no patient information, since patient documents stay in the portal ("Yes, no patient data", decision card; owner-reported).

**Where you work (R-19)**
- O-8. Where will you hold video visits and do review work (home office, other office)? Is it a private room where others cannot see your screen or hear the visit? **Owner answer (2026-10-09):** Visits and review work happen in a private home office with the door closed during visits ("Private home office", decision card).
- O-9. What internet do you use for practice work: your own secured Wi-Fi, or ever public Wi-Fi? **Owner answer (2026-10-09):** Practice work uses password-protected home Wi-Fi only, no public Wi-Fi ("Home Wi-Fi, password-protected", decision card).

**Accounts (R-02, R-04)**
- O-12. Do you use a password manager and a unique password for LeaveBridge, AWS, GitHub, Cloudflare, Stripe and email? **Owner answer (2026-10-09):** Uses a password manager with unique passwords for every practice account ("Yes, all unique", decision card; owner-reported).
- O-13. Is MFA on for the AWS root and admin logins, GitHub, Cloudflare, Stripe and your email? Who else, if anyone, can log in to any of them? **Owner answer (2026-10-09):** MFA is on for AWS (root and admin), GitHub, Cloudflare, Stripe and email, and only the owner can log in ("Yes, all, only me", decision card; owner-reported, not independently checked).

**Email and phone (R-03, R-12, R-06)**
- O-14. Which provider hosts support@leavebridgehealth.com (and your own work email), and is a BAA signed with it? If not, will you tell patients not to send health details by email? **Owner answer (2026-10-09):** support@leavebridgehealth.com will be hosted on Google Workspace, with Google's BAA accepted in the admin console before patients use it ("Google Workspace", decision card). To-do: set up the mailbox and accept the BAA. Update 2026-10-09: the owner already has a paid Google Workspace account for another business, used only by them; leavebridgehealth.com will be added to it as a secondary domain with support@ as an alias, so mail goes straight to Google (Cloudflare only hosts DNS, it does not relay mail). Google's HIPAA BAA must be accepted in that account's admin console first.
- O-23. Will you ever call or text patients from your own phone (for example when video fails)? Which number or app? **Owner answer (2026-10-09):** Will call and text patients from own phone; texts limited to scheduling with no health details, deleted regularly ("Calls and texts", decision card). Patients should agree to texting in the communication consent (see communication-consent.md).

**Workforce and training (R-20)**
- O-15. Does anyone else help or plan to help (assistant, biller, IT helper, developer)? What would they see, and have they signed a confidentiality agreement or BAA? **Owner answer (2026-10-09):** No one else helps; the owner is the only person with access ("Just me", decision card). Anyone added later gets their own account and a confidentiality agreement or BAA first.
- O-16. Confirm that people and AI tools building the software never see real patient data. **Owner answer (2026-10-09):** Confirmed: only made-up data is used in building, testing and any AI chat; no real patient data goes to developers or AI tools ("Confirm", decision card).
- O-17. Have you completed HIPAA security training? When, and will you repeat it each year (and train anyone you add)? **Owner answer (2026-10-09):** HIPAA security training completed and will be repeated yearly ("Done, will repeat yearly", decision card). Date of completion to be added: ________.
- O-18. Do you name yourself as the practice's Security Official (45 CFR 164.308(a)(2))? **Owner answer (2026-10-09):** Kandace Ross is named the practice's Security Official under 45 CFR 164.308(a)(2) ("Yes, me", decision card).
- O-19. What happens if someone who helps you breaks the privacy rules (your sanctions policy)? **Owner answer (2026-10-09):** Standard sanctions policy adopted: depending on seriousness, a written warning, then loss of system access, then ending the work arrangement; every violation and sanction is documented and kept 6 years. Applies to anyone the owner adds ("Use the standard", decision card).

**Incidents (R-05)**
- O-20. Who would you contact in a security incident (AWS support, Stripe, insurer, an attorney if you choose), and how can they reach you? **Owner answer (2026-10-09):** Owner asked for the standard list ("you do it", 2026-10-09). Contacts: (1) AWS Support, opened from the AWS console Support Center (app, database, files, video, email); (2) Stripe support, from the Stripe dashboard (payments); (3) Google Workspace support, from the Workspace admin console (support mailbox); (4) Cloudflare support, from the Cloudflare dashboard (domain, DNS, public site); (5) GitHub support (code); (6) cyber liability insurer, if one is bought (see O-21); (7) an attorney, only if the owner chooses one. Breach notices, if needed, follow 45 CFR 164.404-408 (patients; HHS through its online breach portal). Reaching the owner: phone ________, email ________ (owner to fill in).
- O-21. Do you have cyber liability insurance? If so, its incident phone line. **Owner answer (2026-10-09):** No cyber liability insurance yet ("Not yet", decision card). Option to consider: a cyber add-on from the malpractice carrier.
- O-22. How often will you look at the audit log and the access page (including self-approved emergency access)? Monthly is a common choice. **Owner answer (2026-10-09):** Monthly review of the audit log and the access-grants page, including any self-approved emergency access ("Monthly", decision card). The Ops dashboard shows a reminder when no review has been recorded in the last month.

**Paper, disposal and continuity (R-19, R-07)**
- O-24. Will there be any paper records or faxes? Where are they kept, and are they locked? **Owner answer (2026-10-09):** No paper records and no fax; everything stays digital in the portal ("No paper, no fax", decision card).
- O-25. How will you dispose of old laptops, phones or drives (wipe, destroy)? **Owner answer (2026-10-09):** Old laptops, phones and drives get a full factory reset (erase) before they are sold, recycled or traded in; the laptop is encrypted, so the old data is unreadable afterwards ("Factory reset first", decision card).
- O-26. If you are unavailable, who can reach records and run the practice's systems (ties to the records-custodian question in records-access-and-retention.md)? **Owner answer (2026-10-09):** No records custodian named yet ("nobody for right now", 2026-10-09). Until one is named, records cannot be reached if the owner is unavailable; naming a custodian stays a to-do (see records-access-and-retention.md).

**This document**
- O-27. Do you accept the likelihood, impact and risk ratings in section 5? Note any you would change. **Owner answer (2026-10-09):** Ratings accepted, updated to reflect the owner's answers of 2026-10-09 (R-01, R-02, R-04, R-12, R-19, R-20 revised in section 5) ("Accept, with updates", decision card).
- O-28. Effective date of this analysis and the date of your next review. **Owner answer (2026-10-09):** Effective October 9, 2026. Reviewed again before the first patient and by October 9, 2027, then yearly ("Today, review Oct 2027", decision card).

---

## 7. Open technical items (stay open until evidence exists)

Signing this analysis does **not** close these. Each needs proof that the work was done.

| Item | What is needed | Status in repo | Risk IDs |
| --- | --- | --- | --- |
| **SEC-09** AWS BAA evidence | The AWS Artifact record showing the organization-wide BAA covers the workload account(s), and workloads limited to HIPAA-eligible services | Open: BAA accepted on the management account 2026-10-09; coverage evidence pending | R-03, R-04 |
| **SEC-10** Backup restore drill | A completed, recorded restore of the database (and that encrypted fields still decrypt) | Open: plan documented only | R-07, R-08 |
| **SEC-14** Penetration test | Test of sign-in, MFA, sessions and access control (automated tools acceptable); results and fixes recorded | Open: not done | R-02, R-10 |
| **SEC-16** Incident response plan | A short written plan: who notices, who decides, who is notified and when (with LEG-20) | Open: not written | R-05 |
| **ClamAV** (SEC-06) | A running ClamAV daemon reachable from the app, `SCAN_PROVIDER=clamav`, `CLAMAV_HOST` set; ideally a check that refuses production without it | Open: not set up (production start check added) | R-09 |
| **Video build** (SEC-08) | Amazon Chime SDK adapter built and tested; covered by the AWS BAA | Open: built, live AWS test pending | R-06 |
| Also related | Sentry BAA (SEC-11); RLS on remaining tables (SEC-18); RPO/RTO (OWN-14); self-service password reset (OWN-21) | Open | R-03, R-10, R-07, R-12 |

---

## 8. Review schedule

- **Before the first real patient** — re-check this analysis against the deployed system, with SEC-09, SEC-10, SEC-14 and SEC-16 evidence attached.
- **At least once a year** — full review, on the date set in O-28.
- **Also review when any of these happens:**
  - video visits go live, or a backup method is added;
  - Sentry, AI drafting, text messages or any new vendor is turned on;
  - anyone else is given access, or a new state or clinician is added;
  - the public site moves, or DNS/hosting changes;
  - you change devices, work location or email provider;
  - after any security incident or suspected breach.

Keep each signed version for at least six years (45 CFR 164.316(b)(2)).

---

## 9. Signature

I reviewed this risk analysis section by section, answered or scheduled each [OWNER TO ANSWER] item, and accept the risk levels and planned actions as recorded (or as I have changed them). I understand this draft was prepared from the software build and is not an independent assessment or a statement of HIPAA compliance.

| | |
| --- | --- |
| Name | Kandace Ross, LPC, NCC |
| Role | Owner; Security Official (O-18) |
| Signature | Electronically signed by Kandace Ross (Zxryeni, account user_013ut89Bov2CRaDgPjQmbhJk) by choosing "Sign it" on a decision card in the LeaveBridge project, 2026-10-09 23:53 UTC |
| Date signed | 2026-10-09 |
| Version | 1.0, effective 2026-10-09 |
| Next review due | Before the first patient, and no later than 2026-10-09 + 1 year (2027-10-09) |

When signed: record the date in `docs/OWNER-SIGNOFF.md` Q45 and close SEC-15 in `docs/OPEN-DECISIONS.md`. SEC-09, SEC-10, SEC-14 and SEC-16 stay open until their evidence is recorded.
