# Deployment

Reference target: AWS (ECS Fargate, RDS Postgres 16, S3 + KMS, Secrets Manager, CloudFront + WAF, SES/SNS). The code
is provider-agnostic: any host that runs a Node 22 container and a managed Postgres 16 works. Hosting is still an owner
decision (OWN-13) and an AWS BAA is required before PHI is stored.

## Artifacts

* `Dockerfile`: multi-stage. Target `web` runs the standalone Next.js server as a non-root user with a health check on
  `/api/health`. Target `ops` runs migrations, jobs and the release check.
* `infra/terraform`: skeleton for the AWS reference deployment (not applied; see its README).

## Pipeline (per environment)

1. `npm ci && npm run lint && npm run typecheck && npm test` (integration tests need Postgres) and `npm run test:e2e`.
2. `docker build --target web` and `--target ops`; push to ECR with an immutable tag.
3. Run the `ops` image once: `npm run db:migrate` with `MIGRATION_DATABASE_URL`.
4. **Production only:** run `npm run release:check` against the production database and environment. It exits 1 while
   any production-blocking open decision, review tag, fixture account, unreviewed active state, undecided tagged setting
   or development provider remains. A failure stops the deploy.
5. Update the ECS web service; wait for healthy targets.

## Scheduled jobs

Run the `ops` image with `npm run jobs -- <name>`:

| Job | Schedule | Effect |
| --- | --- | --- |
| `purge-screenings` | Hourly | Clears answers from expired anonymous screenings (`retention.abandonedScreeningDays`). |
| `appointment-reminders` | Hourly | Reminder about 24 hours before a booked visit; deduplicated. |
| `credential-expiry` | Daily | Counts licenses, compact privileges and malpractice policies expiring in 30 days (details in the admin console). |
| `verify-audit-chain` | Daily | Exits non-zero if the audit hash chain is broken; alarm on failure. |

## Domain and DNS

Before launch, www is served by Cloudflare Pages as a static public-only site; see PUBLIC-SITE.md.

The domain is `leavebridgehealth.com`, registered at Cloudflare Registrar with DNS at Cloudflare (bought 2026-10-09).

| Name | Points to | Notes |
| --- | --- | --- |
| `www` | CloudFront distribution (site) | CNAME, **DNS only** (grey cloud) |
| `app` | CloudFront distribution (app) | CNAME, **DNS only** (grey cloud) |
| apex `leavebridgehealth.com` | Redirect to `https://www.leavebridgehealth.com` | Cloudflare redirect rule is fine here; no form data passes through it |
| ACM validation CNAMEs | As issued by ACM (us-east-1 for CloudFront) | DNS only |
| SES: 3 DKIM CNAMEs, custom MAIL FROM MX + SPF TXT, `_dmarc` TXT | As issued by SES | Needed before `EMAIL_FROM` can send |

**Keep `www` and `app` DNS only.** With the orange-cloud proxy on, Cloudflare would terminate TLS and see form posts
(screening answers, intake, uploads, contact messages). That needs a Business Associate Agreement with Cloudflare, which
Cloudflare offers only on Enterprise plans. CloudFront and AWS WAF are covered by the AWS BAA instead.

## First production launch checklist

The release check enforces the mechanical parts. The rest needs people: BAAs signed with every PHI vendor; counsel
sign-off on consents, terms, privacy notice and marketing copy; clinical sign-off on screening, crisis workflow,
intake and templates; licensure verification for each active state; security risk assessment and penetration test
(SEC-14, SEC-15); incident response plan (SEC-16, LEG-20); backup restore drill (SEC-10).

Uploads (SEC-06, owner sign-off Q41): run a ClamAV daemon reachable from the app and set `SCAN_PROVIDER=clamav` and
`CLAMAV_HOST=host:3310`. The default `basic` scanner only checks file type and the EICAR test string.

Error reporting (SEC-11, owner decision Q43): server errors go to Sentry only when `SENTRY_DSN` is set and
`SENTRY_BAA_SIGNED=1`. Set the second only after Sentry has signed a BAA with the practice. Reports carry the error
class, route pattern, method and stack frames, never messages, paths, headers or users (`src/server/error-reporting.ts`).

## Document signing certificate (SEC-19)

