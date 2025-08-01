import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ServiceAuthGuard } from '@edtech/service-auth';
import { CreateUserUseCase } from '../../../application/use-cases/create-user/create-user.usecase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile/update-user-profile.usecase';
import { BecomeTutorUseCase } from '../../../application/use-cases/become-tutor/become-tutor.usecase';
import { 
  User, 
  CreateUserInput, 
  CreateUserResponse, 
  UpdateUserProfileInput,
  BecomeTutorInput 
} from '../types/user.types';

@Resolver(() => User)
@UseGuards(ServiceAuthGuard)
export class UserResolver {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly becomeTutorUseCase: BecomeTutorUseCase,
  ) {}

  @Query(() => User, { nullable: true })
  user(@Args('id') id: string): User | null {
    // TODO: Implement GetUserUseCase
    // For now, return mock data
    return {
      id,
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      role: 'STUDENT' as any,
      status: 'ACTIVE' as any,
      bio: 'A student user',
      skills: ['Math', 'Science'],
      isTutor: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Query(() => [User])
  users(): User[] {
    // TODO: Implement GetUsersUseCase with pagination parameters
    // For now, return mock data
    return [
      {
        id: '1',
        email: 'user1@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        role: 'STUDENT' as any,
        status: 'ACTIVE' as any,
        bio: 'A student user',
        skills: ['Math'],
        isTutor: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        email: 'tutor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        role: 'TUTOR' as any,
        status: 'ACTIVE' as any,
        bio: 'An experienced tutor',
        skills: ['Math', 'Science'],
        isTutor: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  @Mutation(() => CreateUserResponse)
  async createUser(@Args('input') input: CreateUserInput): Promise<CreateUserResponse> {
    try {
      const result = await this.createUserUseCase.execute({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      });

      return {
        user: {
          id: result.userId,
          email: result.email,
          firstName: result.firstName,
          lastName: result.lastName,
          fullName: `${result.firstName} ${result.lastName}`,
          role: result.role as any,
          status: result.status as any,
          bio: undefined,
          skills: [],
          isTutor: result.role === 'TUTOR',
          isActive: result.status === 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        errors: [],
      };
    } catch (error) {
      return {
        user: undefined,
        errors: [
          {
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        ],
      };
    }
  }

  @Mutation(() => User)
  async updateUserProfile(
    @Args('id') id: string,
    @Args('input') input: UpdateUserProfileInput,
  ): Promise<User> {
    const result = await this.updateUserProfileUseCase.execute({
      userId: id,
      firstName: input.firstName,
      lastName: input.lastName,
      bio: input.bio,
      skills: input.skills,
    });

    // Since the use case returns limited data, we'll need to fetch full user data
    // For now, return mock data based on the update response
    return {
      id: result.userId,
      email: 'updated@example.com',
      firstName: input.firstName || 'Updated',
      lastName: input.lastName || 'User',
      fullName: `${input.firstName || 'Updated'} ${input.lastName || 'User'}`,
      role: 'STUDENT' as any,
      status: 'ACTIVE' as any,
      bio: input.bio,
      skills: input.skills || [],
      isTutor: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Mutation(() => User)
  async becomeTutor(
    @Args('id') id: string,
    @Args('input') input: BecomeTutorInput,
  ): Promise<User> {
    const result = await this.becomeTutorUseCase.execute({
      userId: id,
      bio: input.bio,
      skills: input.skills,
    });

    // Return mock data based on the become tutor response
    return {
      id: result.userId,
      email: 'tutor@example.com',
      firstName: 'New',
      lastName: 'Tutor',
      fullName: 'New Tutor',
      role: result.newRole as any,
      status: 'ACTIVE' as any,
      bio: input.bio,
      skills: input.skills,
      isTutor: result.newRole === 'TUTOR',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Federation resolver for external service references
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }): User | null {
    return this.user(reference.id);
  }
}