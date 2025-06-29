import { Module } from '@nestjs/common';
import { SharedAnalyticsService } from './shared-analytics.service';

@Module({
  providers: [SharedAnalyticsService],
  exports: [SharedAnalyticsService],
})
export class SharedAnalyticsModule {}
