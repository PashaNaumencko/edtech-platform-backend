import { Test, TestingModule } from '@nestjs/testing';
import { SharedValidationService } from './shared-validation.service';

describe('SharedValidationService', () => {
  let service: SharedValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedValidationService],
    }).compile();

    service = module.get<SharedValidationService>(SharedValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
