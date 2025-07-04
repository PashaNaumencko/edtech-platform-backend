import {
  AdminInitiateAuthCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CognitoTokenPayload,
  ServiceAuthConfig,
  ServiceAuthCredentials,
  ServiceAuthHeaders,
  ServiceAuthRequest,
} from "../types/service-auth.types";

/**
 * Service Authentication Service
 *
 * Handles service-to-service authentication using AWS services:
 * - Cognito token generation for service clients
 * - IAM role assumption for cross-service communication
 * - Local development support with mock tokens
 *
 * This service is designed to be shared across all microservices
 * and provides a consistent authentication interface.
 */
@Injectable()
export class ServiceAuthService {
  private readonly logger = new Logger(ServiceAuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly stsClient: STSClient;
  private readonly config: ServiceAuthConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<ServiceAuthConfig>("serviceAuth")!;

    // Initialize AWS clients
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.aws.region,
      ...(this.config.aws.endpoint && {
        endpoint: this.config.aws.endpoint, // For LocalStack
      }),
    });

    this.stsClient = new STSClient({
      region: this.config.aws.region,
      ...(this.config.aws.endpoint && {
        endpoint: this.config.aws.endpoint, // For LocalStack
      }),
    });
  }

  /**
   * Generate a service authentication token
   *
   * @param serviceName - Name of the calling service
   * @returns Authentication token for service-to-service communication
   */
  async generateServiceToken(serviceName: string): Promise<string> {
    try {
      // Development environment - return mock token
      if (this.config.development.enabled) {
        this.logger.debug("Using mock token for development environment");
        return this.generateMockToken(serviceName);
      }

      // Production - use configured authentication method
      if (this.config.authMethod === "cognito") {
        return await this.generateCognitoServiceToken(serviceName);
      } else if (this.config.authMethod === "iam") {
        // For IAM, we return a placeholder since actual signing happens in createSignedRequest
        return "iam-auth-placeholder";
      }

      throw new Error(`Unsupported authentication method: ${String(this.config.authMethod)}`);
    } catch (error) {
      this.logger.error("Failed to generate service token", error);
      throw new Error("Service token generation failed");
    }
  }

  /**
   * Generate IAM credentials for service-to-service communication
   *
   * @param roleArn - ARN of the role to assume
   * @param sessionName - Session name for the assumed role
   * @returns Temporary credentials
   */
  async assumeServiceRole(roleArn: string, sessionName: string): Promise<ServiceAuthCredentials> {
    try {
      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: sessionName,
        DurationSeconds: this.config.iam.sessionDuration,
      });

      const response = await this.stsClient.send(command);

      if (!response.Credentials) {
        throw new Error("No credentials returned from STS");
      }

      return {
        accessKeyId: response.Credentials.AccessKeyId!,
        secretAccessKey: response.Credentials.SecretAccessKey!,
        sessionToken: response.Credentials.SessionToken!,
        expiration: response.Credentials.Expiration!,
      };
    } catch (error) {
      this.logger.error("Failed to assume service role", error);
      throw new Error("Service role assumption failed");
    }
  }

  /**
   * Create AWS signature for service-to-service requests
   *
   * @param credentials - AWS credentials
   * @param method - HTTP method
   * @param url - Request URL
   * @returns Signed request headers
   */
  createSignedRequest(
    credentials: ServiceAuthCredentials,
    method: string,
    url: string,
    headers: Record<string, string> = {}
  ): ServiceAuthHeaders {
    // This is a simplified implementation
    // In production, you would use AWS SDK's SignatureV4
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");

    return {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${timestamp.substring(
        0,
        8
      )}/${this.config.aws.region}/sts/aws4_request`,
      "X-Amz-Date": timestamp,
      "X-Amz-Security-Token": credentials.sessionToken,
      "X-Service-Name": this.config.serviceName,
      "X-Service-Auth-Method": "iam",
    };
  }

  /**
   * Create authenticated request for service-to-service communication
   *
   * @param method - HTTP method
   * @param url - Request URL
   * @returns Authenticated request configuration
   */
  async createAuthenticatedRequest(method: string, url: string): Promise<ServiceAuthRequest> {
    try {
      let headers: ServiceAuthHeaders;

      if (this.config.authMethod === "cognito") {
        const token = await this.generateServiceToken(this.config.serviceName);
        headers = {
          Authorization: `Bearer ${token}`,
          "X-Service-Name": this.config.serviceName,
          "X-Service-Auth-Method": "cognito",
        };
      } else if (this.config.authMethod === "iam") {
        if (!this.config.iam.roleArn) {
          throw new Error("SERVICE_ROLE_ARN not configured for IAM authentication");
        }

        const credentials = await this.assumeServiceRole(
          this.config.iam.roleArn,
          `${this.config.serviceName}-session`
        );

        headers = this.createSignedRequest(credentials, method, url, {});
      } else {
        throw new Error(`Unsupported authentication method: ${String(this.config.authMethod)}`);
      }

      this.logger.debug("Created authenticated request", {
        method,
        url,
        targetService: "unknown",
        authMethod: this.config.authMethod,
      });

      return {
        method,
        url,
        headers,
      };
    } catch (error) {
      this.logger.error("Failed to create authenticated request", error);
      throw error;
    }
  }

  /**
   * Validate service authentication configuration
   *
   * @returns True if configuration is valid
   */
  validateConfiguration(): boolean {
    if (this.config.development.enabled) {
      return true; // Development mode doesn't require full configuration
    }

    if (this.config.authMethod === "cognito") {
      return Boolean(
        this.config.cognito.userPoolId &&
          this.config.cognito.clientId &&
          this.config.cognito.clientSecret
      );
    } else if (this.config.authMethod === "iam") {
      return Boolean(this.config.iam.roleArn);
    }

    return false;
  }

  private generateMockToken(serviceName: string): string {
    // Generate a mock JWT token for development
    const payload: CognitoTokenPayload = {
      iss: "https://cognito-idp.localhost.localstack.cloud:4566/us-east-1_mock",
      sub: `service-${serviceName}`,
      aud: "service-internal",
      token_use: "access",
      scope: "service:internal",
      client_id: this.config.cognito.clientId || "mock-client-id",
      "custom:service_name": serviceName,
      "custom:service_role": "internal-service",
      exp: Math.floor(Date.now() / 1000) + this.config.development.mockTokenExpiry,
      iat: Math.floor(Date.now() / 1000),
    };

    // Simple base64 encoding for development (not secure)
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadEncoded = btoa(JSON.stringify(payload));
    const signature = btoa("mock-signature-for-development");

    return `${header}.${payloadEncoded}.${signature}`;
  }

  private async generateCognitoServiceToken(serviceName: string): Promise<string> {
    const { userPoolId, clientId, clientSecret } = this.config.cognito;

    if (!userPoolId || !clientId || !clientSecret) {
      throw new Error("Cognito client credentials not configured");
    }

    // Use client credentials flow for service-to-service authentication
    const command = new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: `service-${serviceName}`,
        PASSWORD: clientSecret,
      },
    });

    const response = await this.cognitoClient.send(command);

    if (!response.AuthenticationResult?.AccessToken) {
      throw new Error("No access token returned from Cognito");
    }

    return response.AuthenticationResult.AccessToken;
  }
}
