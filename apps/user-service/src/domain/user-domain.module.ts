import { Module } from '@nestjs/common';
import { UserFactory } from './factories';

@Module({
  providers: [
    // Domain Factories
    UserFactory,

    // Domain Services (will be added as we need them)
    // UserDomainService,
  ],
  exports: [
    // Export factories for use in application layer
    UserFactory,

    // Export domain services
    // UserDomainService,
  ],
})
export class UserDomainModule {}