Every Automated Mental Health Screening Record and work excuse letter is a PDF with a CMS (PKCS#7) detached signature
over the whole file (`adbe.pkcs7.detached`, with a signing-certificate-v2 attribute), a random document number, a QR
code to `APP_ORIGIN/verify/<number>`, and a SHA-256 and certificate fingerprint stored in `issued_documents`. The public
page `/verify` reports valid, revoked or not found, and can compare an uploaded copy byte for byte.

* Production refuses to start without `DOCUMENT_SIGNING_KEY` and `DOCUMENT_SIGNING_CERT`. Development and tests
  generate a self-signed certificate per process, named "DEVELOPMENT ... (not trusted)".
* What PDF readers show depends on the certificate. A self-managed certificate makes Adobe Reader say the signer's
  identity is unknown, though the document is still tamper-evident and verifiable on `/verify`. For a green check in
  Adobe, buy a document-signing certificate from a provider on the Adobe Approved Trust List. This is an owner decision
  with a recurring cost (SEC-19).
* The key is RSA. Keep it in the secret manager (or a KMS/HSM-backed signer in a later version), never in the image or
  the repository. Give it only to the web task.
* From a provider's `.p12`/`.pfx`:
  `openssl pkcs12 -in signing.p12 -nocerts -nodes | openssl pkcs8 -topk8 -nocrypt -out key.pem` and
  `openssl pkcs12 -in signing.p12 -nokeys -out cert.pem` (signing certificate first, then intermediates). Store each
  PEM, or `base64 -w0` of it, as the variable.
* For staging only, a self-managed certificate:
  `openssl req -x509 -newkey rsa:3072 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=LeaveBridge Health document signing (staging)/O=Defining You Therapeutic Services" -addext "keyUsage=critical,digitalSignature,nonRepudiation"`.
* Rotation: deploy the new key and certificate. Documents already issued keep verifying, because the public check
  compares the stored hash and the fingerprint recorded at issue. Keep the old certificate on file.
* After deploying, issue a test record in staging and open it in Adobe Reader and on `/verify`.

## Same-Day Mental Health Assessment

* Turn on or off with the `sameDayScreening` setting (and `workExcuseLetter` for letters) in Ops > Business rules. The
  service row (`same-day-mental-health-assessment`, $29.99) is seeded with the catalog.
* Safety alerts and letter requests go by email to every active clinician and clinical director. The email names only
  the console page. Make sure each has a working address and that someone watches it outside office hours (CLN-22).
* Stripe sees the usual neutral line item ("Professional assessment service") and the usual `/portal/cases/<id>` return
  URLs, so the processor cannot tell which service was bought.

## Video visits (Amazon Chime SDK)

Owner decision Q42 (OWN-15, SEC-08). Set `VIDEO_PROVIDER=chime` and `CHIME_REGION` (the Chime SDK Meetings API Region,
for example `us-east-1`). `CHIME_MEDIA_REGION` (where meetings are hosted) defaults to `CHIME_REGION`. The web task uses
its task role through the normal AWS credential chain; no access keys go in code or environment files. The environment
check refuses to start production with `VIDEO_PROVIDER=stub`, or with `chime` and no `CHIME_REGION`.

IAM policy for the web task role (nothing else from Chime is used):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VideoVisits",
      "Effect": "Allow",
      "Action": ["chime:CreateMeeting", "chime:GetMeeting", "chime:CreateAttendee"],
      "Resource": "*"
    },
    {
      "Sid": "NoRecordingOrTranscription",
      "Effect": "Deny",
      "Action": [
        "chime:StartMeetingTranscription",
        "chime:CreateMediaCapturePipeline",
        "chime:CreateMediaConcatenationPipeline",
        "chime:CreateMediaLiveConnectorPipeline",
        "chime:CreateMediaInsightsPipeline",
        "chime:CreateMediaStreamPipeline"
      ],
      "Resource": "*"
    }
  ]
}
```

How it works: booking stores no meeting (Chime ends a meeting about five minutes after creation if nobody joins). The
first participant to pass the join check creates the meeting and its id is stored in `appointments.video_ref`; if
Chime has since ended it, the next join creates a new one. Each participant gets their own attendee. The meeting's
`ExternalMeetingId`, the `ClientRequestToken` and each attendee's `ExternalUserId` are keyed hashes of the appointment
id (`HMAC_SECRET`), so nothing sent to AWS names a person or case. Join tokens go only to the signed-in participant and
are never logged. The visit pages (`/portal/cases/<id>/visit`, `/ops/visits/<id>`) add `https://*.chime.aws`,
`wss://*.chime.aws` and `blob:` workers to their CSP; no other page does.

Before real patients: confirm the workload account is covered by the AWS BAA (SEC-09) and that Amazon Chime SDK is on
the HIPAA eligible services list for it, then run a live test visit between two devices (patient on a phone,
clinician on a desktop) through the app's network path (CloudFront/WAF must not block the visit pages; media goes
directly from browsers to Chime). Record the result on OWN-15 and SEC-08.

## Rollback

Deploy the previous image tag. Migrations are forward-only; write additive migrations so the previous image keeps
working against the new schema.
