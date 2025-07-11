import { registerAs } from "@nestjs/config";

/**
 * Shared Authentication Configuration
 *
 * Configuration for authentication across the entire platform:
 * - User authentication (Cognito)
 * - Service-to-Service authentication
 * - AppSync GraphQL authentication
 */
export const authConfig = registerAs("auth", () => ({
  // Cognito configuration for user authentication
  cognito: {
    region: process.env.AWS_REGION || "us-east-1",
    userPoolId: process.env.COGNITO_USER_POOL_ID || "",
    clientId: process.env.COGNITO_CLIENT_ID || "",
    identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || "",
    endpoint: process.env.AWS_ENDPOINT, // For LocalStack
  },

  // AppSync configuration
  appsync: {
    apiId: process.env.APPSYNC_API_ID || "",
    apiUrl: process.env.APPSYNC_API_URL || "",
    apiKey: process.env.APPSYNC_API_KEY || "",
    region: process.env.AWS_REGION || "us-east-1",
  },

  // JWT configuration
  jwt: {
    tokenExpiry: parseInt(process.env.JWT_TOKEN_EXPIRY || "3600"),
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || "86400"),
  },

  // Security settings
  security: {
    enableCors: process.env.ENABLE_CORS === "true",
    corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED === "true",
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "900000"), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  },

  // Development settings
  development: {
    enabled: process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test",
    mockAuth: process.env.MOCK_AUTH === "true",
    bypassAuth: process.env.BYPASS_AUTH === "true",
  },
}));
