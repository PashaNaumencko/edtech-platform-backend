import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { CognitoAuthService } from "./cognito-auth.service";
import { CognitoJwtService } from "./cognito-jwt.service";
import { CognitoUserPoolService } from "./cognito-user-pool.service";

@Module({
  imports: [ConfigModule],
  providers: [AuthService, CognitoAuthService, CognitoJwtService, CognitoUserPoolService],
  exports: [AuthService, CognitoAuthService, CognitoJwtService, CognitoUserPoolService],
})
export class AuthModule {}
