# Outputs for Cognito module

output "user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "client_id" {
  description = "ID of the Cognito App Client"
  value       = aws_cognito_user_pool_client.identity_service.id
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "domain" {
  description = "Domain of the Cognito hosted UI"
  value       = var.create_domain ? aws_cognito_user_pool_domain.main[0].domain : null
}
