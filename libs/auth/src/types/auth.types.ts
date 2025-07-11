/**
 * Shared Authentication Types
 *
 * Common types and interfaces for authentication across the platform
 */

// User authentication types
export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface AuthContext {
  userId: string;
  email?: string;
  username?: string;
  roles?: string[];
  customAttributes?: Record<string, string>;
  isAuthenticated: boolean;
}

// Cognito user types
export interface CognitoUser {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  attributes: Record<string, string>;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  customAttributes?: Record<string, string>;
  tokenUse: string;
  clientId: string;
  exp: number;
  iat: number;
}

// User management types
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  attributes?: Record<string, string>;
}

export interface UpdateUserRequest {
  username: string;
  attributes?: Record<string, string>;
  password?: string;
}

// AppSync types
export interface AppSyncContext {
  requestId: string;
  apiId: string;
  fieldName?: string;
  operationName?: string;
  variables?: Record<string, any>;
  identity?: any;
}

export interface AppSyncIdentity {
  sub: string;
  email?: string;
  username?: string;
  claims?: Record<string, any>;
}

// Service authentication types
export interface ServiceAuthContext {
  serviceName: string;
  serviceRole: string;
  permissions: string[];
  isAuthenticated: boolean;
}

// Role and permission types
export interface Role {
  name: string;
  permissions: string[];
  description?: string;
}

export interface Permission {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

// Authentication method types
export type AuthMethod = "cognito" | "iam" | "api-key" | "oauth";

export interface AuthConfig {
  method: AuthMethod;
  cognito?: {
    userPoolId: string;
    clientId: string;
    region: string;
  };
  iam?: {
    roleArn: string;
    region: string;
  };
  oauth?: {
    provider: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string = "AUTHENTICATION_FAILED",
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string = "AUTHORIZATION_FAILED",
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}
