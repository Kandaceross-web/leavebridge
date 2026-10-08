# Environment

All variables are validated at startup by `src/server/env.ts`. Values are never echoed in errors, only names.
`.env.example` lists every variable with fictional local values.

## Environments

| `APP_ENV` | Purpose | Data | Providers |
| --- | --- | --- | --- |
| `development` | Local work | Fictional seed only | Any; dev defaults |
| `test` | Vitest / Playwright | Fictional, reset per run (`leavebridge_test`) | Fake/outbox/stub |
| `staging` | Pre-production in its own cloud account | Fictional only | Real vendors in test mode; dev keys refused |
| `production` | Real patients | Real PHI | Real vendors under BAAs; startup refuses fake payments, local storage, outbox email, stub AI, dev keys, missing Stripe/S3/Bedrock settings |

## Variables

| Variable | Required in prod | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime role `lb_app`. TLS required in cloud (`?sslmode=verify-full`). |
| `MIGRATION_DATABASE_URL` | Migrate job only | Owner role `lb_owner`. Not given to the web task. |
| `APP_ORIGIN`, `SITE_ORIGIN`, `HOST_MODE` | Yes | `split` once domains are decided (OWN-16). |
| `ENCRYPTION_KEYS` | Yes | `id:base64(32 bytes)` list. Prepend a new key to rotate; keep old keys until re-encrypted. Plan: KMS-wrapped data keys. |
| `HMAC_SECRET` | Yes | ≥16 chars; hashes session tokens, IPs, screening cookies. |
| `PAYMENTS_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint: `POST /api/webhooks/payments`. |
| `STORAGE_PROVIDER`, `S3_BUCKET`, `S3_REGION`, `S3_KMS_KEY_ID` | Yes | Files are also encrypted by the app before upload. |
| `SCAN_PROVIDER`, `CLAMAV_HOST` | Recommended | `basic` checks type and known signatures only. |
| `EMAIL_PROVIDER`, `SMS_PROVIDER`, `EMAIL_FROM` | Yes | Outbox stores messages in the DB for inspection in development. |
| `VIDEO_PROVIDER` | Decision pending | Only `stub` exists (OWN-15). |
| `AI_PROVIDER`, `BEDROCK_MODEL_ID` | No | Default `disabled`. |
| `IDV_PROVIDER` | No | `manual` staff review. |
| `SITE_ANALYTICS_SRC` | No | Marketing pages only; added to CSP for those pages only. Needs LEG-14. |

## Local setup

```bash
# Postgres 16 with roles lb_owner / lb_app (see docs/DATABASE.md)
cp .env.example .env
npm ci
npm run db:reset          # migrate + fictional seed
npm run dev               # http://localhost:3000
```

Fictional sign-ins (development only, password `Fictional-Dev-Pass-1`, TOTP secret `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`):
`patient@leavebridge.test`, `admin@`, `director@`, `clinician@`, `clinician2@`, `support@`, `billing@`,
`compliance@leavebridge.test`. Staff sign-in requires the TOTP code from that secret.
