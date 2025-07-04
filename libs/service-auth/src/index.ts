// Service Authentication Library
// Provides production-ready service-to-service authentication for microservices

export * from "./config/service-auth.config";
export * from "./guards/service-auth.guard";
export * from "./interceptors/service-auth.interceptor";
export * from "./service-auth.module";
export * from "./services/service-auth.service";
// Note: ServiceAuthConfig is exported from config, types are re-exported for convenience
export type {
  CognitoTokenPayload,
  ServiceAuthContext,
  ServiceAuthCredentials,
  ServiceAuthHeaders,
  ServiceAuthRequest,
} from "./types/service-auth.types";
