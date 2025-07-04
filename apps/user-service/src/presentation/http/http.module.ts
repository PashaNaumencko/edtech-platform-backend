import { Module } from "@nestjs/common";
import { UsersController } from "./controllers/users.controller";

/**
 * HTTP Presentation Module
 *
 * Provides HTTP controllers for the user service
 */
@Module({
  controllers: [UsersController],
})
export class HttpModule {}
