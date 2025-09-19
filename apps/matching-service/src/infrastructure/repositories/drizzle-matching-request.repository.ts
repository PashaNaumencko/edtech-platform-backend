import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@edtech/drizzle';
import { matchingRequests, MatchingRequest as DrizzleMatchingRequest } from '@edtech/drizzle/schemas';
import { IMatchingRequestRepository } from '../../domain/repositories/matching-request-repository.interface';
import { MatchingRequest } from '../../domain/entities/matching-request.entity';

@Injectable()
export class DrizzleMatchingRequestRepository implements IMatchingRequestRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(matchingRequest: MatchingRequest): Promise<MatchingRequest> {
    const requestData = {
      id: matchingRequest.id,
      studentId: matchingRequest.studentId,
      subject: matchingRequest.subject,
      description: matchingRequest.description || null,
      budget: matchingRequest.budget,
      preferredLanguages: matchingRequest.preferredLanguages || [],
      availability: matchingRequest.availability || {},
      status: matchingRequest.status || 'PENDING',
      updatedAt: new Date(),
    };

    const [savedRequest] = await this.drizzle.db
      .insert(matchingRequests)
      .values(requestData)
      .onConflictDoUpdate({
        target: matchingRequests.id,
        set: {
          studentId: requestData.studentId,
          subject: requestData.subject,
          description: requestData.description,
          budget: requestData.budget,
          preferredLanguages: requestData.preferredLanguages,
          availability: requestData.availability,
          status: requestData.status,
          updatedAt: requestData.updatedAt,
        },
      })
      .returning();

    return this.mapToDomainEntity(savedRequest);
  }

  async findById(id: string): Promise<MatchingRequest | null> {
    const [request] = await this.drizzle.db
      .select()
      .from(matchingRequests)
      .where(eq(matchingRequests.id, id))
      .limit(1);

    return request ? this.mapToDomainEntity(request) : null;
  }

  async findByStudentId(studentId: string): Promise<MatchingRequest[]> {
    const requests = await this.drizzle.db
      .select()
      .from(matchingRequests)
      .where(eq(matchingRequests.studentId, studentId));

    return requests.map(request => this.mapToDomainEntity(request));
  }

  async findAll(offset: number = 0, limit: number = 10): Promise<{ requests: MatchingRequest[], total: number }> {
    const foundRequests = await this.drizzle.db
      .select()
      .from(matchingRequests)
      .offset(offset)
      .limit(limit);

    const [{ count }] = await this.drizzle.db
      .select({ count: matchingRequests.id })
      .from(matchingRequests);

    return {
      requests: foundRequests.map(request => this.mapToDomainEntity(request)),
      total: count,
    };
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db
      .delete(matchingRequests)
      .where(eq(matchingRequests.id, id));
  }

  private mapToDomainEntity(dbRequest: DrizzleMatchingRequest): MatchingRequest {
    const request = new MatchingRequest();
    request.mergeObjectContext({
      id: dbRequest.id,
      studentId: dbRequest.studentId,
      subject: dbRequest.subject,
      description: dbRequest.description,
      budget: dbRequest.budget,
      preferredLanguages: Array.isArray(dbRequest.preferredLanguages) ? dbRequest.preferredLanguages : [],
      availability: dbRequest.availability || {},
      status: dbRequest.status,
      createdAt: dbRequest.createdAt,
      updatedAt: dbRequest.updatedAt,
    });
    return request;
  }
}