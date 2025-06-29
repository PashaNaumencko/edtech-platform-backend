import { Module } from '@nestjs/common';
import { SharedValidationService } from './shared-validation.service';

@Module({
  providers: [SharedValidationService],
  exports: [SharedValidationService],
})
export class SharedValidationModule {}
