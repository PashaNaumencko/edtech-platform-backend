# Variables for Cognito module

variable "environment" {
  description = "Environment name (local, dev, prod)"
  type        = string
}

variable "user_pool_name" {
  description = "Name of the Cognito User Pool"
  type        = string
}

variable "enable_email_verification" {
  description = "Enable email verification"
  type        = bool
  default     = true
}

variable "password_minimum_length" {
  description = "Minimum length of password"
  type        = number
  default     = 8
}

variable "password_require_lowercase" {
  description = "Require lowercase characters in password"
  type        = bool
  default     = true
}

variable "password_require_uppercase" {
  description = "Require uppercase characters in password"
  type        = bool
  default     = true
}

variable "password_require_numbers" {
  description = "Require numbers in password"
  type        = bool
  default     = true
}

variable "password_require_symbols" {
  description = "Require symbols in password"
  type        = bool
  default     = true
}

variable "callback_urls" {
  description = "List of allowed callback URLs"
  type        = list(string)
  default     = []
}

variable "logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
  default     = []
}

variable "create_domain" {
  description = "Create a Cognito domain for hosted UI"
  type        = bool
  default     = false
}

variable "domain_prefix" {
  description = "Domain prefix for Cognito hosted UI"
  type        = string
  default     = ""
}
