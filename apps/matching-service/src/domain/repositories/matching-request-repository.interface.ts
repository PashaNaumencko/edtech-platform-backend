import { MatchingRequest } from '../entities/matching-request.entity';

export interface IMatchingRequestRepository {
  save(request: MatchingRequest): Promise<void>;
  findById(id: string): Promise<MatchingRequest | null>;
  findByStudentId(studentId: string): Promise<MatchingRequest[]>;
  findPending(): Promise<MatchingRequest[]>;
  findAll(offset: number, limit: number): Promise<{ requests: MatchingRequest[]; total: number }>;
  delete(id: string): Promise<void>;
}