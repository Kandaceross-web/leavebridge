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

## First production launch checklist

The release check enforces the mechanical parts. The rest needs people: BAAs signed with every PHI vendor; counsel
sign-off on consents, terms, privacy notice and marketing copy; clinical sign-off on screening, crisis workflow,
intake and templates; licensure verification for each active state; security risk assessment and penetration test
(SEC-14, SEC-15); incident response plan (SEC-16, LEG-20); backup restore drill (SEC-10).

## Rollback

Deploy the previous image tag. Migrations are forward-only; write additive migrations so the previous image keeps
working against the new schema.
