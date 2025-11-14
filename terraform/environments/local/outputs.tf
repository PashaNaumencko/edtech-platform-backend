# Outputs for local development environment
# These values should be copied to .env.local

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID - Copy this to .env.local as COGNITO_USER_POOL_ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID - Copy this to .env.local as COGNITO_CLIENT_ID"
  value       = module.cognito.client_id
}

output "cognito_region" {
  description = "AWS Region for Cognito"
  value       = var.aws_region
}

output "env_file_template" {
  description = "Environment variables for .env.local"
  value = <<-EOT
    # Copy these values to your .env.local file:

    COGNITO_USER_POOL_ID=${module.cognito.user_pool_id}
    COGNITO_CLIENT_ID=${module.cognito.client_id}
    COGNITO_REGION=${var.aws_region}
  EOT
}
