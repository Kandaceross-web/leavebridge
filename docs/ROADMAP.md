# Roadmap

Ordered by what unblocks a real launch first. Items marked with a decision ID wait on that decision.

## Before launch

1. Close production-blocking decisions in [OPEN-DECISIONS.md](OPEN-DECISIONS.md) (legal, clinical, owner, state rules, security).
2. Video vendor adapter under a BAA (OWN-15, SEC-08), including in-session identity/location check (CLN-13).
3. Stripe live configuration and neutral descriptor (LEG-02, SEC-05).
4. Self-service password reset with email verification and session revocation.
5. Email verification at sign-up.
6. TOTP enrolment QR code rendered server-side (no third-party QR service), recovery codes.
7. Error monitoring with PHI scrubbing (SEC-11) and audit/log forwarding to a SIEM.
8. Real infrastructure from `infra/terraform`, restore drill, penetration test, risk assessment.

## After launch

* Passkeys (WebAuthn) for patients and staff.
* Identity verification vendor adapter (OWN-04, LEG-11).
* Recertification, extension and return-to-work services (code paths exist, disabled; OWN-10).
* Waitlist notifications when a state activates (OWN-19).
* Clinician-to-employer communication workflow, if approved (OWN-11, LEG-07).
* State paid-leave forms (STR-07).
* Record access/amendment request workflow (LEG-18).
* KMS-wrapped data keys and background re-encryption on key rotation.
* Reporting for owners: volumes, turnaround, refunds (no PHI).

## Phase 2: Tennessee virtual care / Call-On-Doc (architecture notes only, not built)

The request asks for notes, not implementation. Nothing below exists in code.

* **Separate service line, separate configuration.** It would be a new `services` entry family with its own consent
  versions, intake definition, questionnaires and templates, enabled per jurisdiction. The leave assessment flow must
  not change behaviour when it is added.
* **What can be reused:** accounts and auth, identity and location attestation, `canServe` licensure checks (license
  types and compacts are data), payments, scheduling and video adapter, secure messaging, documents/signatures,
  audit, RBAC, notifications.
* **What would be new:** an encounter model distinct from a leave case (the leave case state machine is specific to
  determinations), care-plan/visit notes, any prescribing integration (out of scope today: medication management is
  explicitly excluded), and any partner integration with Call-On-Doc under its own agreement and BAA.
* **Seams to keep open:** keep the case state machine and determination logic inside `src/domain/cases`; keep vendor
  calls in `src/server/providers`; keep service-specific rules in config rows rather than code branches.
* **Explicitly excluded:** TN DMH services, general therapy practice, urgent care, primary care, IV hydration,
  wellness shots, med spa and medication management remain out of scope unless the owner decides otherwise.
