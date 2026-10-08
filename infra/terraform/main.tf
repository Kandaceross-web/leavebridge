terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  # backend "s3" { bucket = "<state bucket>" key = "leavebridge/<env>.tfstate" region = "us-east-1" dynamodb_table = "<lock table>" encrypt = true }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { app = "leavebridge", env = var.env, data_class = "phi" }
  }
}

locals {
  name = "leavebridge-${var.env}"
}
