import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { UserResolver } from './resolvers/user.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['./**/*.graphql'],
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      path: '/graphql',
      context: ({ req }) => ({ req }),
    }),
  ],
  providers: [UserResolver],
})
export class UserGraphQLModule {}