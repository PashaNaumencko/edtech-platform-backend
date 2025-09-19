import { Injectable } from '@nestjs/common';
import { MatchingRequest, MatchingRequestStatus } from '../../domain/entities/matching-request.entity';
import { IMatchingRequestRepository } from '../../domain/repositories/matching-request-repository.interface';

@Injectable()
export class MockMatchingRequestRepository implements IMatchingRequestRepository {
  private requests: MatchingRequest[] = [];

  async save(request: MatchingRequest): Promise<void> {
    const index = this.requests.findIndex(r => r.id === request.id);
    if (index >= 0) {
      this.requests[index] = request;
    } else {
      this.requests.push(request);
    }
  }

  async findById(id: string): Promise<MatchingRequest | null> {
    return this.requests.find(r => r.id === id) || null;
  }

  async findByStudentId(studentId: string): Promise<MatchingRequest[]> {
    return this.requests.filter(r => r.studentId === studentId);
  }

  async findPending(): Promise<MatchingRequest[]> {
    return this.requests.filter(r => r.status === MatchingRequestStatus.PENDING);
  }

  async findAll(offset: number, limit: number): Promise<{ requests: MatchingRequest[]; total: number }> {
    const total = this.requests.length;
    const requests = this.requests.slice(offset, offset + limit);
    return { requests, total };
  }

  async delete(id: string): Promise<void> {
    this.requests = this.requests.filter(r => r.id !== id);
  }
}