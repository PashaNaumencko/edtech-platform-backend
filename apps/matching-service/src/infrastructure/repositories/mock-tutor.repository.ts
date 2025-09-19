import { Injectable } from '@nestjs/common';
import { Tutor, TutorSubject, ExperienceLevel, TutorStatus } from '../../domain/entities/tutor.entity';
import { ITutorRepository } from '../../domain/repositories/tutor-repository.interface';

@Injectable()
export class MockTutorRepository implements ITutorRepository {
  private tutors: Tutor[] = [];

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  async save(tutor: Tutor): Promise<void> {
    const index = this.tutors.findIndex(t => t.id === tutor.id);
    if (index >= 0) {
      this.tutors[index] = tutor;
    } else {
      this.tutors.push(tutor);
    }
  }

  async findById(id: string): Promise<Tutor | null> {
    return this.tutors.find(t => t.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Tutor | null> {
    return this.tutors.find(t => t.userId === userId) || null;
  }

  async findAll(offset: number, limit: number): Promise<{ tutors: Tutor[]; total: number }> {
    const total = this.tutors.length;
    const tutors = this.tutors.slice(offset, offset + limit);
    return { tutors, total };
  }

  async findBySubjects(subjects: string[]): Promise<Tutor[]> {
    return this.tutors.filter(tutor => 
      tutor.subjects.some(subject => subjects.includes(subject))
    );
  }

  async delete(id: string): Promise<void> {
    this.tutors = this.tutors.filter(t => t.id !== id);
  }

  private initializeMockData(): void {
    // Create mock tutor 1
    const tutor1 = new Tutor();
    Object.assign(tutor1, {
      id: 'tutor_1',
      userId: 'user_123',
      bio: 'Experienced math tutor',
      subjects: [TutorSubject.MATHEMATICS],
      experienceLevel: ExperienceLevel.INTERMEDIATE,
      hourlyRate: 50,
      currency: 'USD',
      languages: ['English'],
      education: 'MSc Mathematics',
      status: TutorStatus.ACTIVE,
      rating: 4.5,
      totalReviews: 10,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    // Create mock tutor 2
    const tutor2 = new Tutor();
    Object.assign(tutor2, {
      id: 'tutor_2',
      userId: 'user_456',
      bio: 'Physics and chemistry expert',
      subjects: [TutorSubject.PHYSICS, TutorSubject.CHEMISTRY],
      experienceLevel: ExperienceLevel.EXPERT,
      hourlyRate: 75,
      currency: 'USD',
      languages: ['English', 'Spanish'],
      education: 'PhD Physics',
      status: TutorStatus.ACTIVE,
      rating: 4.8,
      totalReviews: 25,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    });

    this.tutors = [tutor1, tutor2];
  }
}