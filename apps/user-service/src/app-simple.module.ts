import { Module } from "@nestjs/common";
import { UserGraphQLModule } from "./presentation/graphql/graphql.module";

/**
 * Simplified App Module for GraphQL Federation Testing
 * Bypasses complex database and infrastructure dependencies
 */
@Module({
  imports: [
    // Only GraphQL module for federation testing
    UserGraphQLModule,
  ],
})
export class AppSimpleModule {}