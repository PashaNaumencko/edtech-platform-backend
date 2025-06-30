import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserDomainService } from './services';

@Module({
  imports: [CqrsModule],
  providers: [
    // Domain services
    UserDomainService,
  ],
  exports: [
    // Export services for application layer
    UserDomainService,
    // Export CqrsModule to make it available to importing modules
    CqrsModule,
  ],
})
export class UserDomainModule {}
