import { Injectable } from '@nestjs/common';
import { CreateUserProps, User } from '../entities/user.entity';
import { UserRole } from '../value-objects';

export interface CreateStudentProps {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateTutorProps {
  email: string;
  firstName: string;
  lastName: string;
  specializations?: string[];
}

export interface UserPersistenceData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

@Injectable()
export class UserFactory {
  /**
   * Creates a new student user
   */
  public createStudent(props: CreateStudentProps): User {
    return User.create({
      ...props,
      role: UserRole.student(),
    });
  }

  /**
   * Creates a new tutor user
   */
  public createTutor(props: CreateTutorProps): User {
    return User.create({
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      role: UserRole.tutor(),
    });
  }

  /**
   * Creates a new admin user (restricted creation)
   */
  public createAdmin(props: CreateUserProps, createdBy: string): User {
    // Add business logic validation for admin creation
    if (!createdBy) {
      throw new Error('Admin creation must specify who created the admin');
    }

    return User.create({
      ...props,
      role: UserRole.admin(),
    });
  }

  /**
   * Creates a user with automatic role detection based on email domain
   */
  public createUserWithRoleDetection(props: CreateUserProps): User {
    const emailDomain = props.email.split('@')[1].toLowerCase();

    // Example business logic: certain domains are automatically tutors
    const tutorDomains = ['educator.com', 'university.edu', 'teacher.org'];
    const role = tutorDomains.includes(emailDomain) ? UserRole.tutor() : UserRole.student();

    return User.create({
      ...props,
      role,
    });
  }

  /**
   * Reconstructs a user from persistence data
   */
  public fromPersistence(data: UserPersistenceData): User {
    return User.fromPersistence({
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role.value,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      lastLoginAt: data.lastLoginAt
    });
  }
}
