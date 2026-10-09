# Security

This describes the controls that exist in code. It is not a statement that the system is HIPAA compliant; compliance
depends on vendor agreements, policies, training, risk analysis and operations that code cannot provide. Open security
decisions are the SEC rows in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).

## PHI boundaries

| Place | Control |
| --- | --- |
| URLs | Opaque UUIDs and short case references only. No names, answers, diagnoses or states in query strings. |
| Logs | `src/server/logger.ts` drops every field not on an allow-list; errors log class and code, never messages. `console.*` is a lint error. |
| Analytics | Optional script on marketing pages only (`SITE_ANALYTICS_SRC`). Never on portal, ops, auth or screening routes. |
| Payment processor | Only an internal payment UUID in metadata; neutral line-item name; no diagnosis, leave type or state. |
| Email / SMS | Templates pass a linter (`src/domain/notifications/templates.ts`) with a variable allow-list (first name, portal link, support email, brand). Messages say "there is an update in your portal". |
| AI | Disabled by default. Any provider must not train on or retain data (LEG-06, SEC-04). Only the record excerpts needed for the fields are sent. Output is a labelled draft that cannot be signed until a clinician rewrites or accepts it into their own version. |
| Browser | `no-store` on app paths; nothing clinical in `localStorage`; screening answers are held server-side and keyed by an HMAC'd cookie. |

## Data protection

* AES-256-GCM application-layer encryption with key ids (`ENCRYPTION_KEYS` keyring, rotation by prepending a key) for
  free-text clinical answers, screening answers, notes, rationale, messages and every stored file.
* Database and bucket encryption at rest (RDS, S3 SSE-KMS) in the reference deployment.
* Uploads: 15 MB limit, magic-byte type detection (PDF/PNG/JPEG/HEIC), malware scan (ClamAV adapter), files
  unreadable until clean, streamed only through `/api/files/[id]` after an authorization check and an audit event.

## Identity and sessions

* scrypt password hashing; opaque random session tokens, only SHA-256 hashes stored; httpOnly, Secure, SameSite=Lax.
* Idle and absolute timeouts per role, failed-login lockout, rate limits on sign-in, sign-up, screening, contact and
  uploads (database-backed buckets).
* TOTP MFA required for staff (setting `security.requireStaffMfa`); step-up re-authentication before determinations,
  signatures, configuration changes and break-glass.

## Authorization

* Role policy in `src/domain/policy.ts` (patient, clinician, clinical director, support, billing, compliance, admin) plus
  case relationship (assigned clinician, owner patient).
* Postgres row-level security on PHI tables as a second line, using the per-transaction actor. The runtime role
  `lb_app` does not own tables and cannot bypass RLS; migrations run as `lb_owner`.
* Break-glass access grants: time-boxed (`security.breakGlassMaxHours`), reason required, audited, visible to compliance.
* Non-clinical staff (support, billing) get a case view without clinical content.

## Integrity

* `audit_events` is append-only (trigger) and hash-chained; `npm run jobs -- verify-audit-chain` checks it daily.
* Monthly security review (SEC-13): Ops → Admin → Monthly security review (`/ops/admin/security-review`, also linked
  from Access grants; admin, compliance and clinical director, MFA required). It shows the last 30 days' counts from the
  audit log (emergency access approved, how many self-approved, records opened under it, failed sign-ins, lockouts) and
  runs the hash-chain check, then records "review done" as a `security_review.completed` audit event holding counts and
  the note's length only. The optional short note (no PHI) is kept in Compliance reviews. The Ops overview shows a
  reminder to those roles when no review was recorded in the last 30 days.
* Append-only triggers on status history, determinations, signatures, document versions, notes and payment events.
* Signatures bind to the SHA-256 of the exact document version; editing creates a new version and invalidates nothing
  silently.

## Web

Nonce-based CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`), HSTS, `frame-ancestors 'none'`, `X-Content-Type-Options`,
strict referrer policy, permissions policy. Server actions get Next's built-in origin checks; bound ids are encrypted
and re-authorized in the service.

## Known gaps

See [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md): no self-service password reset, no passkeys, TOTP enrolment without a
QR code, no external penetration test, no SIEM forwarding yet.
