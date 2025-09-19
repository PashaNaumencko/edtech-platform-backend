import { Tutor } from '../entities/tutor.entity';

export interface ITutorRepository {
  save(tutor: Tutor): Promise<void>;
  findById(id: string): Promise<Tutor | null>;
  findByUserId(userId: string): Promise<Tutor | null>;
  findAll(offset: number, limit: number): Promise<{ tutors: Tutor[]; total: number }>;
  findBySubjects(subjects: string[]): Promise<Tutor[]>;
  delete(id: string): Promise<void>;
}