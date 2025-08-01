import { Field, ObjectType, InputType, registerEnumType, ID } from '@nestjs/graphql';
import { UserRoleType, UserStatus } from '../../../domain/entities/user.entity';

// Register enums with GraphQL
registerEnumType(UserRoleType, {
  name: 'UserRole',
  description: 'User role in the system',
});

registerEnumType(UserStatus, {
  name: 'UserStatus',
  description: 'User account status',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  fullName!: string;

  @Field(() => UserRoleType)
  role!: UserRoleType;

  @Field(() => UserStatus)
  status!: UserStatus;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => [String])
  skills!: string[];

  @Field()
  isTutor!: boolean;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class FieldError {
  @Field()
  field!: string;

  @Field()
  message!: string;
}

@ObjectType()
export class CreateUserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [FieldError])
  errors!: FieldError[];
}

@InputType()
export class CreateUserInput {
  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  password!: string;
}

@InputType()
export class UpdateUserProfileInput {
  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => [String], { nullable: true })
  skills?: string[];
}

@InputType()
export class BecomeTutorInput {
  @Field()
  bio!: string;

  @Field(() => [String])
  skills!: string[];
}