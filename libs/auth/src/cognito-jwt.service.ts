import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export interface JwtPayload {
  sub: string;
  email?: string;
  "cognito:groups"?: string[];
  exp: number;
  iat: number;
  [key: string]: any;
}

@Injectable()
export class CognitoJwtService {
  private readonly logger = new Logger(CognitoJwtService.name);
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    const cognitoConfig = this.configService.get("cognito");
    this.userPoolId = cognitoConfig?.userPoolId || "";
    this.clientId = cognitoConfig?.clientId || "";
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      this.logger.debug("Verifying JWT token");

      const verifier = CognitoJwtVerifier.create({
        userPoolId: this.userPoolId,
        clientId: this.clientId,
        tokenUse: "id",
      });

      const payload = await verifier.verify(token);
      return payload as unknown as JwtPayload;
    } catch (error) {
      this.logger.error("JWT verification failed:", error);
      throw new Error("Invalid JWT token");
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      this.logger.debug("Verifying access token");

      const verifier = CognitoJwtVerifier.create({
        userPoolId: this.userPoolId,
        clientId: this.clientId,
        tokenUse: "access",
      });

      const payload = await verifier.verify(token);
      return payload as unknown as JwtPayload;
    } catch (error) {
      this.logger.error("Access token verification failed:", error);
      throw new Error("Invalid access token");
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(payload: JwtPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(payload: JwtPayload): Date {
    return new Date(payload.exp * 1000);
  }

  /**
   * Get token issued time
   */
  getTokenIssuedAt(payload: JwtPayload): Date {
    return new Date(payload.iat * 1000);
  }
}
