import {
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface CognitoUser {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  attributes: Record<string, string>;
}

/**
 * Shared Cognito Authentication Service
 *
 * Provides user authentication functionality that can be used across:
 * - User Service (user management)
 * - AppSync GraphQL API (user authentication)
 * - Service-to-Service authentication (when needed)
 */
@Injectable()
export class CognitoAuthService {
  private readonly logger = new Logger(CognitoAuthService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get("cognito");
    this.userPoolId = cognitoConfig.userPoolId;
    this.clientId = cognitoConfig.clientId;

    this.cognitoClient = new CognitoIdentityProviderClient({
      region: cognitoConfig.region,
      ...(this.configService.get("app.environment") === "development" && {
        endpoint: this.configService.get("aws.endpoint"),
      }),
    });
  }

  /**
   * Authenticate user with username and password
   */
  async authenticate(request: AuthRequest): Promise<AuthResponse> {
    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: {
          USERNAME: request.username,
          PASSWORD: request.password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new Error("Authentication failed");
      }

      const result = response.AuthenticationResult;

      return {
        accessToken: result.AccessToken!,
        refreshToken: result.RefreshToken!,
        idToken: result.IdToken!,
      };
    } catch (error) {
      this.logger.error(`Authentication failed for ${request.username}:`, error);
      throw error;
    }
  }

  /**
   * Get user details from Cognito
   */
  async getUser(userId: string): Promise<CognitoUser | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
      });

      const response = await this.cognitoClient.send(command);
      const user = (response as any).User;

      if (!user) {
        return null;
      }

      // Convert Cognito user to our format
      const attributes: Record<string, string> = {};
      user.Attributes?.forEach((attr: any) => {
        attributes[attr.Name] = attr.Value;
      });

      return {
        id: user.Username,
        email: attributes.email || attributes["cognito:email"] || "",
        username: user.Username,
        isActive: user.UserStatus === "CONFIRMED",
        attributes,
      };
    } catch (error) {
      this.logger.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Validate if user exists and is active
   */
  async validateUser(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user?.isActive ?? false;
    } catch (error) {
      this.logger.error(`Failed to validate user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user email by user ID
   */
  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await this.getUser(userId);
      return user?.email || null;
    } catch (error) {
      this.logger.error(`Failed to get email for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Sign out user globally (revoke all tokens)
   */
  async signOut(username: string): Promise<void> {
    try {
      const command = new AdminUserGlobalSignOutCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);
      this.logger.debug(`User ${username} signed out successfully`);
    } catch (error) {
      this.logger.error(`Failed to sign out user ${username}:`, error);
      throw error;
    }
  }
}
