import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuthService } from "../auth.service";

/**
 * AppSync Authentication Interceptor
 *
 * Intercepts GraphQL requests and adds authentication context.
 * This interceptor can be used in GraphQL resolvers to automatically
 * handle AppSync authentication and provide user context.
 */
@Injectable()
export class AppSyncAuthInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AppSyncAuthInterceptor.name);

  constructor(private readonly authService: AuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        // Add authentication context to the request
        this.addAuthContext(request);
      })
    );
  }

  /**
   * Add authentication context to request
   */
  private async addAuthContext(request: any): Promise<void> {
    try {
      const identity = this.extractAppSyncIdentity(request);

      if (identity) {
        const authContext = await this.authService.validateAppSyncContext(identity);

        if (authContext) {
          request.authContext = authContext;
          request.user = authContext;

          this.logger.debug("Added auth context to request", {
            userId: authContext.userId,
            email: authContext.email,
          });
        }
      }
    } catch (error) {
      this.logger.error("Failed to add auth context:", error);
      // Don't throw error here as this is just context addition
    }
  }

  /**
   * Extract AppSync identity from request
   */
  private extractAppSyncIdentity(request: any): any {
    return (
      request.identity || request.headers?.["x-appsync-identity"] || request.user?.identity || null
    );
  }
}

/**
 * AppSync Context Interceptor
 *
 * Interceptor that adds AppSync-specific context to requests
 */
@Injectable()
export class AppSyncContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AppSyncContextInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Add AppSync context information
    this.addAppSyncContext(request);

    return next.handle();
  }

  /**
   * Add AppSync context to request
   */
  private addAppSyncContext(request: any): void {
    try {
      // Extract AppSync-specific headers and context
      const appSyncContext = {
        requestId: request.headers?.["x-appsync-request-id"],
        apiId: request.headers?.["x-appsync-api-id"],
        fieldName: request.body?.fieldName,
        operationName: request.body?.operationName,
        variables: request.body?.variables,
        identity: this.extractAppSyncIdentity(request),
      };

      request.appSyncContext = appSyncContext;

      this.logger.debug("Added AppSync context", {
        requestId: appSyncContext.requestId,
        fieldName: appSyncContext.fieldName,
        operationName: appSyncContext.operationName,
      });
    } catch (error) {
      this.logger.error("Failed to add AppSync context:", error);
    }
  }

  /**
   * Extract AppSync identity from request
   */
  private extractAppSyncIdentity(request: any): any {
    return (
      request.identity || request.headers?.["x-appsync-identity"] || request.user?.identity || null
    );
  }
}
