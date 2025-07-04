import { registerAs } from "@nestjs/config";

/**
 * Service Authentication Configuration
 *
 * Configuration for service-to-service authentication using AWS services.
 * Aligns with the shared configuration architecture.
 */
export const serviceAuthConfig = registerAs("serviceAuth", () => ({
  // Service identity
  serviceName: process.env.SERVICE_NAME || "unknown-service",

  // Authentication method (cognito | iam)
  authMethod: (process.env.SERVICE_AUTH_METHOD || "cognito") as "cognito" | "iam",

  // Cognito configuration
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    clientSecret: process.env.COGNITO_CLIENT_SECRET,
    region: process.env.AWS_REGION || "us-east-1",
  },

  // IAM configuration
  iam: {
    roleArn: process.env.SERVICE_ROLE_ARN,
    sessionDuration: parseInt(process.env.SERVICE_SESSION_DURATION || "3600"),
    region: process.env.AWS_REGION || "us-east-1",
  },

  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.AWS_ENDPOINT, // For LocalStack
  },

  // Development settings
  development: {
    enabled:
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      process.env.LOCALSTACK_ENABLED === "true",
    mockTokenExpiry: parseInt(process.env.MOCK_TOKEN_EXPIRY || "3600"),
  },

  // Security settings
  security: {
    tokenExpiry: parseInt(process.env.SERVICE_TOKEN_EXPIRY || "3600"),
    maxRetries: parseInt(process.env.SERVICE_AUTH_MAX_RETRIES || "3"),
    retryDelay: parseInt(process.env.SERVICE_AUTH_RETRY_DELAY || "1000"),
  },
}));

/**
 * Service authentication configuration type
 */
export type ServiceAuthConfig = ReturnType<typeof serviceAuthConfig>;
