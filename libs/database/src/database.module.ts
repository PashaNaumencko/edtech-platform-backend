import { Module } from '@nestjs/common';
import { SharedDatabaseService } from './shared-database.service';

@Module({
  providers: [SharedDatabaseService],
  exports: [SharedDatabaseService],
})
export class SharedDatabaseModule {}
