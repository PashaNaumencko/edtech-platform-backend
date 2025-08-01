import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriverConfig } from '@nestjs/graphql';
import { UserResolver } from './resolvers/user.resolver';
import { UserApplicationModule } from '../../application/user-application.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      path: '/graphql',
    } as ApolloDriverConfig),
    UserApplicationModule,
  ],
  providers: [UserResolver],
})
export class UserGraphQLModule {}