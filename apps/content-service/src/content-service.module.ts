import { Module } from '@nestjs/common';
import { ContentServiceController } from './content-service.controller';
import { ContentServiceService } from './content-service.service';

@Module({
  imports: [],
  controllers: [ContentServiceController],
  providers: [ContentServiceService],
})
export class ContentServiceModule {}
