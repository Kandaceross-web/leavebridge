# Terraform skeleton (AWS reference deployment)

A starting point, not a reviewed deployment. It has not been applied. Hosting (OWN-13), account structure and
HIPAA-eligible service use (SEC-09), RPO/RTO (OWN-14) and backup/DR (SEC-10) are open decisions, and an AWS BAA must be
in place before any PHI is stored.

Layout:

* `main.tf`: providers, one environment per workspace/account (dev, staging, prod).
* `network.tf`: VPC, private subnets for ECS and RDS, VPC endpoints (S3, Secrets Manager, KMS, ECR, logs).
* `data.tf`: KMS keys, RDS Postgres 16 (Multi-AZ, encrypted, PITR), S3 buckets (uploads; audit archive with Object Lock).
* `app.tf`: ECR, ECS Fargate service for the `web` image target, ALB, CloudFront + WAF, scheduled ECS tasks for jobs.
* `variables.tf`: inputs.

Secrets (`DATABASE_URL`, `ENCRYPTION_KEYS`, `HMAC_SECRET`, Stripe keys) live in Secrets Manager and are injected as task
environment variables. The migration task gets `MIGRATION_DATABASE_URL`; the web task never does.
