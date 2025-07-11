import { Injectable, Logger } from "@nestjs/common";
import { AuthRequest, AuthResponse, CognitoAuthService } from "./cognito-auth.service";
import { CognitoJwtService } from "./cognito-jwt.service";
import { CognitoUserPoolService } from "./cognito-user-pool.service";

export interface AuthContext {
  userId: string;
  email?: string;
  roles: string[];
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthContext;
  error?: string;
}

export interface AppSyncIdentity {
  sub: string;
  issuer: string;
  username: string;
  claims: Record<string, any>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognitoAuthService: CognitoAuthService,
    private readonly cognitoJwtService: CognitoJwtService,
    private readonly cognitoUserPoolService: CognitoUserPoolService
  ) {}

  /**
   * Authenticate user with username and password
   */
  async authenticateUser(username: string, password: string): Promise<AuthResult> {
    try {
      this.logger.debug(`Authenticating user: ${username}`);

      const authRequest: AuthRequest = { username, password };
      const authResponse: AuthResponse = await this.cognitoAuthService.authenticate(authRequest);

      const user = await this.getUserFromToken(authResponse.idToken);
      return {
        success: true,
        user,
      };
    } catch (error) {
      this.logger.error(`Authentication error for user ${username}:`, error);
      return {
        success: false,
        error: "Authentication failed",
      };
    }
  }

  /**
   * Validate JWT token and return user context
   */
  async validateToken(token: string): Promise<AuthResult> {
    try {
      this.logger.debug("Validating JWT token");

      await this.cognitoJwtService.verifyToken(token);
      const user = await this.getUserFromToken(token);

      return {
        success: true,
        user,
      };
    } catch (error) {
      this.logger.error("Token validation error:", error);
      return {
        success: false,
        error: "Invalid token",
      };
    }
  }

  /**
   * Get user context from token
   */
  async getUserFromToken(token: string): Promise<AuthContext> {
    try {
      const decodedToken = await this.cognitoJwtService.verifyToken(token);

      return {
        userId: decodedToken.sub,
        email: decodedToken.email,
        roles: decodedToken["cognito:groups"] || [],
        isAuthenticated: true,
      };
    } catch (error) {
      this.logger.error("Error getting user from token:", error);
      throw error;
    }
  }

  /**
   * Validate AppSync context
   */
  async validateAppSyncContext(identity: AppSyncIdentity): Promise<AuthContext | null> {
    try {
      this.logger.debug(`Validating AppSync identity for user: ${identity.sub}`);

      // Validate the user exists and is active
      const isValidUser = await this.cognitoAuthService.validateUser(identity.sub);
      if (!isValidUser) {
        this.logger.warn(`Invalid user: ${identity.sub}`);
        return null;
      }

      // Get user email
      const email = await this.cognitoAuthService.getUserEmail(identity.sub);
      if (!email) {
        this.logger.warn(`No email found for user: ${identity.sub}`);
        return null;
      }

      return {
        userId: identity.sub,
        email,
        roles: identity.claims["cognito:groups"] || [],
        isAuthenticated: true,
      };
    } catch (error) {
      this.logger.error(`Error validating AppSync context for ${identity.sub}:`, error);
      return null;
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: string, requiredRole: string): Promise<boolean> {
    try {
      const user = await this.cognitoAuthService.getUser(userId);
      if (!user) {
        return false;
      }

      const userGroups = user.attributes["cognito:groups"] || "";
      const roles = userGroups.split(",").map((role) => role.trim());

      return roles.includes(requiredRole);
    } catch (error) {
      this.logger.error(`Error checking role for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Sign out user (placeholder - implement as needed)
   */
  signOut(): boolean {
    try {
      this.logger.debug("Signing out user");
      // TODO: Implement actual sign out logic
      return true;
    } catch (error) {
      this.logger.error("Sign out error:", error);
      return false;
    }
  }
}
