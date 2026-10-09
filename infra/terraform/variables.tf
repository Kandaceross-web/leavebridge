variable "env" {
  description = "dev | staging | prod. Use a separate AWS account per environment."
  type        = string
}
variable "region" {
  type    = string
  default = "us-east-1"
}
variable "app_domain" {
  description = "Portal/ops hostname (OWN-16)."
  type        = string
  default     = "app.leavebridgehealth.com"
}
variable "site_domain" {
  description = "Marketing hostname (OWN-16)."
  type        = string
  default     = "www.leavebridgehealth.com"
}
variable "image_tag" {
  type = string
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}
