import { Controller, Get } from '@nestjs/common';
import { TutorMatchingServiceService } from './tutor-matching-service.service';

@Controller()
export class TutorMatchingServiceController {
  constructor(private readonly tutorMatchingServiceService: TutorMatchingServiceService) {}

  @Get()
  getHello(): string {
    return this.tutorMatchingServiceService.getHello();
  }
}
