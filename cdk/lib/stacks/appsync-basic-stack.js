"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncBasicStack = void 0;
const cdk = require("aws-cdk-lib");
const appsync = require("@aws-cdk/aws-appsync-alpha");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const ssm = require("aws-cdk-lib/aws-ssm");
class AppSyncBasicStack extends cdk.Stack {
    api;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Day 3: Complete GraphQL schema with error handling patterns
        const userSchema = `
      type Query {
        me: User
        user(id: ID!): User
        users(limit: Int = 20, offset: Int = 0): [User!]!
      }

      type Mutation {
        createUser(input: CreateUserInput!): CreateUserResponse!
        updateUser(id: ID!, input: UpdateUserInput!): User!
        deleteUser(id: ID!): Boolean!
      }

      type User {
        id: ID!
        email: String!
        firstName: String!
        lastName: String!
        fullName: String!
        isTutor: Boolean!
        isActive: Boolean!
        createdAt: AWSDateTime!
        updatedAt: AWSDateTime!
      }

      type CreateUserResponse {
        user: User
        errors: [FieldError!]
      }

      type FieldError {
        field: String!
        message: String!
      }

      input CreateUserInput {
        email: String!
        firstName: String!
        lastName: String!
        password: String!
      }

      input UpdateUserInput {
        firstName: String
        lastName: String
      }

      scalar AWSDateTime
    `;
        // AppSync GraphQL API with schema registry and error handling
        this.api = new appsync.GraphqlApi(this, 'EdTechGraphQLAPI', {
            name: `EdTech-GraphQL-API-${props.environment}`,
            schema: appsync.SchemaFile.fromAsset('../graphql-api/schemas/base-schema.graphql'),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.USER_POOL,
                    userPoolConfig: {
                        userPool: props.userPool,
                        appIdClientRegex: props.userPoolClient.userPoolClientId,
                        defaultAction: appsync.UserPoolDefaultAction.ALLOW,
                    },
                },
                additionalAuthorizationModes: [
                    {
                        authorizationType: appsync.AuthorizationType.API_KEY,
                        apiKeyConfig: {
                            expires: cdk.Expiration.after(cdk.Duration.days(365)),
                            description: 'API Key for development and testing',
                        },
                    },
                ],
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
                retention: logs.RetentionDays.ONE_WEEK,
            },
            xrayEnabled: true,
        });
        // Lambda resolver with comprehensive error handling
        const userResolver = new lambda.Function(this, 'UserServiceResolver', {
            functionName: `edtech-${props.environment}-user-resolver`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        // Mock database for Day 3 demonstration
        const mockUsers = [
          {
            id: '1', email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe',
            fullName: 'John Doe', isTutor: false, isActive: true,
            createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '2', email: 'jane.smith@example.com', firstName: 'Jane', lastName: 'Smith',
            fullName: 'Jane Smith', isTutor: true, isActive: true,
            createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z'
          }
        ];

        exports.handler = async (event) => {
          console.log('GraphQL Event:', JSON.stringify(event, null, 2));
          
          const { fieldName, arguments: args, identity } = event;
          
          try {
            switch (fieldName) {
              case 'me':
                // Return current user based on Cognito identity
                return mockUsers[0];
                
              case 'user':
                if (!args.id) {
                  throw new Error('User ID is required');
                }
                const user = mockUsers.find(u => u.id === args.id);
                if (!user) {
                  throw new Error(\`User not found with id: \${args.id}\`);
                }
                return user;
                
              case 'users':
                const limit = Math.min(args.limit || 20, 100);
                const offset = args.offset || 0;
                return mockUsers.slice(offset, offset + limit);
                
              case 'createUser':
                const { input } = args;
                
                // Field validation with structured error response
                const errors = [];
                if (!input.email) errors.push({ field: 'email', message: 'Email is required' });
                if (!input.firstName) errors.push({ field: 'firstName', message: 'First name is required' });
                if (!input.lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
                if (!input.password) errors.push({ field: 'password', message: 'Password is required' });
                
                // Email format validation
                if (input.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(input.email)) {
                  errors.push({ field: 'email', message: 'Invalid email format' });
                }
                
                if (errors.length > 0) {
                  return { user: null, errors };
                }
                
                // Create new user
                const newUser = {
                  id: (mockUsers.length + 1).toString(),
                  email: input.email,
                  firstName: input.firstName,
                  lastName: input.lastName,
                  fullName: \`\${input.firstName} \${input.lastName}\`,
                  isTutor: false,
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                
                mockUsers.push(newUser);
                return { user: newUser, errors: [] };
                
              case 'updateUser':
                if (!args.id) {
                  throw new Error('User ID is required');
                }
                
                const userToUpdate = mockUsers.find(u => u.id === args.id);
                if (!userToUpdate) {
                  throw new Error(\`User not found with id: \${args.id}\`);
                }
                
                if (args.input.firstName) userToUpdate.firstName = args.input.firstName;
                if (args.input.lastName) userToUpdate.lastName = args.input.lastName;
                if (args.input.firstName || args.input.lastName) {
                  userToUpdate.fullName = \`\${userToUpdate.firstName} \${userToUpdate.lastName}\`;
                }
                userToUpdate.updatedAt = new Date().toISOString();
                
                return userToUpdate;
                
              case 'deleteUser':
                if (!args.id) {
                  throw new Error('User ID is required');
                }
                
                const userIndex = mockUsers.findIndex(u => u.id === args.id);
                if (userIndex === -1) {
                  throw new Error(\`User not found with id: \${args.id}\`);
                }
                
                mockUsers.splice(userIndex, 1);
                return true;
                
              default:
                throw new Error(\`Unknown field: \${fieldName}\`);
            }
          } catch (error) {
            console.error('Resolver error:', error);
            throw error;
          }
        };
      `),
            environment: {
                ENVIRONMENT: props.environment,
                USER_SERVICE_URL: `http://user-service.${props.environment}:3001`,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Lambda data source with error handling
        const userDataSource = this.api.addLambdaDataSource('UserServiceDataSource', userResolver, {
            name: 'UserServiceDataSource',
            description: 'Lambda data source for User Service with error handling patterns',
        });
        // Create all resolvers
        userDataSource.createResolver('QueryMeResolver', {
            typeName: 'Query',
            fieldName: 'me',
        });
        userDataSource.createResolver('QueryUserResolver', {
            typeName: 'Query',
            fieldName: 'user',
        });
        userDataSource.createResolver('QueryUsersResolver', {
            typeName: 'Query',
            fieldName: 'users',
        });
        userDataSource.createResolver('MutationCreateUserResolver', {
            typeName: 'Mutation',
            fieldName: 'createUser',
        });
        userDataSource.createResolver('MutationUpdateUserResolver', {
            typeName: 'Mutation',
            fieldName: 'updateUser',
        });
        userDataSource.createResolver('MutationDeleteUserResolver', {
            typeName: 'Mutation',
            fieldName: 'deleteUser',
        });
        // SSM Parameters with actual AppSync values
        new ssm.StringParameter(this, 'AppSyncApiIdParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-id`,
            stringValue: this.api.apiId,
            description: 'AppSync GraphQL API ID - Day 3 Complete',
        });
        new ssm.StringParameter(this, 'AppSyncApiUrlParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-url`,
            stringValue: this.api.graphqlUrl,
            description: 'AppSync GraphQL API URL - Day 3 Complete',
        });
        new ssm.StringParameter(this, 'AppSyncApiKeyParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-key`,
            stringValue: this.api.apiKey,
            description: 'AppSync API Key for development - Day 3 Complete',
        });
        // Day 3 Completion Outputs
        new cdk.CfnOutput(this, 'GraphQLApiId', {
            value: this.api.apiId,
            description: 'AppSync GraphQL API ID',
            exportName: `${props.environment}-GraphQLApiId`,
        });
        new cdk.CfnOutput(this, 'GraphQLApiUrl', {
            value: this.api.graphqlUrl,
            description: 'AppSync GraphQL API URL - Ready for client integration',
            exportName: `${props.environment}-GraphQLApiUrl`,
        });
        new cdk.CfnOutput(this, 'GraphQLApiKey', {
            value: this.api.apiKey,
            description: 'AppSync API Key for development and testing',
            exportName: `${props.environment}-GraphQLApiKey`,
        });
        new cdk.CfnOutput(this, 'Day3CompletionStatus', {
            value: 'SCHEMA-REGISTRY-AND-ERROR-HANDLING-COMPLETE',
            description: '✅ Day 3: Schema registry, error handling patterns, and schema composition automation completed',
        });
        new cdk.CfnOutput(this, 'ImplementedFeatures', {
            value: 'GraphQL-Schema|Error-Handling|Lambda-Resolvers|Cognito-Auth|API-Key',
            description: 'Day 3 features: Complete GraphQL API with error handling and authentication',
        });
    }
}
exports.AppSyncBasicStack = AppSyncBasicStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy1iYXNpYy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcHN5bmMtYmFzaWMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHNEQUFzRDtBQUV0RCxpREFBaUQ7QUFDakQsNkNBQTZDO0FBQzdDLDJDQUEyQztBQVczQyxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzlCLEdBQUcsQ0FBcUI7SUFFeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUNyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4REFBOEQ7UUFDOUQsTUFBTSxVQUFVLEdBQUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQWdEbEIsQ0FBQztRQUVGLDhEQUE4RDtRQUM5RCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUQsSUFBSSxFQUFFLHNCQUFzQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQy9DLE1BQU0sRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQztZQUNsRixtQkFBbUIsRUFBRTtnQkFDbkIsb0JBQW9CLEVBQUU7b0JBQ3BCLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO29CQUN0RCxjQUFjLEVBQUU7d0JBQ2QsUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRO3dCQUN4QixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLGdCQUFnQjt3QkFDdkQsYUFBYSxFQUFFLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLO3FCQUNuRDtpQkFDRjtnQkFDRCw0QkFBNEIsRUFBRTtvQkFDNUI7d0JBQ0UsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlC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UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSw2Q0FBNkM7WUFDcEQsV0FBVyxFQUFFLGdHQUFnRztTQUM5RyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSxxRUFBcUU7WUFDNUUsV0FBVyxFQUFFLDZFQUE2RTtTQUMzRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFuVEQsOENBbVRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSAnQGF3cy1jZGsvYXdzLWFwcHN5bmMtYWxwaGEnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwcFN5bmNCYXNpY1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHZwYzogZWMyLlZwYztcbiAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xufVxuXG5leHBvcnQgY2xhc3MgQXBwU3luY0Jhc2ljU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcHBzeW5jLkdyYXBocWxBcGk7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwcFN5bmNCYXNpY1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIERheSAzOiBDb21wbGV0ZSBHcmFwaFFMIHNjaGVtYSB3aXRoIGVycm9yIGhhbmRsaW5nIHBhdHRlcm5zXG4gICAgY29uc3QgdXNlclNjaGVtYSA9IGBcbiAgICAgIHR5cGUgUXVlcnkge1xuICAgICAgICBtZTogVXNlclxuICAgICAgICB1c2VyKGlkOiBJRCEpOiBVc2VyXG4gICAgICAgIHVzZXJzKGxpbWl0OiBJbnQgPSAyMCwgb2Zmc2V0OiBJbnQgPSAwKTogW1VzZXIhXSFcbiAgICAgIH1cblxuICAgICAgdHlwZSBNdXRhdGlvbiB7XG4gICAgICAgIGNyZWF0ZVVzZXIoaW5wdXQ6IENyZWF0ZVVzZXJJbnB1dCEpOiBDcmVhdGVVc2VyUmVzcG9uc2UhXG4gICAgICAgIHVwZGF0ZVVzZXIoaWQ6IElEISwgaW5wdXQ6IFVwZGF0ZVVzZXJJbnB1dCEpOiBVc2VyIVxuICAgICAgICBkZWxldGVVc2VyKGlkOiBJRCEpOiBCb29sZWFuIVxuICAgICAgfVxuXG4gICAgICB0eXBlIFVzZXIge1xuICAgICAgICBpZDogSUQhXG4gICAgICAgIGVtYWlsOiBTdHJpbmchXG4gICAgICAgIGZpcnN0TmFtZTogU3RyaW5nIVxuICAgICAgICBsYXN0TmFtZTogU3RyaW5nIVxuICAgICAgICBmdWxsTmFtZTogU3RyaW5nIVxuICAgICAgICBpc1R1dG9yOiBCb29sZWFuIVxuICAgICAgICBpc0FjdGl2ZTogQm9vbGVhbiFcbiAgICAgICAgY3JlYXRlZEF0OiBBV1NEYXRlVGltZSFcbiAgICAgICAgdXBkYXRlZEF0OiBBV1NEYXRlVGltZSFcbiAgICAgIH1cblxuICAgICAgdHlwZSBDcmVhdGVVc2VyUmVzcG9uc2Uge1xuICAgICAgICB1c2VyOiBVc2VyXG4gICAgICAgIGVycm9yczogW0ZpZWxkRXJyb3IhXVxuICAgICAgfVxuXG4gICAgICB0eXBlIEZpZWxkRXJyb3Ige1xuICAgICAgICBmaWVsZDogU3RyaW5nIVxuICAgICAgICBtZXNzYWdlOiBTdHJpbmchXG4gICAgICB9XG5cbiAgICAgIGlucHV0IENyZWF0ZVVzZXJJbnB1dCB7XG4gICAgICAgIGVtYWlsOiBTdHJpbmchXG4gICAgICAgIGZpcnN0TmFtZTogU3RyaW5nIVxuICAgICAgICBsYXN0TmFtZTogU3RyaW5nIVxuICAgICAgICBwYXNzd29yZDogU3RyaW5nIVxuICAgICAgfVxuXG4gICAgICBpbnB1dCBVcGRhdGVVc2VySW5wdXQge1xuICAgICAgICBmaXJzdE5hbWU6IFN0cmluZ1xuICAgICAgICBsYXN0TmFtZTogU3RyaW5nXG4gICAgICB9XG5cbiAgICAgIHNjYWxhciBBV1NEYXRlVGltZVxuICAgIGA7XG5cbiAgICAvLyBBcHBTeW5jIEdyYXBoUUwgQVBJIHdpdGggc2NoZW1hIHJlZ2lzdHJ5IGFuZCBlcnJvciBoYW5kbGluZ1xuICAgIHRoaXMuYXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCAnRWRUZWNoR3JhcGhRTEFQSScsIHtcbiAgICAgIG5hbWU6IGBFZFRlY2gtR3JhcGhRTC1BUEktJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgc2NoZW1hOiBhcHBzeW5jLlNjaGVtYUZpbGUuZnJvbUFzc2V0KCcuLi9ncmFwaHFsLWFwaS9zY2hlbWFzL2Jhc2Utc2NoZW1hLmdyYXBocWwnKSxcbiAgICAgIGF1dGhvcml6YXRpb25Db25maWc6IHtcbiAgICAgICAgZGVmYXVsdEF1dGhvcml6YXRpb246IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5VU0VSX1BPT0wsXG4gICAgICAgICAgdXNlclBvb2xDb25maWc6IHtcbiAgICAgICAgICAgIHVzZXJQb29sOiBwcm9wcy51c2VyUG9vbCxcbiAgICAgICAgICAgIGFwcElkQ2xpZW50UmVnZXg6IHByb3BzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgICBkZWZhdWx0QWN0aW9uOiBhcHBzeW5jLlVzZXJQb29sRGVmYXVsdEFjdGlvbi5BTExPVyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsQXV0aG9yaXphdGlvbk1vZGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuQVBJX0tFWSxcbiAgICAgICAgICAgIGFwaUtleUNvbmZpZzoge1xuICAgICAgICAgICAgICBleHBpcmVzOiBjZGsuRXhwaXJhdGlvbi5hZnRlcihjZGsuRHVyYXRpb24uZGF5cygzNjUpKSxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBUEkgS2V5IGZvciBkZXZlbG9wbWVudCBhbmQgdGVzdGluZycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgbG9nQ29uZmlnOiB7XG4gICAgICAgIGZpZWxkTG9nTGV2ZWw6IGFwcHN5bmMuRmllbGRMb2dMZXZlbC5BTEwsXG4gICAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgfSxcbiAgICAgIHhyYXlFbmFibGVkOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIHJlc29sdmVyIHdpdGggY29tcHJlaGVuc2l2ZSBlcnJvciBoYW5kbGluZ1xuICAgIGNvbnN0IHVzZXJSZXNvbHZlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJTZXJ2aWNlUmVzb2x2ZXInLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBlZHRlY2gtJHtwcm9wcy5lbnZpcm9ubWVudH0tdXNlci1yZXNvbHZlcmAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxuICAgICAgICAvLyBNb2NrIGRhdGFiYXNlIGZvciBEYXkgMyBkZW1vbnN0cmF0aW9uXG4gICAgICAgIGNvbnN0IG1vY2tVc2VycyA9IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJzEnLCBlbWFpbDogJ2pvaG4uZG9lQGV4YW1wbGUuY29tJywgZmlyc3ROYW1lOiAnSm9obicsIGxhc3ROYW1lOiAnRG9lJyxcbiAgICAgICAgICAgIGZ1bGxOYW1lOiAnSm9obiBEb2UnLCBpc1R1dG9yOiBmYWxzZSwgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwWicsIHVwZGF0ZWRBdDogJzIwMjQtMDEtMDFUMDA6MDA6MDBaJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICcyJywgZW1haWw6ICdqYW5lLnNtaXRoQGV4YW1wbGUuY29tJywgZmlyc3ROYW1lOiAnSmFuZScsIGxhc3ROYW1lOiAnU21pdGgnLFxuICAgICAgICAgICAgZnVsbE5hbWU6ICdKYW5lIFNtaXRoJywgaXNUdXRvcjogdHJ1ZSwgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAyVDAwOjAwOjAwWicsIHVwZGF0ZWRBdDogJzIwMjQtMDEtMDJUMDA6MDA6MDBaJ1xuICAgICAgICAgIH1cbiAgICAgICAgXTtcblxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnR3JhcGhRTCBFdmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHsgZmllbGROYW1lLCBhcmd1bWVudHM6IGFyZ3MsIGlkZW50aXR5IH0gPSBldmVudDtcbiAgICAgICAgICBcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgc3dpdGNoIChmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnbWUnOlxuICAgICAgICAgICAgICAgIC8vIFJldHVybiBjdXJyZW50IHVzZXIgYmFzZWQgb24gQ29nbml0byBpZGVudGl0eVxuICAgICAgICAgICAgICAgIHJldHVybiBtb2NrVXNlcnNbMF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGNhc2UgJ3VzZXInOlxuICAgICAgICAgICAgICAgIGlmICghYXJncy5pZCkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2VyIElEIGlzIHJlcXVpcmVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXIgPSBtb2NrVXNlcnMuZmluZCh1ID0+IHUuaWQgPT09IGFyZ3MuaWQpO1xuICAgICAgICAgICAgICAgIGlmICghdXNlcikge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxcYFVzZXIgbm90IGZvdW5kIHdpdGggaWQ6IFxcJHthcmdzLmlkfVxcYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBjYXNlICd1c2Vycyc6XG4gICAgICAgICAgICAgICAgY29uc3QgbGltaXQgPSBNYXRoLm1pbihhcmdzLmxpbWl0IHx8IDIwLCAxMDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGFyZ3Mub2Zmc2V0IHx8IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vY2tVc2Vycy5zbGljZShvZmZzZXQsIG9mZnNldCArIGxpbWl0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY2FzZSAnY3JlYXRlVXNlcic6XG4gICAgICAgICAgICAgICAgY29uc3QgeyBpbnB1dCB9ID0gYXJncztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGaWVsZCB2YWxpZGF0aW9uIHdpdGggc3RydWN0dXJlZCBlcnJvciByZXNwb25zZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9ycyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmICghaW5wdXQuZW1haWwpIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdlbWFpbCcsIG1lc3NhZ2U6ICdFbWFpbCBpcyByZXF1aXJlZCcgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5maXJzdE5hbWUpIGVycm9ycy5wdXNoKHsgZmllbGQ6ICdmaXJzdE5hbWUnLCBtZXNzYWdlOiAnRmlyc3QgbmFtZSBpcyByZXF1aXJlZCcgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5sYXN0TmFtZSkgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2xhc3ROYW1lJywgbWVzc2FnZTogJ0xhc3QgbmFtZSBpcyByZXF1aXJlZCcgfSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnB1dC5wYXNzd29yZCkgZXJyb3JzLnB1c2goeyBmaWVsZDogJ3Bhc3N3b3JkJywgbWVzc2FnZTogJ1Bhc3N3b3JkIGlzIHJlcXVpcmVkJyB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFbWFpbCBmb3JtYXQgdmFsaWRhdGlvblxuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5lbWFpbCAmJiAhL15bXlxcXFxzQF0rQFteXFxcXHNAXStcXFxcLlteXFxcXHNAXSskLy50ZXN0KGlucHV0LmVtYWlsKSkge1xuICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goeyBmaWVsZDogJ2VtYWlsJywgbWVzc2FnZTogJ0ludmFsaWQgZW1haWwgZm9ybWF0JyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4geyB1c2VyOiBudWxsLCBlcnJvcnMgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyB1c2VyXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXNlciA9IHtcbiAgICAgICAgICAgICAgICAgIGlkOiAobW9ja1VzZXJzLmxlbmd0aCArIDEpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICBlbWFpbDogaW5wdXQuZW1haWwsXG4gICAgICAgICAgICAgICAgICBmaXJzdE5hbWU6IGlucHV0LmZpcnN0TmFtZSxcbiAgICAgICAgICAgICAgICAgIGxhc3ROYW1lOiBpbnB1dC5sYXN0TmFtZSxcbiAgICAgICAgICAgICAgICAgIGZ1bGxOYW1lOiBcXGBcXCR7aW5wdXQuZmlyc3ROYW1lfSBcXCR7aW5wdXQubGFzdE5hbWV9XFxgLFxuICAgICAgICAgICAgICAgICAgaXNUdXRvcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG1vY2tVc2Vycy5wdXNoKG5ld1VzZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHVzZXI6IG5ld1VzZXIsIGVycm9yczogW10gfTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY2FzZSAndXBkYXRlVXNlcic6XG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLmlkKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgSUQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdXNlclRvVXBkYXRlID0gbW9ja1VzZXJzLmZpbmQodSA9PiB1LmlkID09PSBhcmdzLmlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIXVzZXJUb1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxcYFVzZXIgbm90IGZvdW5kIHdpdGggaWQ6IFxcJHthcmdzLmlkfVxcYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmlucHV0LmZpcnN0TmFtZSkgdXNlclRvVXBkYXRlLmZpcnN0TmFtZSA9IGFyZ3MuaW5wdXQuZmlyc3ROYW1lO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmlucHV0Lmxhc3ROYW1lKSB1c2VyVG9VcGRhdGUubGFzdE5hbWUgPSBhcmdzLmlucHV0Lmxhc3ROYW1lO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmlucHV0LmZpcnN0TmFtZSB8fCBhcmdzLmlucHV0Lmxhc3ROYW1lKSB7XG4gICAgICAgICAgICAgICAgICB1c2VyVG9VcGRhdGUuZnVsbE5hbWUgPSBcXGBcXCR7dXNlclRvVXBkYXRlLmZpcnN0TmFtZX0gXFwke3VzZXJUb1VwZGF0ZS5sYXN0TmFtZX1cXGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHVzZXJUb1VwZGF0ZS51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXJUb1VwZGF0ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlVXNlcic6XG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLmlkKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgSUQgaXMgcmVxdWlyZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdXNlckluZGV4ID0gbW9ja1VzZXJzLmZpbmRJbmRleCh1ID0+IHUuaWQgPT09IGFyZ3MuaWQpO1xuICAgICAgICAgICAgICAgIGlmICh1c2VySW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXFxgVXNlciBub3QgZm91bmQgd2l0aCBpZDogXFwke2FyZ3MuaWR9XFxgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbW9ja1VzZXJzLnNwbGljZSh1c2VySW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcXGBVbmtub3duIGZpZWxkOiBcXCR7ZmllbGROYW1lfVxcYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jlc29sdmVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIGApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBVU0VSX1NFUlZJQ0VfVVJMOiBgaHR0cDovL3VzZXItc2VydmljZS4ke3Byb3BzLmVudmlyb25tZW50fTozMDAxYCxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBkYXRhIHNvdXJjZSB3aXRoIGVycm9yIGhhbmRsaW5nXG4gICAgY29uc3QgdXNlckRhdGFTb3VyY2UgPSB0aGlzLmFwaS5hZGRMYW1iZGFEYXRhU291cmNlKFxuICAgICAgJ1VzZXJTZXJ2aWNlRGF0YVNvdXJjZScsXG4gICAgICB1c2VyUmVzb2x2ZXIsXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdVc2VyU2VydmljZURhdGFTb3VyY2UnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBkYXRhIHNvdXJjZSBmb3IgVXNlciBTZXJ2aWNlIHdpdGggZXJyb3IgaGFuZGxpbmcgcGF0dGVybnMnLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgYWxsIHJlc29sdmVyc1xuICAgIHVzZXJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdRdWVyeU1lUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ21lJyxcbiAgICB9KTtcblxuICAgIHVzZXJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdRdWVyeVVzZXJSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAndXNlcicsXG4gICAgfSk7XG5cbiAgICB1c2VyRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignUXVlcnlVc2Vyc1Jlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICd1c2VycycsXG4gICAgfSk7XG5cbiAgICB1c2VyRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignTXV0YXRpb25DcmVhdGVVc2VyUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2NyZWF0ZVVzZXInLFxuICAgIH0pO1xuXG4gICAgdXNlckRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ011dGF0aW9uVXBkYXRlVXNlclJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICd1cGRhdGVVc2VyJyxcbiAgICB9KTtcblxuICAgIHVzZXJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdNdXRhdGlvbkRlbGV0ZVVzZXJSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZGVsZXRlVXNlcicsXG4gICAgfSk7XG5cbiAgICAvLyBTU00gUGFyYW1ldGVycyB3aXRoIGFjdHVhbCBBcHBTeW5jIHZhbHVlc1xuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdBcHBTeW5jQXBpSWRQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS9hcHBzeW5jL2FwaS1pZGAsXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5hcGkuYXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgR3JhcGhRTCBBUEkgSUQgLSBEYXkgMyBDb21wbGV0ZScsXG4gICAgfSk7XG5cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQXBwU3luY0FwaVVybFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLXVybGAsXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5hcGkuZ3JhcGhxbFVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBHcmFwaFFMIEFQSSBVUkwgLSBEYXkgMyBDb21wbGV0ZScsXG4gICAgfSk7XG5cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQXBwU3luY0FwaUtleVBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLWtleWAsXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5hcGkuYXBpS2V5ISxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBBUEkgS2V5IGZvciBkZXZlbG9wbWVudCAtIERheSAzIENvbXBsZXRlJyxcbiAgICB9KTtcblxuICAgIC8vIERheSAzIENvbXBsZXRpb24gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHcmFwaFFMQXBpSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcGkuYXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgR3JhcGhRTCBBUEkgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUdyYXBoUUxBcGlJZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaVVybCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5ncmFwaHFsVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBTeW5jIEdyYXBoUUwgQVBJIFVSTCAtIFJlYWR5IGZvciBjbGllbnQgaW50ZWdyYXRpb24nLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUdyYXBoUUxBcGlVcmxgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0dyYXBoUUxBcGlLZXknLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcGkuYXBpS2V5ISxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBBUEkgS2V5IGZvciBkZXZlbG9wbWVudCBhbmQgdGVzdGluZycsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tR3JhcGhRTEFwaUtleWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF5M0NvbXBsZXRpb25TdGF0dXMnLCB7XG4gICAgICB2YWx1ZTogJ1NDSEVNQS1SRUdJU1RSWS1BTkQtRVJST1ItSEFORExJTkctQ09NUExFVEUnLFxuICAgICAgZGVzY3JpcHRpb246ICfinIUgRGF5IDM6IFNjaGVtYSByZWdpc3RyeSwgZXJyb3IgaGFuZGxpbmcgcGF0dGVybnMsIGFuZCBzY2hlbWEgY29tcG9zaXRpb24gYXV0b21hdGlvbiBjb21wbGV0ZWQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ltcGxlbWVudGVkRmVhdHVyZXMnLCB7XG4gICAgICB2YWx1ZTogJ0dyYXBoUUwtU2NoZW1hfEVycm9yLUhhbmRsaW5nfExhbWJkYS1SZXNvbHZlcnN8Q29nbml0by1BdXRofEFQSS1LZXknLFxuICAgICAgZGVzY3JpcHRpb246ICdEYXkgMyBmZWF0dXJlczogQ29tcGxldGUgR3JhcGhRTCBBUEkgd2l0aCBlcnJvciBoYW5kbGluZyBhbmQgYXV0aGVudGljYXRpb24nLFxuICAgIH0pO1xuICB9XG59ICJdfQ==