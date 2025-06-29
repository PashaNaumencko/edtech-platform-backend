import { Module } from '@nestjs/common';
import { SharedNotificationsService } from './shared-notifications.service';

@Module({
  providers: [SharedNotificationsService],
  exports: [SharedNotificationsService],
})
export class SharedNotificationsModule {}
