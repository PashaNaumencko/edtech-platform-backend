import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { DrizzleModule } from '@edtech/drizzle';

// Use Cases
import { CreateTutorUseCase } from './application/use-cases/create-tutor.usecase';
import { CreateMatchingRequestUseCase } from './application/use-cases/create-matching-request.usecase';

// Event Handlers
import { TutorCreatedHandler } from './application/event-handlers/tutor-created.handler';
import { MatchingRequestCreatedHandler } from './application/event-handlers/matching-request-created.handler';

// Repositories
import { DrizzleTutorRepository } from './infrastructure/repositories/drizzle-tutor.repository';
import { DrizzleMatchingRequestRepository } from './infrastructure/repositories/drizzle-matching-request.repository';

// Constants
import { DI_TOKENS } from './constants';

// Resolvers
import { TutorResolver, MatchingRequestResolver } from './presentation/graphql/resolvers/tutor.resolver';

@Module({
  imports: [
    // CQRS for events and commands
    CqrsModule,
    
    // Drizzle ORM
    DrizzleModule.forRoot({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'edtech_tutor_db',
      ssl: process.env.NODE_ENV === 'production',
    }),
    
    // GraphQL Federation
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      playground: true,
      introspection: true,
    }),
  ],
  providers: [
    // Repositories
    {
      provide: DI_TOKENS.TUTOR_REPOSITORY,
      useClass: DrizzleTutorRepository,
    },
    {
      provide: DI_TOKENS.MATCHING_REQUEST_REPOSITORY,
      useClass: DrizzleMatchingRequestRepository,
    },
    
    // Use Cases
    CreateTutorUseCase,
    CreateMatchingRequestUseCase,
    
    // Event Handlers
    TutorCreatedHandler,
    MatchingRequestCreatedHandler,
    
    // Resolvers
    TutorResolver,
    MatchingRequestResolver,
  ],
})
export class AppModule {}