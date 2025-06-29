import { Test, TestingModule } from '@nestjs/testing';
import { SharedNotificationsService } from './shared-notifications.service';

describe('SharedNotificationsService', () => {
  let service: SharedNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedNotificationsService],
    }).compile();

    service = module.get<SharedNotificationsService>(SharedNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
