# LeaveBridge Health · BuildPlan (Rebuild v1)

Prepared 2026-10-08 for the full rebuild and consolidation request. This is the internal plan the implementation follows. It is updated as phases complete (see "Phase log" at the end).

Nothing here is legal, clinical or compliance advice. Unresolved professional decisions live in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) and block **production launch**, not development.

---

## 1. What exists today (audit)

| Source | Found | Use in rebuild |
|---|---|---|
| Application code / repository | **None.** No repository is attached for LeaveBridge (the account's two GitHub repos are unrelated projects). No database, no deployed site, no environment config. | Build from scratch. |
| Sprint 0 planning package (`/mnt/project-files/leavebridge/01–08`, 2026-10-05) | Spec review, ADR-001, entity model (≈60 tables), route map, role matrix, case state machine, sprint plan, review register (77 items: OWN/LEG/CLN/STR/SEC) | Primary design input. Reused heavily; reconciled with the newer request below. |
| Visual direction (`visual-direction.html`, artifact) | Token palette (paper/navy/sage/harbor), Newsreader + Hanken Grotesk + IBM Plex Mono, buttons, fields, badges, cards, timeline, home and screening mockups | Adopted as the design system (owner never objected; OWN-18 still formally open). |
| Master spec (project chat, 2026-10-05) | Original product requirements (§1–§40) | Still valid where not superseded. |
| Rebuild request (this thread, 2026-10-08) | Newest instructions | Highest priority. |

Because there is no existing implementation, "preserve working components" applies to the planning work and design system, not to code.

## 2. Reconciliation of old vs. new instructions

Priority: newest explicit instruction → confirmed decisions → prior architecture → existing implementation → assumptions.

| Topic | Older (spec / plan) | Newest request | Rebuild decision |
|---|---|---|---|
| Journey order | Screen → schedule → pay → intake → session | Screen → account → identity/location → select service → **pay** → intake → measures → uploads → **clinical review** → **schedule when required** → determination → signature → delivery → close | Newest order. Scheduling happens after clinical review, only when the clinician requires a session (configurable per service; default: session required). |
| Services | One service: Mental Health Leave Assessment | Leave documentation types: continuous, intermittent, reduced schedule, recertification, extensions, return-to-work (only where appropriate); admin enable/disable | Service catalog in config/DB with per-service `enabled` flag. Launch default: initial assessment enabled; recertification/extension/RTW **disabled** pending OWN-10. Leave type (continuous/intermittent/reduced) is captured as the *requested documentation type*, never a promise. |
| Price | $275 self-pay | $275 unless superseded | $275 (27500 cents), versioned price row, admin-editable. What it covers stays an open decision (OWN-05) with a conservative default description. |
| Screening outcomes | POTENTIAL FIT / NEEDS REVIEW / NOT AVAILABLE / EMERGENCY | AVAILABLE·CONTINUE / NEEDS REVIEW / NOT AVAILABLE / EMERGENCY·CRISIS | Same four outcomes; patient-facing wording "This service may be a fit" (never "you qualify"). Emergency halts the flow with crisis content and is never converted into a case. |
| Patient statuses | 8 neutral labels | Submitted … Delivered, Closed | New internal state machine (§6) with patient labels from the newest list; internal-only states hidden. |
| Ops stages | Clinician queues | New Requests, Awaiting Documents, Appointment Needed, Clinical Review, Provider Signature, Completed, Delivered | Board columns = these stages; plus queue tiles for missing info, aging, abandoned, etc. |
| Pages | Home, How it works, Assessment, FAQ, About, Resources, Support | Adds **Pricing**, **Employer Services**, **Contact**, Get Started, Login | All included. Resources kept as a shell (no unreviewed legal content). |
| Validated measures | Deferred (CLN-05) | Requested in portal | Instrument framework with PHQ-9 and GAD-7 (public-domain instruments, scored only by their published rules). Enabled in dev; production enablement gated by CLN-05. Item-level safety responses flag the case and show crisis resources (rule configurable, CLN-01). |
| Identity verification | Open (OWN-04) | Required "where required" | Built: ID document upload + staff verification, with a pluggable vendor adapter. Per-service `requiresIdentityVerification` (default **on**). |
| Two origins | Separate www/app Next apps | Not mentioned | One Next.js deployable, served on two hostnames by host-aware routing (`www` = marketing, `app` = portal/ops). The app layout loads no third-party scripts. Single-host mode for development. |
| Auth vendor | Cognito | Secure auth, MFA, passkeys where feasible | **In-app auth** (the ADR's documented alternative): scrypt passwords, DB sessions, TOTP MFA (required for staff), step-up re-auth for signing/determinations. Passkeys: adapter slot + roadmap. Removes one PHI vendor. |
| AI | Bedrock behind BAA | Replaceable, clinician-in-loop, no training/retention | `AiProvider` interface; default `disabled`. A deterministic dev stub proves the guardrails (citations required, DRAFT label, cannot finalize). |
| Messaging | Planned | "If included in final architecture" | Included (it was in the architecture): clinical and administrative threads, "not for emergencies" banner. |
| Out of scope | §38 future items | TN DMH, therapy practice, urgent care, Call-On-Doc, IV/med spa, primary care, med management | Not built. Phase-2 virtual-care notes in [ROADMAP.md](ROADMAP.md) only. |

## 3. Target architecture

- **Next.js 16 (App Router), React 19, TypeScript strict.** Server components fetch on the server; server actions for mutations; route handlers for webhooks and file streaming.
- **Domain layer (`src/domain`)**: framework-free TypeScript owning every rule (state machine, screening engine, `canServe`, consent gates, determinations, signatures, refunds, notifications). UI never decides policy.
- **PostgreSQL 16 + Drizzle ORM**, SQL migrations, append-only triggers for audit/status history/determinations/signatures, row-level security on PHI tables as a second line of defense.
- **Providers (`src/server/providers`)** behind interfaces: payments (dev fake / Stripe), storage (local encrypted / S3), malware scan (signature + magic-byte / ClamAV or GuardDuty), email & SMS (outbox / SES & SNS), video (stub / BAA vendor), AI (disabled / stub / Bedrock), identity verification (manual / vendor), key management (env keyring / KMS).
- **Configuration**: typed defaults in `src/config/*`, overridable at runtime from the `settings` table through the admin console; every change audited; review tags block production publish.
- **AWS-ready, provider-agnostic**: Dockerfile, Terraform skeleton for ECS Fargate + RDS + S3 + KMS + CloudFront/WAF; nothing in code assumes AWS beyond adapters.

## 4. Reusable vs weak vs missing

- **Reusable**: entity model (trimmed), role matrix, state machine concepts, review register IDs, design tokens, copy rules.
- **Weak in the old plan (fixed here)**: two separate Next apps (doubles build surface → one app, two hosts); Cognito dependency (→ in-app auth); scheduling before payment and before clinical review (→ newest journey); ~60 tables up front (→ ~35 tables actually needed now, insurance tables deferred); no Pricing/Employer pages; no measures; no ops board.
- **Missing (built now)**: everything in code.

## 5. Security concerns and controls

PHI begins at screening. Controls built in from the first commit:
- No PHI in URLs (opaque UUIDs only), page titles, logs, analytics, payment metadata, emails/SMS (template linter with variable allow-list).
- Allow-list structured logger; security events go to `audit_events` (hash-chained, DB-enforced append-only), operational logs go to stdout.
- AES-256-GCM application-layer encryption for free-text clinical answers, notes, rationale, messages and uploaded files; key IDs for rotation.
- Sessions: opaque random tokens, only SHA-256 hash stored, httpOnly/Secure/SameSite=Lax cookies, idle + absolute timeouts per role, MFA for staff, step-up before determination/signature/config changes.
- RBAC + case relationship checks in the domain policy (`can()`), RLS in Postgres, break-glass grants that are time-boxed, reason-required and audited.
- Uploads: size limits, magic-byte content validation, malware scan state machine (files unreadable until clean), encrypted at rest, streamed only through an authorized + audited route.
- CSP with nonces, HSTS, frame-ancestors none, no third-party scripts on app routes, rate limits on auth/screening/contact/upload.
- Fixtures: `is_fixture` flag; production refuses to boot with fixture data or dev providers enabled (release check).

## 6. Case state machine (internal → patient label)

| Internal status | Patient label | Ops stage |
|---|---|---|
| `started` | Getting started | (abandoned if stale) |
| `intake_incomplete` | Intake incomplete | Awaiting Documents |
| `awaiting_documents` | Awaiting documents | Awaiting Documents |
| `submitted` | Submitted | New Requests |
| `clinical_review` | Under clinical review | Clinical Review |
| `info_requested` | Additional information needed | Awaiting Documents |
| `appointment_needed` | Appointment needed | Appointment Needed |
| `appointment_scheduled` | Appointment scheduled | Appointment Needed |
| `provider_review` | Provider review | Clinical Review |
| `provider_signature` | Provider signature | Provider Signature |
| `completed` | Completed | Completed |
| `delivered` | Delivered | Delivered |
| `closed` | Closed | — |
| `cancelled` | Cancelled | — |
| `safety_hold` | On hold, please see your messages | Clinical Review (urgent) |

Transitions are a whitelist in `src/domain/cases/state-machine.ts`; every transition writes `case_status_history` and an audit event. "Approved", "qualified" and "certified" never appear in any label.

## 7. Workflows

- **Patient**: check availability (state only) → screening (anonymous, server-side) → outcome → create account → select service + requested documentation type → identity + location → consents (financial/self-pay/limitations before payment; informed/telehealth/privacy before intake) → pay → intake (sectioned, autosave) → measures → uploads → submit → track status → respond to requests → schedule when asked → attest location at join → receive determination message → download final documents → optional release authorization.
- **Clinical**: queue → case review (intake, measures, forms) → request info / require session → session → determination (no preselection, rationale + findings required, step-up) → documentation builder (template, sourced fields, optional AI suggestions labeled DRAFT) → sign (step-up, bound to content hash) → deliver → close checklist.
- **Admin / ops**: board + queues, case management (non-clinical view for admin), identity verification review, payments/refunds per policy, jurisdictions/licenses/authorizations with activation checklist, services/prices/policies, consent versions, screening rules, FAQ content, notification templates, settings, audit search, break-glass.

## 8. Integrations

Stripe (Checkout, webhooks, refunds; neutral descriptor, opaque case reference only), S3 + KMS, SES/SNS, video vendor TBD (OWN-15), Bedrock or other BAA-covered model (disabled), identity vendor TBD (OWN-04). Each has a dev adapter so the platform runs end-to-end without any vendor.

## 9. Migration needs

Greenfield. Drizzle migrations from an empty database; seed script creates fictional configuration and fictional patients (`is_fixture = true`).

## 10. Testing strategy (each phase)

`npm run lint` · `npm run typecheck` · `npm test` (Vitest unit + integration against real Postgres) · `npm run build` · Playwright E2E + axe accessibility at mobile and desktop widths. Required tests from spec §31 are explicit test cases (see [TESTING.md](TESTING.md)).

## 11. Deployment

Docker image (standalone Next output) → ECS Fargate; RDS Postgres 16 Multi-AZ; S3 (uploads, documents, audit archive with Object Lock); KMS; Secrets Manager; CloudFront + WAF; GitHub Actions with OIDC. Separate dev/staging/prod accounts. `release:check` blocks production deploy while P0/P1 open decisions or dev providers remain. See [DEPLOYMENT.md](DEPLOYMENT.md).

## 12. Phases

1. Foundation: scaffold, config, schema + migrations, crypto, logger, audit, auth, policy, providers, seed, design system.
2. Public site.
3. Screening + accounts + patient portal.
4. Clinical workflow + documents + signatures + delivery.
5. Ops dashboard + admin configuration.
6. Hardening: E2E, accessibility, security review, docs, release check.

## Phase log

| Date | Phase | Result |
| --- | --- | --- |
| 2026-10-08 | 1. Foundation | Schema (≈60 tables), security migration (RLS, append-only, guards), domain rules, config catalog, providers, crypto, audit chain, auth. |
| 2026-10-08 | 1b. Services + seed | Service layer for the full journey; fixtures drive the real services; 9 fictional patients across every stage. |
| 2026-10-08 | Tests | 86 unit + integration tests. Found and fixed two real bugs: RLS hid other patients' bookings (double-booking), and RLS blocked emergency safety events from anonymous screening. |
| 2026-10-08 | 2–3. Site, screening, portal | 13 public pages, screening with emergency routing, patient portal for every journey step. |
| 2026-10-08 | 4–5. Clinical, ops, admin | Ops overview, board, case workspace (11 tabs), document editor with step-up signing, schedule, safety, billing; 13 admin areas and audit. |
| 2026-10-08 | 6. Hardening | Access checks moved into 8 case-scoped read helpers (+1 test), form echo fix, root forced dynamic so every page carries the CSP nonce, scrollable tables keyboard-reachable, admin index. Docs, Dockerfile, Terraform skeleton, jobs, release check. 87 Vitest + 56 Playwright/axe checks (mobile 360px and desktop) passing; lint, typecheck and production build clean. `release:check` fails as intended (121 blockers). |
