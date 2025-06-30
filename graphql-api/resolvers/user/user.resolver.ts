// User Service GraphQL Resolver - Using Auto-Generated Types
// Day 4+ Implementation - Using GraphQL Code Generator types

import {
  User,
  CreateUserInput,
  CreateUserResponse,
  FieldError,
  MutationCreateUserArgs,
  QueryUserArgs,
  QueryUsersArgs,
} from '../../types/generated';

// Import AppSync-specific types
import { AppSyncEvent } from '../../types/appsync-types';

// Import JavaScript utilities (they remain as JS)
const { ValidationError, NotFoundError } = require('../../error-handling/graphql-errors');

/**
 * User Service Resolver - Using Auto-Generated Types
 * Demonstrates the power of GraphQL code generation for type safety
 */
export class UserResolver {
  // Mock data for demonstration
  private static mockUsers: User[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      isTutor: false,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
      isTutor: true,
      isActive: true,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
  ];

  /**
   * Get current user - Uses auto-generated User type
   */
  static async me(event: AppSyncEvent): Promise<User | null> {
    if (!event.identity?.sub) {
      throw new ValidationError('User not authenticated');
    }

    const user = this.mockUsers.find((u) => u.id === event.identity!.sub) || this.mockUsers[0];
    return {
      ...user,
      id: event.identity.sub,
      email: event.identity.email || user.email,
    };
  }

  /**
   * Get user by ID - Uses auto-generated QueryUserArgs type
   */
  static async getUserById(event: AppSyncEvent): Promise<User | null> {
    const args = event.arguments as QueryUserArgs;

    if (!args.id) {
      throw new ValidationError('User ID is required', 'id');
    }

    const user = this.mockUsers.find((u) => u.id === args.id);
    if (!user) {
      throw new NotFoundError('User', args.id);
    }

    return user;
  }

  /**
   * Get users list - Uses auto-generated QueryUsersArgs type
   */
  static async getUsers(event: AppSyncEvent): Promise<User[]> {
    const args = event.arguments as QueryUsersArgs;

    const limit = Math.min(Math.max(args.limit || 20, 1), 100);
    const offset = Math.max(args.offset || 0, 0);

    return this.mockUsers.slice(offset, offset + limit);
  }

  /**
   * Create new user - Uses auto-generated types with validation
   */
  static async createUser(event: AppSyncEvent): Promise<CreateUserResponse> {
    const args = event.arguments as MutationCreateUserArgs;
    const { input } = args;

    // Validation with structured error response using auto-generated FieldError type
    const errors: FieldError[] = [];

    if (!input.email) {
      errors.push({ field: 'email', message: 'Email is required' });
    } else if (!this.isValidEmail(input.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    if (!input.firstName) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }

    if (!input.lastName) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    }

    if (!input.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    } else if (input.password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    // Check for duplicate email
    if (input.email && this.mockUsers.some((u) => u.email === input.email)) {
      errors.push({ field: 'email', message: 'Email already exists' });
    }

    // Return structured response using auto-generated CreateUserResponse type
    if (errors.length > 0) {
      return { user: null, errors };
    }

    // Create new user using auto-generated User type
    const newUser: User = {
      id: (this.mockUsers.length + 1).toString(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: `${input.firstName} ${input.lastName}`,
      isTutor: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockUsers.push(newUser);
    return { user: newUser, errors: [] };
  }

  /**
   * Email validation helper
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Lambda handler function with auto-generated types
 * This demonstrates how TypeScript resolvers would be deployed with type safety
 */
export const handler = async (event: AppSyncEvent): Promise<any> => {
  console.log('GraphQL Event:', JSON.stringify(event, null, 2));

  try {
    switch (event.fieldName) {
      case 'me':
        return await UserResolver.me(event);

      case 'user':
        return await UserResolver.getUserById(event);

      case 'users':
        return await UserResolver.getUsers(event);

      case 'createUser':
        return await UserResolver.createUser(event);

      default:
        throw new Error(`Unknown field: ${event.fieldName}`);
    }
  } catch (error) {
    console.error('Resolver error:', error);
    throw error;
  }
}; 