import { Module } from "@nestjs/common";
import { UserApplicationModule } from "../../application/user-application.module";
import { UsersController } from "./controllers/users.controller";

/**
 * HTTP Presentation Module
 *
 * Provides HTTP controllers for the user service
 */
@Module({
  imports: [UserApplicationModule],
  controllers: [UsersController],
})
export class HttpModule {}
