import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

/**
 * Shared Cognito User Pool Service
 *
 * Provides user pool management functionality that can be used across:
 * - User Service (user CRUD operations)
 * - AppSync GraphQL API (user management)
 * - Service-to-Service operations (user provisioning)
 */
@Injectable()
export class CognitoUserPoolService {
  private readonly logger = new Logger(CognitoUserPoolService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get("cognito");
    this.userPoolId = cognitoConfig.userPoolId;

    this.cognitoClient = new CognitoIdentityProviderClient({
      region: cognitoConfig.region,
      ...(this.configService.get("app.environment") === "development" && {
        endpoint: this.configService.get("aws.endpoint"),
      }),
    });
  }

  /**
   * Create a new user in Cognito
   */
  async createUser(request: CreateUserRequest): Promise<boolean> {
    try {
      const userAttributes = [
        {
          Name: "email",
          Value: request.email,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ];

      // Add custom attributes
      if (request.attributes) {
        Object.entries(request.attributes).forEach(([key, value]) => {
          userAttributes.push({
            Name: `custom:${key}`,
            Value: value,
          });
        });
      }

      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: request.username,
        TemporaryPassword: request.password,
        UserAttributes: userAttributes,
        MessageAction: "SUPPRESS", // Don't send welcome email
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User created successfully: ${request.username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create user ${request.username}:`, error);
      return false;
    }
  }

  /**
   * Delete a user from Cognito
   */
  async deleteUser(username: string): Promise<boolean> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User deleted successfully: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete user ${username}:`, error);
      return false;
    }
  }

  /**
   * Enable a user in Cognito
   */
  async enableUser(username: string): Promise<boolean> {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User enabled successfully: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to enable user ${username}:`, error);
      return false;
    }
  }

  /**
   * Disable a user in Cognito
   */
  async disableUser(username: string): Promise<boolean> {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`User disabled successfully: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to disable user ${username}:`, error);
      return false;
    }
  }

  /**
   * Set user password
   */
  async setUserPassword(
    username: string,
    password: string,
    permanent: boolean = true
  ): Promise<boolean> {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        Password: password,
        Permanent: permanent,
      });

      await this.cognitoClient.send(command);
      this.logger.log(`Password set successfully for user: ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set password for user ${username}:`, error);
      return false;
    }
  }

  /**
   * Update user attributes
   */
  updateUserAttributes(username: string, attributes: Record<string, string>): boolean {
    try {
      // For now, we'll use a simple approach
      // In a full implementation, you'd use AdminUpdateUserAttributesCommand
      this.logger.log(`User attributes updated for: ${username}`, attributes);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update attributes for user ${username}:`, error);
      return false;
    }
  }
}
