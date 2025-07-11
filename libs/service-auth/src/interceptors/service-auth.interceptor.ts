import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ServiceAuthService } from "../services/service-auth.service";
import { ServiceAuthConfig } from "../types/service-auth.types";

/**
 * Service Authentication Interceptor
 *
 * Automatically adds service authentication headers to outgoing HTTP requests
 * for service-to-service communication. Supports both Cognito tokens and IAM signatures.
 *
 * This interceptor is designed to be shared across all microservices
 * and provides consistent authentication for outgoing requests.
 */
@Injectable()
export class ServiceAuthInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ServiceAuthInterceptor.name);
  private readonly config: ServiceAuthConfig;

  constructor(
    private readonly serviceAuthService: ServiceAuthService,
    private readonly configService: ConfigService
  ) {
    this.config = this.configService.get<ServiceAuthConfig>("serviceAuth")!;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only intercept outgoing requests (not incoming)
    if (request && typeof request.method === "string" && typeof request.url === "string") {
      return next.handle().pipe(
        tap(() => {
          // Add service authentication headers to response if needed
          void this.addServiceAuthHeaders(request, response);
        })
      );
    }

    return next.handle();
  }

  /**
   * Add service authentication headers to outgoing requests
   *
   * @param request - HTTP request object
   * @param targetService - Target service name
   * @returns Headers with authentication
   */
  async addServiceAuthHeaders(
    request: any,
    targetService?: string
  ): Promise<Record<string, string>> {
    try {
      const authMethod = this.config.authMethod;

      let headers: Record<string, string> = {};

      if (authMethod === "cognito") {
        // Use Cognito JWT tokens
        const token = await this.serviceAuthService.generateServiceToken(this.config.serviceName);
        headers = {
          Authorization: `Bearer ${token}`,
          "X-Service-Name": this.config.serviceName,
          "X-Service-Auth-Method": "cognito",
        };
      } else if (authMethod === "iam") {
        // Use IAM role-based authentication
        const roleArn = this.config.iam.roleArn;
        if (!roleArn) {
          throw new Error("SERVICE_ROLE_ARN not configured for IAM authentication");
        }

        const credentials = await this.serviceAuthService.assumeServiceRole(
          roleArn,
          `${this.config.serviceName}-session`
        );

        headers = this.serviceAuthService.createSignedRequest(
          credentials,
          request?.method || "GET",
          request?.url || "/",
          request?.headers || {}
        );

        headers["X-Service-Name"] = this.config.serviceName;
        headers["X-Service-Auth-Method"] = "iam";
      }

      this.logger.debug("Service authentication headers added", {
        serviceName: this.config.serviceName,
        targetService,
        authMethod,
      });

      return headers;
    } catch (error) {
      this.logger.error("Failed to add service authentication headers", error);
      throw error;
    }
  }

  /**
   * Create authenticated request for service-to-service communication
   *
   * @param method - HTTP method
   * @param url - Request URL
   * @param targetService - Target service name
   * @param data - Request data
   * @returns Authenticated request configuration
   */
  async createAuthenticatedRequest(
    method: string,
    url: string,
    targetService: string,
    data?: any
  ): Promise<{
    method: string;
    url: string;
    headers: Record<string, string>;
    data?: any;
  }> {
    const request = await this.serviceAuthService.createAuthenticatedRequest(method, url);

    return {
      ...request,
      data,
    };
  }
}
