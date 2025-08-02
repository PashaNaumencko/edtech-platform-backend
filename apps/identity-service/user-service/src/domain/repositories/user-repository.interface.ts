import { User } from '../entities/user.entity';
import { Email, UserId } from '../value-objects';

export interface IUserRepository {
  // Core CRUD operations
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: UserId): Promise<void>;

  // Business query methods
  findActiveUsers(): Promise<User[]>;
  findUsersByRole(role: string): Promise<User[]>;
  existsByEmail(email: Email): Promise<boolean>;

  // Pagination support
  findAll(
    offset: number,
    limit: number
  ): Promise<{
    users: User[];
    total: number;
  }>;

  // Business logic queries
  findTutors(isActive?: boolean): Promise<User[]>;
  findStudents(isActive?: boolean): Promise<User[]>;
}
