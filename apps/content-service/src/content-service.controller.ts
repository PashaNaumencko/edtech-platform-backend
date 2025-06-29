import { Controller, Get } from '@nestjs/common';
import { ContentServiceService } from './content-service.service';

@Controller()
export class ContentServiceController {
  constructor(private readonly contentServiceService: ContentServiceService) {}

  @Get()
  getHello(): string {
    return this.contentServiceService.getHello();
  }
}
