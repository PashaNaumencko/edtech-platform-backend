import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DrizzleModule } from '@edtech/drizzle';

// Use Cases
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';

// Event Handlers
import { UserCreatedEventHandler } from './application/event-handlers/user-created.handler';

// Repositories
import { DrizzleUserRepository } from './infrastructure/repositories/drizzle-user.repository';

// Constants
import { DI_TOKENS } from './constants';

// Presentation
import { PresentationModule } from './presentation/presentation.module';

/**
 * App Module following unified microservice template
 * REST API focused with Drizzle ORM and essential components
 */
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
      database: process.env.DB_NAME || 'edtech_user_db',
      ssl: process.env.NODE_ENV === 'production',
    }),
    
    // Presentation layer (REST APIs)
    PresentationModule,
  ],
  providers: [
    // Repository
    {
      provide: DI_TOKENS.USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    
    // Use Cases
    CreateUserUseCase,
    
    // Event Handlers
    UserCreatedEventHandler,
  ],
})
export class AppModule {}