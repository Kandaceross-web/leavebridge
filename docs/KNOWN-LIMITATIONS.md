# Known limitations

Honest list of what this build does not do yet. None of these are hidden behind claims elsewhere in the docs.

## Product

* **No live video.** The video adapter is a stub that issues room references; the join flow and location
  re-attestation work, but there is no call (OWN-15).
* **No self-service password reset.** `/forgot-password` tells people to email support from their account address.
* **No email verification** at sign-up.
* **TOTP enrolment shows the secret and an `otpauth://` link, not a QR code**; no recovery codes.
* **No passkeys.**
* **Identity verification is manual** staff review of an uploaded ID.
* **Recertification, extension and return-to-work services exist but are disabled** pending OWN-10.
* **Employer services are informational** (inquiry form, referral links with de-identified counts). There is no employer
  login, by design.
* **AI drafting is disabled.** The stub provider exists to test guardrails only.
* **Legal pages, consents, FAQ answers, crisis text and templates are placeholders** carrying review tags.
* **Marketing copy written during the build needs owner and legal review** (pricing explanations, service descriptions,
  employer page statements, availability guidance, referral landing text).
* **Contact and waitlist submissions are not audit-logged** (they hold no case data; the message body is encrypted).

## Platform

* Not deployed anywhere. The Terraform is a skeleton and has never been applied.
* No error monitoring/SIEM integration.
* No external penetration test or formal risk assessment.
* Record destruction after retention periods is manual.
* Encryption keys come from an environment keyring; KMS-wrapped data keys are planned.
* Rate limiting is per database bucket; behind a CDN, the client IP header must be configured correctly.
* Single region; RPO/RTO undecided (OWN-14).

## Compliance

Code controls do not make the service HIPAA compliant or legally reviewed. See [COMPLIANCE.md](COMPLIANCE.md) and the
open decisions register.
