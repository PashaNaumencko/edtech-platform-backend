import { Controller, Get } from '@nestjs/common';
import { UserServiceService } from './user-service.service';

// Main service controller - delegates to specific feature controllers
@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Get()
  getHello(): string {
    return this.userServiceService.getHello();
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'user-service',
      version: '1.0.0',
    };
  }
}
