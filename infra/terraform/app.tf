resource "aws_ecr_repository" "app" {
  name                 = "leavebridge"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.data.arn
  }
}

resource "aws_ecs_cluster" "main" {
  name = local.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.data.arn
}

# TODO (in order):
# 1. Task definitions: "web" (image target web, port 3000) and "ops" (image target ops) with Secrets Manager env.
# 2. ECS service for web behind an ALB in public subnets; tasks in private subnets.
# 3. CloudFront distribution for site_domain and app_domain with AWS WAF managed rule groups + rate limiting.
# 4. EventBridge Scheduler rules running the ops task:
#      purge-screenings (hourly), appointment-reminders (hourly), credential-expiry (daily), verify-audit-chain (daily).
# 5. Deploy pipeline (GitHub Actions + OIDC): test → build image → migrate task → release:check (prod) → update service.
