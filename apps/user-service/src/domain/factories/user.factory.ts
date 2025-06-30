import { Injectable } from '@nestjs/common';
import { CreateUserProps, User } from '../entities/user.entity';
import { UserRoleType } from '../value-objects';

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
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserFactory {
  /**
   * Creates a new student user
   */
  public createStudent(props: CreateStudentProps): User {
    return User.create({
      ...props,
      role: UserRoleType.STUDENT,
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
      role: UserRoleType.TUTOR,
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
      role: UserRoleType.ADMIN,
    });
  }

  /**
   * Creates a user with automatic role detection based on email domain
   */
  public createUserWithRoleDetection(props: CreateUserProps): User {
    const emailDomain = props.email.split('@')[1].toLowerCase();

    // Example business logic: certain domains are automatically tutors
    const tutorDomains = ['educator.com', 'university.edu', 'teacher.org'];
    const role = tutorDomains.includes(emailDomain) ? UserRoleType.TUTOR : UserRoleType.STUDENT;

    return User.create({
      ...props,
      role,
    });
  }

  /**
   * Reconstructs a user from persistence data
   */
  public fromPersistence(data: UserPersistenceData): User {
    return User.fromPersistence(data);
  }
}
