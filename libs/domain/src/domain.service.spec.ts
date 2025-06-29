import { Test, TestingModule } from '@nestjs/testing';
import { SharedDomainService } from './shared-domain.service';

describe('SharedDomainService', () => {
  let service: SharedDomainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharedDomainService],
    }).compile();

    service = module.get<SharedDomainService>(SharedDomainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
