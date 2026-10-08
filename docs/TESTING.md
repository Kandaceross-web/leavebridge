# Testing

All test data is fictional. Integration and E2E tests reset their own databases.

| Command | What | Needs |
| --- | --- | --- |
| `npm run lint` | ESLint, `--max-warnings=0`, `no-console` | — |
| `npm run typecheck` | `tsc --noEmit`, strict + `noUncheckedIndexedAccess` | — |
| `npm test` | Vitest unit + integration (real Postgres, `leavebridge_test`, reset in global setup) | Postgres 16 with `lb_owner`/`lb_app` |
| `npm run build` | Production Next.js build | — |
| `npm run test:e2e` | Playwright at 360×780 (mobile) and 1280×900 (desktop), with axe WCAG 2.2 A/AA | Postgres; resets the dev database, then `next start` on :3200 after `npm run build` |
| `npm run release:check` | Production gate (expected to fail today) | Database |

`E2E_BASE_URL=http://localhost:3100 E2E_SKIP_RESET=1 npm run test:e2e` runs against an already running server.

## Unit (`tests/unit`)

Case state machine (whitelisted transitions, labels never say approved/qualified/certified); screening engine (four
outcomes, emergency precedence, inactive states); `canServe` (license, compact privilege, expiry, suspension, location);
close-out checklist and role policy; instrument scoring (PHQ-9, GAD-7 item safety flags), notification template linting
(no PHI variables), refund policy; security primitives (AES-GCM round trip and tamper detection, key rotation, scrypt,
TOTP, token hashing, logger allow-list).

## Integration (`tests/integration`), driving the real services

* **Journey:** screening → account → identity → consents → payment → intake → measures → uploads → clinical review →
  appointment → determination → AI-assisted document (accepted by clinician) → signature → delivery → closed, with the
  audit chain intact.
* **Gating:** payment blocked until financial consents; typed legal name and current consent versions required; intake
  blocked until care consents; submission blocked until measures; emergency never routed into the routine workflow;
  NOT_AVAILABLE cannot create a case; NEEDS_REVIEW blocks payment until cleared; intake safety answer raises a safety
  event and marks the case urgent.
* **Integrity:** AI off by default; pending AI suggestions block signing; the database refuses determinations by
  non-clinicians and signatures on AI-authored versions; no signed/delivered status without a signed version; patients
  never see drafts; undelivered documents cannot be downloaded.
* **Isolation:** patient-to-patient isolation enforced by services and by RLS; anonymous sees nothing; unassigned
  clinicians are refused; operations staff need an approved grant for clinical data; MFA required for clinical actions.
* **Jurisdiction:** states need an approved review to activate; inactive states cannot schedule; expired or suspended
  privileges block appointments and assignment; a license expiring soon only offers earlier slots.

## End to end (`tests/e2e`)

* Public pages: 200, one `h1`, no horizontal scroll, no serious/critical axe violations; homepage answers what/who/how/
  cost/next step/not guaranteed; security headers; 404s.
* Screening: available path with neutral copy and no answers in the URL; emergency path shows crisis resources and no
  sign-up; unavailable state.
* Portal: sign-in redirect, case page language, accessibility on every portal section, no access to ops, 404 for
  someone else's case id, file route requires a session.
* Ops: staff MFA, clinician and admin pages accessible, support cannot reach admin or audit.
