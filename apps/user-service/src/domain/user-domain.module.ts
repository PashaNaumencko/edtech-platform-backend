import { Module } from '@nestjs/common';
import { UserFactory } from './factories';
import { UserDomainService } from './services';

@Module({
  providers: [
    // Domain Factories
    UserFactory,

    // Domain Services
    UserDomainService,
  ],
  exports: [
    // Export factories for use in application layer
    UserFactory,

    // Export domain services
    UserDomainService,
  ],
})
export class UserDomainModule {}
