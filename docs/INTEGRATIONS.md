# Integrations

Every vendor is behind an interface in `src/server/providers`. Development adapters let the full journey run with no
accounts. No vendor may receive PHI until a BAA (or a documented decision that one is not needed) exists; see
LEG-03 and the vendor rows in [OPEN-DECISIONS.md](OPEN-DECISIONS.md).

| Capability | Interface | Dev adapter | Production adapter | PHI sent | Decision |
| --- | --- | --- | --- | --- | --- |
| Payments | `PaymentProvider` | `fake`: simulated checkout page inside the portal | `stripe`: Checkout Sessions, signed webhooks, refunds (REST, no SDK) | None. Metadata holds an internal payment UUID only; neutral line item | SEC-05, LEG-12, LEG-02 (descriptor) |
| File storage | `StorageProvider` | `local`: encrypted files under `STORAGE_LOCAL_DIR` | `s3`: SSE-KMS bucket, app-layer encryption on top | Encrypted blobs | SEC-09 |
| Malware scan | `scanUpload()` | `basic`: magic bytes, size, EICAR signature | `clamav` (clamd TCP) or swap for GuardDuty S3 scanning | File bytes (in VPC) | SEC-06 |
| Email | `MessageProvider` | `outbox`: stored in `notifications` | `ses` | Minimal: first name, portal link | LEG-13 |
| SMS | `MessageProvider` | `outbox` | `sns` | Minimal; only with recorded SMS consent and feature flag | LEG-13 |
| Video | `VideoProvider` | `stub`: room reference, no real call | `chime`: Amazon Chime SDK Meetings (built; not yet tested on live AWS) | Live audio/video between patient and clinician; opaque meeting and attendee ids only | OWN-15, SEC-08 |
| AI drafting | `AiProvider` | `disabled` (default), `stub` (deterministic, dev only) | `bedrock` (Converse API, temperature 0) | Record excerpts needed for selected fields | LEG-06, SEC-04, CLN-06 |
| Identity verification | manual review | Staff review of uploaded ID | Vendor adapter slot | ID image | OWN-04, LEG-11 |

## Stripe setup (when approved)

1. Create a restricted key with Checkout Sessions, Payment Intents (read) and Refunds.
2. Add a webhook endpoint `https://<app host>/api/webhooks/payments` for `checkout.session.completed`,
   `checkout.session.expired` and `payment_intent.payment_failed`; put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Statement descriptor: neutral (decided with LEG-02).

Webhooks are verified (HMAC, 5-minute tolerance), stored idempotently in `payment_events`, and only move a payment from
pending to paid or failed.

## Adding a vendor

Implement the interface, add the enum value in `src/server/env.ts`, add a production startup check if it needs
secrets, and record the BAA/decision row. Never import a vendor SDK outside `src/server/providers`.
