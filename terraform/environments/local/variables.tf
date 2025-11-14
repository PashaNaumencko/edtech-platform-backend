# Variables for local development environment

variable "aws_region" {
  description = "AWS region for local development resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "edtech-platform"
}
