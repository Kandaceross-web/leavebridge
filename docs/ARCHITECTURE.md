# Architecture

LeaveBridge Health is one Next.js application backed by one PostgreSQL database. It serves three surfaces:
the public site, the patient portal and the operations console. Every vendor sits behind an adapter, so the whole
journey runs locally with no vendor accounts.

```
Browser ──► CloudFront + WAF ──► Next.js (ECS Fargate, standalone build)
                                   │  src/proxy.ts      nonce CSP, request id, host split, no-store on app paths
                                   │  src/app           pages (RSC) + server actions + route handlers
                                   │  src/server        services, auth, audit, crypto, providers
                                   │  src/domain        framework-free rules
                                   ▼
                     PostgreSQL 16 (RDS)  ◄── RLS per transaction actor, append-only triggers
                     S3 + KMS (encrypted files)   SES/SNS (minimal-content notices)
                     Stripe (checkout, webhooks)  Video vendor (TBD)   AI (disabled by default)
```

## Layers

| Layer | Path | Rule |
| --- | --- | --- |
| Domain | `src/domain` | Pure TypeScript. Case state machine, screening engine, `canServe` jurisdiction check, close-out checklist, refund policy, instrument scoring, notification template linting, RBAC policy. No I/O. Unit tested. |
| Config | `src/config` | Typed defaults: settings (with review tags), service catalog, screening ruleset, intake definition, document templates. Admins override settings and content at runtime from the database. |
| Services | `src/server/services` | Every read and write. Each function takes a `Ctx` (transaction + actor + request metadata), checks authorization, writes audit events. Pages and actions never query tables directly. |
| Providers | `src/server/providers` | Payments, storage, malware scan, email/SMS, video, AI. Chosen by environment variables. |
| Web | `src/app`, `src/components`, `src/server/web` | Server components render; server actions mutate through `handle()`; route handlers serve files, health and webhooks. |

## Request lifecycle

1. `src/proxy.ts` assigns a request id and CSP nonce, enforces the www/app split when `HOST_MODE=split`, and marks
   portal/ops/auth responses `no-store` and `noindex`.
2. A page or action resolves the session (`requirePatientSession` / `requireStaffSession(roles)`), which checks idle and
   absolute timeouts and staff MFA.
3. `run(actor, fn)` opens one transaction, sets `app.actor_*` settings for row-level security, and passes `Ctx`.
4. The service checks the policy (`can(actor, action, case)`), does the work, writes `audit_events` (hash-chained) and,
   for status changes, `case_status_history`.
5. Sensitive operations (determination, signature, config changes, break-glass) require a step-up re-authentication
   inside `security.stepUpMinutes`.

## Case lifecycle

Internal statuses, patient labels and ops stages are defined once in `src/domain/cases/state-machine.ts`; transitions
are a whitelist. The patient journey matches the 17 steps in the request: screening (anonymous, server-side) →
account → identity and location → service selection → pre-payment consents → payment → intake → validated measures →
uploads → submit → clinical review → telehealth when the clinician requires it → independent determination →
documentation and signature → delivery → close-out checklist with audit trail.

Emergency screening outcomes never create a case. A safety flag raised later (intake or measures) moves the case to
`safety_hold` and alerts the clinical team; routine work stops until a clinician clears it.

## Surfaces

* **Public site** `(site)`: Home, How It Works, Services, Pricing, Employer Services, FAQ, Contact, About, Availability,
  Crisis, legal pages, referral landing. No PHI collected except through screening and contact (contact is
  administrative only and says so).
* **Screening and auth** `(auth)`: `/start/*`, sign-in/up, MFA, step-up.
* **Portal** `/portal`: case overview and timeline, identity, consents, payment, intake, measures, uploads, scheduling,
  messages, documents, release authorizations, notification preferences.
* **Ops** `/ops`: overview, board by stage, queues, case detail (clinical vs non-clinical views by role), schedule,
  safety, billing, admin configuration, audit.

## Two hosts, one deployable

With `HOST_MODE=split`, marketing pages answer only on `SITE_ORIGIN` and portal/ops/auth only on `APP_ORIGIN`; the proxy
redirects anything else. The app host loads no third-party scripts. In development both run on one host.

## Phase 2 (not built)

Tennessee virtual care / Call-On-Doc is out of scope. See [ROADMAP.md](ROADMAP.md) for the seams left for it.
