import { User } from "../../domain/entities/user.entity";

/**
 * User Repository Interface
 *
 * Defines the contract for user data persistence in the application layer.
 * Simplified version for Day 13.
 */
export interface IUserRepository {
  /**
   * Saves a user entity
   */
  save(user: User): Promise<void>;

  /**
   * Finds a user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Finds a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds all users with pagination
   */
  findAll(offset: number, limit: number): Promise<{ users: User[]; total: number }>;

  /**
   * Deletes a user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a user exists by email
   */
  existsByEmail(email: string): Promise<boolean>;
}
