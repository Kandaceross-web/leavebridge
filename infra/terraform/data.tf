resource "aws_kms_key" "data" {
  description         = "${local.name} data key (RDS, S3, Secrets)"
  enable_key_rotation = true
}

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name}-uploads"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.data.arn
    }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration { status = "Enabled" }
}

# TODO: audit archive bucket with Object Lock (compliance mode, retention per LEG-10/STR-05).

module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier                  = local.name
  engine                      = "postgres"
  engine_version              = "16"
  family                      = "postgres16"
  instance_class              = var.db_instance_class
  allocated_storage           = 50
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.data.arn
  multi_az                    = var.env == "prod"
  db_name                     = "leavebridge"
  username                    = "lb_owner"
  manage_master_user_password = true
  backup_retention_period     = 35
  deletion_protection         = var.env == "prod"
  db_subnet_group_name        = module.vpc.database_subnet_group_name
  parameters = [
    { name = "rds.force_ssl", value = "1" },
    { name = "log_statement", value = "ddl" }, # never "all": statements can contain PHI
  ]
}
# The lb_app runtime role is created by a one-off bootstrap task (see docs/DATABASE.md).
