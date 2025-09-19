import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { TutorResolver, MatchingRequestResolver } from './resolvers/tutor.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      typePaths: ['./**/*.graphql'],
      playground: true,
      introspection: true,
    }),
  ],
  providers: [TutorResolver, MatchingRequestResolver],
})
export class TutorMatchingGraphQLModule {}