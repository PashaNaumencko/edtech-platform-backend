import { Injectable } from '@nestjs/common';
import { User, UserStatus, UserRoleType } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../application/interfaces/repository.interface';

@Injectable()
export class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  async save(user: User): Promise<void> {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      this.users[index] = user;
    } else {
      this.users.push(user);
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async findAll(offset: number, limit: number): Promise<{ users: User[]; total: number }> {
    const total = this.users.length;
    const users = this.users.slice(offset, offset + limit);
    return { users, total };
  }

  async delete(id: string): Promise<void> {
    this.users = this.users.filter(u => u.id !== id);
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.users.some(u => u.email === email);
  }

  private initializeMockData(): void {
    // Create mock user 1
    const user1 = new User();
    Object.assign(user1, {
      id: '1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRoleType.STUDENT,
      status: UserStatus.ACTIVE,
      bio: 'Student looking for math tutoring',
      skills: ['mathematics', 'problem-solving'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    // Create mock user 2 (tutor)
    const user2 = new User();
    Object.assign(user2, {
      id: '2',
      email: 'tutor@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRoleType.TUTOR,
      status: UserStatus.ACTIVE,
      bio: 'Experienced mathematics tutor',
      skills: ['teaching', 'mathematics', 'physics'],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    });

    this.users = [user1, user2];
  }
}