import { Module } from '@nestjs/common';
import { SharedDomainService } from './shared-domain.service';

@Module({
  providers: [SharedDomainService],
  exports: [SharedDomainService],
})
export class SharedDomainModule {}
