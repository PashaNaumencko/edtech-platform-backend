import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthContext, AuthService } from "../auth.service";

/**
 * AppSync Authentication Guard
 *
 * Validates AppSync GraphQL requests using Cognito identity context.
 * This guard is designed to be used in GraphQL resolvers and services
 * that need to validate user authentication from AppSync.
 */
@Injectable()
export class AppSyncAuthGuard implements CanActivate {
  private readonly logger = new Logger(AppSyncAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();

      // Extract AppSync identity from request
      const identity = this.extractAppSyncIdentity(request);

      if (!identity) {
        this.logger.warn("No AppSync identity found in request");
        throw new UnauthorizedException("Authentication required");
      }

      // Validate the identity
      const authContext = await this.authService.validateAppSyncContext(identity);

      if (!authContext || !authContext.isAuthenticated) {
        this.logger.warn("Invalid AppSync identity");
        throw new UnauthorizedException("Invalid authentication");
      }

      // Attach auth context to request for use in controllers/resolvers
      request.authContext = authContext;
      request.user = authContext;

      this.logger.debug("AppSync authentication successful", {
        userId: authContext.userId,
        email: authContext.email,
      });

      return true;
    } catch (error) {
      this.logger.error("AppSync authentication failed:", error);
      throw new UnauthorizedException("Authentication failed");
    }
  }

  /**
   * Extract AppSync identity from request
   */
  private extractAppSyncIdentity(request: any): any {
    // AppSync identity can be in different places depending on the setup
    return (
      request.identity || request.headers?.["x-appsync-identity"] || request.user?.identity || null
    );
  }
}

/**
 * AppSync Authentication Decorator
 *
 * Decorator to extract authenticated user from request
 */
export const AppSyncUser = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (_target: any, _propertyKey: string, _parameterIndex: number) => {
    // This would be implemented with a custom parameter decorator
    // For now, we'll use the request.authContext in the method
  };
};

/**
 * AppSync Role Guard
 *
 * Validates that the authenticated user has the required role
 */
@Injectable()
export class AppSyncRoleGuard implements CanActivate {
  private readonly logger = new Logger(AppSyncRoleGuard.name);

  constructor(private readonly authService: AuthService, private readonly requiredRole: string) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const authContext = request.authContext as AuthContext;

      if (!authContext || !authContext.isAuthenticated) {
        this.logger.warn("No authenticated user found");
        throw new UnauthorizedException("Authentication required");
      }

      const hasRole = await this.authService.hasRole(authContext.userId, this.requiredRole);

      if (!hasRole) {
        this.logger.warn(
          `User ${authContext.userId} does not have required role: ${this.requiredRole}`
        );
        throw new UnauthorizedException("Insufficient permissions");
      }

      this.logger.debug(`Role check passed for user ${authContext.userId}`, {
        requiredRole: this.requiredRole,
        userRoles: authContext.roles,
      });

      return true;
    } catch (error) {
      this.logger.error("AppSync role check failed:", error);
      throw new UnauthorizedException("Authorization failed");
    }
  }
}
