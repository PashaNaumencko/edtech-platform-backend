import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { 
  User, 
  CreateUserInput, 
  CreateUserResponse, 
} from '../types/user.types';
import { CreateUserUseCase } from '../../../application/use-cases/create-user.usecase';
import { IUserRepository } from '../../../application/interfaces/repository.interface';
import { DI_TOKENS } from '../../../constants';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    @Inject(DI_TOKENS.USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Query(() => User, { nullable: true })
  async user(@Args('id') id: string): Promise<User | null> {
    const foundUser = await this.userRepository.findById(id);
    if (!foundUser) return null;

    return {
      id: foundUser.id,
      email: foundUser.email,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
      fullName: foundUser.fullName,
      role: foundUser.role,
      status: foundUser.status,
      bio: foundUser.bio,
      skills: foundUser.skills,
      isTutor: foundUser.isTutor(),
      isActive: foundUser.isActive(),
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
    };
  }

  @Query(() => [User])
  async users(): Promise<User[]> {
    const { users } = await this.userRepository.findAll(0, 10);
    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      bio: user.bio,
      skills: user.skills,
      isTutor: user.isTutor(),
      isActive: user.isActive(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  @Mutation(() => CreateUserResponse)
  async createUser(@Args('input') input: CreateUserInput): Promise<CreateUserResponse> {
    try {
      const user = await this.createUserUseCase.execute({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        // Use defaults for MVP
        role: undefined, // Will default to STUDENT
        status: undefined, // Will default to PENDING_VERIFICATION
        bio: undefined,
        skills: [],
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          bio: user.bio,
          skills: user.skills,
          isTutor: user.isTutor(),
          isActive: user.isActive(),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        errors: [],
      };
    } catch (error) {
      return {
        user: undefined,
        errors: [{ field: 'general', message: error.message }],
      };
    }
  }


  // Federation resolver for external service references
  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }): Promise<User | null> {
    return this.user(reference.id);
  }
}