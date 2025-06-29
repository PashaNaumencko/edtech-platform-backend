import { Controller, Get } from '@nestjs/common';
import { LearningServiceService } from './learning-service.service';

@Controller()
export class LearningServiceController {
  constructor(private readonly learningServiceService: LearningServiceService) {}

  @Get()
  getHello(): string {
    return this.learningServiceService.getHello();
  }
}
