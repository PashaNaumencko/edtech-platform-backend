import { Module } from '@nestjs/common';
import { HttpModule } from './http/http.module';
import { UserGraphQLModule } from './graphql/graphql.module';

/**
 * Presentation Module
 * 
 * Combines all presentation layer modules including HTTP controllers and GraphQL resolvers.
 * This module provides both internal service-to-service HTTP APIs and GraphQL federation endpoints.
 */
@Module({
  imports: [
    HttpModule,        // Internal HTTP controllers for service-to-service communication
    UserGraphQLModule, // GraphQL federation resolvers for external API
  ],
  exports: [
    HttpModule,
    UserGraphQLModule,
  ],
})
export class PresentationModule {}