# Terraform configuration for local development environment
# This creates real AWS resources (Cognito) for local development
# Goal: Allow local development with docker-compose + real AWS Cognito

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after first apply to use S3 backend
  # backend "s3" {
  #   bucket = "edtech-terraform-state"
  #   key    = "local/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "local"
      Project     = "edtech-platform"
      ManagedBy   = "terraform"
      Purpose     = "local-development"
    }
  }
}

# Cognito User Pool for local development
module "cognito" {
  source = "../../modules/cognito"

  environment    = "local"
  user_pool_name = "edtech-local-users"

  # Enable email verification for local testing
  enable_email_verification = true

  # Password policy for development (relaxed)
  password_minimum_length = 8
  password_require_lowercase = true
  password_require_uppercase = false
  password_require_numbers   = true
  password_require_symbols   = false

  # Callback URLs for local development
  callback_urls = [
    "http://localhost:3000/auth/callback",
    "http://localhost:3001/auth/callback"
  ]

  logout_urls = [
    "http://localhost:3000",
    "http://localhost:3001"
  ]
}

# Store Cognito credentials in SSM for easy retrieval
resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "/edtech/local/cognito/user_pool_id"
  type  = "String"
  value = module.cognito.user_pool_id

  tags = {
    Environment = "local"
  }
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "/edtech/local/cognito/client_id"
  type  = "String"
  value = module.cognito.client_id

  tags = {
    Environment = "local"
  }
}
