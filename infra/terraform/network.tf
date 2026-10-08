# VPC with private subnets for ECS tasks and RDS; no NAT egress except to approved vendor endpoints.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name            = local.name
  cidr            = "10.40.0.0/16"
  azs             = ["${var.region}a", "${var.region}b"]
  private_subnets = ["10.40.1.0/24", "10.40.2.0/24"]
  public_subnets  = ["10.40.101.0/24", "10.40.102.0/24"]
  database_subnets = ["10.40.201.0/24", "10.40.202.0/24"]

  enable_nat_gateway = true # Stripe/SES/SNS; restrict with egress firewall rules once vendors are decided
  single_nat_gateway = var.env != "prod"
  enable_flow_log    = true
}

# TODO: VPC interface endpoints for secretsmanager, kms, ecr.api, ecr.dkr, logs; gateway endpoint for s3.
