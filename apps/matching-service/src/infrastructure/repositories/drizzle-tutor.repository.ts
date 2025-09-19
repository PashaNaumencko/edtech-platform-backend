import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '@edtech/drizzle';
import { tutors, Tutor as DrizzleTutor } from '@edtech/drizzle/schemas';
import { ITutorRepository } from '../../domain/repositories/tutor-repository.interface';
import { Tutor } from '../../domain/entities/tutor.entity';

@Injectable()
export class DrizzleTutorRepository implements ITutorRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async save(tutor: Tutor): Promise<Tutor> {
    const tutorData = {
      id: tutor.id,
      userId: tutor.userId,
      hourlyRate: tutor.hourlyRate,
      availability: tutor.availability || {},
      subjects: tutor.subjects || [],
      languages: tutor.languages || [],
      experience: tutor.experience || null,
      qualifications: tutor.qualifications || [],
      isVerified: tutor.isVerified || false,
      updatedAt: new Date(),
    };

    const [savedTutor] = await this.drizzle.db
      .insert(tutors)
      .values(tutorData)
      .onConflictDoUpdate({
        target: tutors.id,
        set: {
          userId: tutorData.userId,
          hourlyRate: tutorData.hourlyRate,
          availability: tutorData.availability,
          subjects: tutorData.subjects,
          languages: tutorData.languages,
          experience: tutorData.experience,
          qualifications: tutorData.qualifications,
          isVerified: tutorData.isVerified,
          updatedAt: tutorData.updatedAt,
        },
      })
      .returning();

    return this.mapToDomainEntity(savedTutor);
  }

  async findById(id: string): Promise<Tutor | null> {
    const [tutor] = await this.drizzle.db
      .select()
      .from(tutors)
      .where(eq(tutors.id, id))
      .limit(1);

    return tutor ? this.mapToDomainEntity(tutor) : null;
  }

  async findByUserId(userId: string): Promise<Tutor | null> {
    const [tutor] = await this.drizzle.db
      .select()
      .from(tutors)
      .where(eq(tutors.userId, userId))
      .limit(1);

    return tutor ? this.mapToDomainEntity(tutor) : null;
  }

  async findAll(offset: number = 0, limit: number = 10): Promise<{ tutors: Tutor[], total: number }> {
    const foundTutors = await this.drizzle.db
      .select()
      .from(tutors)
      .offset(offset)
      .limit(limit);

    const [{ count }] = await this.drizzle.db
      .select({ count: tutors.id })
      .from(tutors);

    return {
      tutors: foundTutors.map(tutor => this.mapToDomainEntity(tutor)),
      total: count,
    };
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db
      .delete(tutors)
      .where(eq(tutors.id, id));
  }

  private mapToDomainEntity(dbTutor: DrizzleTutor): Tutor {
    const tutor = new Tutor();
    tutor.mergeObjectContext({
      id: dbTutor.id,
      userId: dbTutor.userId,
      hourlyRate: dbTutor.hourlyRate,
      availability: dbTutor.availability || {},
      subjects: Array.isArray(dbTutor.subjects) ? dbTutor.subjects : [],
      languages: Array.isArray(dbTutor.languages) ? dbTutor.languages : [],
      experience: dbTutor.experience,
      qualifications: Array.isArray(dbTutor.qualifications) ? dbTutor.qualifications : [],
      isVerified: dbTutor.isVerified || false,
      createdAt: dbTutor.createdAt,
      updatedAt: dbTutor.updatedAt,
    });
    return tutor;
  }
}