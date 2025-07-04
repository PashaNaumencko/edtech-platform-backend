/**
 * Service Authentication Types
 *
 * Type definitions for service-to-service authentication
 */

export interface ServiceAuthCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

export interface ServiceAuthHeaders {
  Authorization: string;
  "X-Service-Name": string;
  "X-Service-Auth-Method": "cognito" | "iam";
  [key: string]: string;
}

export interface ServiceAuthRequest {
  method: string;
  url: string;
  headers: ServiceAuthHeaders;
  data?: any;
}

export interface ServiceAuthConfig {
  serviceName: string;
  authMethod: "cognito" | "iam";
  cognito: {
    userPoolId?: string;
    clientId?: string;
    clientSecret?: string;
    region: string;
  };
  iam: {
    roleArn?: string;
    sessionDuration: number;
    region: string;
  };
  aws: {
    region: string;
    endpoint?: string;
  };
  development: {
    enabled: boolean;
    mockTokenExpiry: number;
  };
  security: {
    tokenExpiry: number;
    maxRetries: number;
    retryDelay: number;
  };
}

export interface CognitoTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  token_use: string;
  scope?: string;
  client_id: string;
  "custom:service_name"?: string;
  "custom:service_role"?: string;
  exp: number;
  iat: number;
}

export interface ServiceAuthContext {
  serviceName: string;
  targetService?: string;
  authMethod: "cognito" | "iam";
  timestamp: Date;
  requestId: string;
}
