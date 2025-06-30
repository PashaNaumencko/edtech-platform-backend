// Domain Business Contracts - Core business entities and repository contracts
// These interfaces define what a User IS and how we interact with User data

export interface IUser {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly isTutor: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  save(user: IUser): Promise<IUser>;
  delete(id: string): Promise<void>;
}

// Domain Value Objects and Creation Data
export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
}
