"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncCompleteStack = void 0;
const cdk = require("aws-cdk-lib");
const appsync = require("@aws-cdk/aws-appsync-alpha");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const logs = require("aws-cdk-lib/aws-logs");
const ssm = require("aws-cdk-lib/aws-ssm");
const ec2 = require("aws-cdk-lib/aws-ec2");
class AppSyncCompleteStack extends cdk.Stack {
    api;
    userResolver;
    constructor(scope, id, props) {
        super(scope, id, props);
        // User Service GraphQL Schema for Phase 1
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
        // AppSync GraphQL API with complete configuration
        this.api = new appsync.GraphqlApi(this, 'EdTechGraphQLAPI', {
            name: `EdTech-GraphQL-API-${props.environment}`,
            schema: appsync.SchemaFile.fromString(userSchema),
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
                    {
                        authorizationType: appsync.AuthorizationType.IAM,
                    },
                ],
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
                retention: logs.RetentionDays.ONE_WEEK,
            },
            xrayEnabled: true,
        });
        // Lambda execution role
        const lambdaRole = new iam.Role(this, 'UserResolverRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: {
                UserServiceAccess: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ssm:GetParameter', 'ssm:GetParameters'],
                            resources: [
                                `arn:aws:ssm:${this.region}:${this.account}:parameter/edtech/${props.environment}/*`,
                            ],
                        }),
                    ],
                }),
            },
        });
        // User Service Lambda Resolver with error handling
        this.userResolver = new lambda.Function(this, 'UserServiceResolver', {
            functionName: `edtech-${props.environment}-user-resolver`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        // GraphQL Error Classes
        class GraphQLError extends Error {
          constructor(message, code, statusCode = 400, extensions = {}) {
            super(message);
            this.extensions = {
              code,
              statusCode,
              timestamp: new Date().toISOString(),
              ...extensions
            };
          }
        }

        class ValidationError extends GraphQLError {
          constructor(message, field = null) {
            super(message, 'VALIDATION_ERROR', 400, { field, type: 'validation' });
          }
        }

        class NotFoundError extends GraphQLError {
          constructor(resource = 'Resource', id = null) {
            super(\`\${resource} not found\${id ? \` with id: \${id}\` : ''}\`, 'NOT_FOUND', 404, {
              type: 'not_found', resource, id
            });
          }
        }

        // Mock database for demonstration
        const mockUsers = [
          {
            id: '1',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            fullName: 'John Doe',
            isTutor: false,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            fullName: 'Jane Smith',
            isTutor: true,
            isActive: true,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z'
          }
        ];

        exports.handler = async (event) => {
          console.log('AppSync Event:', JSON.stringify(event, null, 2));
          
          try {
            const { fieldName, arguments: args, source, identity } = event;
            
            switch (fieldName) {
              case 'me':
                if (!identity?.sub) {
                  throw new ValidationError('User not authenticated');
                }
                const currentUser = mockUsers.find(u => u.id === identity.sub) || mockUsers[0];
                return {
                  ...currentUser,
                  id: identity.sub,
                  email: identity.email || currentUser.email
                };
              
              case 'user':
                if (!args.id) {
                  throw new ValidationError('User ID is required', 'id');
                }
                const user = mockUsers.find(u => u.id === args.id);
                if (!user) {
                  throw new NotFoundError('User', args.id);
                }
                return user;
              
              case 'users':
                const limit = Math.min(args.limit || 20, 100);
                const offset = args.offset || 0;
                return mockUsers.slice(offset, offset + limit);

              case 'createUser':
                const { input } = args;
                
                // Validation
                if (!input.email || !input.firstName || !input.lastName) {
                  return {
                    user: null,
                    errors: [
                      { field: 'email', message: 'Email is required' },
                      { field: 'firstName', message: 'First name is required' },
                      { field: 'lastName', message: 'Last name is required' }
                    ].filter(err => !input[err.field])
                  };
                }

                // Check email format
                const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                if (!emailRegex.test(input.email)) {
                  return {
                    user: null,
                    errors: [{ field: 'email', message: 'Invalid email format' }]
                  };
                }

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
                const userToUpdate = mockUsers.find(u => u.id === args.id);
                if (!userToUpdate) {
                  throw new NotFoundError('User', args.id);
                }

                if (args.input.firstName) userToUpdate.firstName = args.input.firstName;
                if (args.input.lastName) userToUpdate.lastName = args.input.lastName;
                if (args.input.firstName || args.input.lastName) {
                  userToUpdate.fullName = \`\${userToUpdate.firstName} \${userToUpdate.lastName}\`;
                }
                userToUpdate.updatedAt = new Date().toISOString();

                return userToUpdate;

              case 'deleteUser':
                const userIndex = mockUsers.findIndex(u => u.id === args.id);
                if (userIndex === -1) {
                  throw new NotFoundError('User', args.id);
                }
                mockUsers.splice(userIndex, 1);
                return true;
            
              default:
                throw new GraphQLError(\`Unknown field: \${fieldName}\`, 'UNKNOWN_FIELD', 400);
            }
          } catch (error) {
            console.error('Resolver error:', error);
            
            // Re-throw custom errors as-is
            if (error.extensions) {
              throw error;
            }
            
            // Wrap unknown errors
            throw new GraphQLError(
              'Internal server error',
              'INTERNAL_ERROR',
              500,
              { originalError: error.message }
            );
          }
        };
      `),
            environment: {
                ENVIRONMENT: props.environment,
                USER_SERVICE_URL: `http://user-service.${props.environment}:3001`,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
            },
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Lambda data source
        const userDataSource = this.api.addLambdaDataSource('UserServiceDataSource', this.userResolver, {
            name: 'UserServiceDataSource',
            description: 'Lambda data source for User Service operations with error handling',
        });
        // Create resolvers
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
        // Update SSM parameters with real values
        new ssm.StringParameter(this, 'AppSyncApiIdParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-id`,
            stringValue: this.api.apiId,
            description: 'AppSync GraphQL API ID',
        });
        new ssm.StringParameter(this, 'AppSyncApiUrlParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-url`,
            stringValue: this.api.graphqlUrl,
            description: 'AppSync GraphQL API URL',
        });
        new ssm.StringParameter(this, 'AppSyncApiKeyParameter', {
            parameterName: `/edtech/${props.environment}/appsync/api-key`,
            stringValue: this.api.apiKey,
            description: 'AppSync API Key for development',
        });
        // Outputs
        new cdk.CfnOutput(this, 'GraphQLApiId', {
            value: this.api.apiId,
            description: 'AppSync GraphQL API ID',
            exportName: `${props.environment}-GraphQLApiId`,
        });
        new cdk.CfnOutput(this, 'GraphQLApiUrl', {
            value: this.api.graphqlUrl,
            description: 'AppSync GraphQL API URL',
            exportName: `${props.environment}-GraphQLApiUrl`,
        });
        new cdk.CfnOutput(this, 'GraphQLApiKey', {
            value: this.api.apiKey,
            description: 'AppSync API Key for development',
            exportName: `${props.environment}-GraphQLApiKey`,
        });
        new cdk.CfnOutput(this, 'Day3CompletionStatus', {
            value: 'COMPLETED-WITH-SCHEMA-AND-ERROR-HANDLING',
            description: 'Day 3: AppSync API with schema registry and error handling completed',
        });
    }
}
exports.AppSyncCompleteStack = AppSyncCompleteStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy1jb21wbGV0ZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcHN5bmMtY29tcGxldGUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHNEQUFzRDtBQUV0RCxpREFBaUQ7QUFDakQsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUM3QywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBWTNDLE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDakMsR0FBRyxDQUFxQjtJQUN4QixZQUFZLENBQWtCO0lBRTlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMENBQTBDO1FBQzFDLE1BQU0sVUFBVSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0FnRGxCLENBQUM7UUFFRixrREFBa0Q7UUFDbEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFELElBQUksRUFBRSxzQkFBc0IsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUMvQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO1lBQ2pELG1CQUFtQixFQUFFO2dCQUNuQixvQkFBb0IsRUFBRTtvQkFDcEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFNBQVM7b0JBQ3RELGNBQWMsRUFBRTt3QkFDZCxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7d0JBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO3dCQUN2RCxhQUFhLEVBQUUsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUs7cUJBQ25EO2lCQUNGO2dCQUNELDRC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QyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsMENBQTBDO1lBQ2pELFdBQVcsRUFBRSxzRUFBc0U7U0FDcEYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbllELG9EQW1ZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ0Bhd3MtY2RrL2F3cy1hcHBzeW5jLWFscGhhJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBBcHBTeW5jQ29tcGxldGVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB2cGM6IGVjMi5WcGM7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcbn1cblxuZXhwb3J0IGNsYXNzIEFwcFN5bmNDb21wbGV0ZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBwc3luYy5HcmFwaHFsQXBpO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclJlc29sdmVyOiBsYW1iZGEuRnVuY3Rpb247XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwcFN5bmNDb21wbGV0ZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFVzZXIgU2VydmljZSBHcmFwaFFMIFNjaGVtYSBmb3IgUGhhc2UgMVxuICAgIGNvbnN0IHVzZXJTY2hlbWEgPSBgXG4gICAgICB0eXBlIFF1ZXJ5IHtcbiAgICAgICAgbWU6IFVzZXJcbiAgICAgICAgdXNlcihpZDogSUQhKTogVXNlclxuICAgICAgICB1c2VycyhsaW1pdDogSW50ID0gMjAsIG9mZnNldDogSW50ID0gMCk6IFtVc2VyIV0hXG4gICAgICB9XG5cbiAgICAgIHR5cGUgTXV0YXRpb24ge1xuICAgICAgICBjcmVhdGVVc2VyKGlucHV0OiBDcmVhdGVVc2VySW5wdXQhKTogQ3JlYXRlVXNlclJlc3BvbnNlIVxuICAgICAgICB1cGRhdGVVc2VyKGlkOiBJRCEsIGlucHV0OiBVcGRhdGVVc2VySW5wdXQhKTogVXNlciFcbiAgICAgICAgZGVsZXRlVXNlcihpZDogSUQhKTogQm9vbGVhbiFcbiAgICAgIH1cblxuICAgICAgdHlwZSBVc2VyIHtcbiAgICAgICAgaWQ6IElEIVxuICAgICAgICBlbWFpbDogU3RyaW5nIVxuICAgICAgICBmaXJzdE5hbWU6IFN0cmluZyFcbiAgICAgICAgbGFzdE5hbWU6IFN0cmluZyFcbiAgICAgICAgZnVsbE5hbWU6IFN0cmluZyFcbiAgICAgICAgaXNUdXRvcjogQm9vbGVhbiFcbiAgICAgICAgaXNBY3RpdmU6IEJvb2xlYW4hXG4gICAgICAgIGNyZWF0ZWRBdDogQVdTRGF0ZVRpbWUhXG4gICAgICAgIHVwZGF0ZWRBdDogQVdTRGF0ZVRpbWUhXG4gICAgICB9XG5cbiAgICAgIHR5cGUgQ3JlYXRlVXNlclJlc3BvbnNlIHtcbiAgICAgICAgdXNlcjogVXNlclxuICAgICAgICBlcnJvcnM6IFtGaWVsZEVycm9yIV1cbiAgICAgIH1cblxuICAgICAgdHlwZSBGaWVsZEVycm9yIHtcbiAgICAgICAgZmllbGQ6IFN0cmluZyFcbiAgICAgICAgbWVzc2FnZTogU3RyaW5nIVxuICAgICAgfVxuXG4gICAgICBpbnB1dCBDcmVhdGVVc2VySW5wdXQge1xuICAgICAgICBlbWFpbDogU3RyaW5nIVxuICAgICAgICBmaXJzdE5hbWU6IFN0cmluZyFcbiAgICAgICAgbGFzdE5hbWU6IFN0cmluZyFcbiAgICAgICAgcGFzc3dvcmQ6IFN0cmluZyFcbiAgICAgIH1cblxuICAgICAgaW5wdXQgVXBkYXRlVXNlcklucHV0IHtcbiAgICAgICAgZmlyc3ROYW1lOiBTdHJpbmdcbiAgICAgICAgbGFzdE5hbWU6IFN0cmluZ1xuICAgICAgfVxuXG4gICAgICBzY2FsYXIgQVdTRGF0ZVRpbWVcbiAgICBgO1xuXG4gICAgLy8gQXBwU3luYyBHcmFwaFFMIEFQSSB3aXRoIGNvbXBsZXRlIGNvbmZpZ3VyYXRpb25cbiAgICB0aGlzLmFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgJ0VkVGVjaEdyYXBoUUxBUEknLCB7XG4gICAgICBuYW1lOiBgRWRUZWNoLUdyYXBoUUwtQVBJLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHNjaGVtYTogYXBwc3luYy5TY2hlbWFGaWxlLmZyb21TdHJpbmcodXNlclNjaGVtYSksXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XG4gICAgICAgICAgICB1c2VyUG9vbDogcHJvcHMudXNlclBvb2wsXG4gICAgICAgICAgICBhcHBJZENsaWVudFJlZ2V4OiBwcm9wcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgICAgZGVmYXVsdEFjdGlvbjogYXBwc3luYy5Vc2VyUG9vbERlZmF1bHRBY3Rpb24uQUxMT1csXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbEF1dGhvcml6YXRpb25Nb2RlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLkFQSV9LRVksXG4gICAgICAgICAgICBhcGlLZXlDb25maWc6IHtcbiAgICAgICAgICAgICAgZXhwaXJlczogY2RrLkV4cGlyYXRpb24uYWZ0ZXIoY2RrLkR1cmF0aW9uLmRheXMoMzY1KSksXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEtleSBmb3IgZGV2ZWxvcG1lbnQgYW5kIHRlc3RpbmcnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLklBTSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGxvZ0NvbmZpZzoge1xuICAgICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxuICAgICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIH0sXG4gICAgICB4cmF5RW5hYmxlZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBleGVjdXRpb24gcm9sZVxuICAgIGNvbnN0IGxhbWJkYVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1VzZXJSZXNvbHZlclJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlJyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIFVzZXJTZXJ2aWNlQWNjZXNzOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogWydzc206R2V0UGFyYW1ldGVyJywgJ3NzbTpHZXRQYXJhbWV0ZXJzJ10sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNzbToke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06cGFyYW1ldGVyL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS8qYCxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFVzZXIgU2VydmljZSBMYW1iZGEgUmVzb2x2ZXIgd2l0aCBlcnJvciBoYW5kbGluZ1xuICAgIHRoaXMudXNlclJlc29sdmVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNlclNlcnZpY2VSZXNvbHZlcicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGVkdGVjaC0ke3Byb3BzLmVudmlyb25tZW50fS11c2VyLXJlc29sdmVyYCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXG4gICAgICAgIC8vIEdyYXBoUUwgRXJyb3IgQ2xhc3Nlc1xuICAgICAgICBjbGFzcyBHcmFwaFFMRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gICAgICAgICAgY29uc3RydWN0b3IobWVzc2FnZSwgY29kZSwgc3RhdHVzQ29kZSA9IDQwMCwgZXh0ZW5zaW9ucyA9IHt9KSB7XG4gICAgICAgICAgICBzdXBlcihtZXNzYWdlKTtcbiAgICAgICAgICAgIHRoaXMuZXh0ZW5zaW9ucyA9IHtcbiAgICAgICAgICAgICAgY29kZSxcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgIC4uLmV4dGVuc2lvbnNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2xhc3MgVmFsaWRhdGlvbkVycm9yIGV4dGVuZHMgR3JhcGhRTEVycm9yIHtcbiAgICAgICAgICBjb25zdHJ1Y3RvcihtZXNzYWdlLCBmaWVsZCA9IG51bGwpIHtcbiAgICAgICAgICAgIHN1cGVyKG1lc3NhZ2UsICdWQUxJREFUSU9OX0VSUk9SJywgNDAwLCB7IGZpZWxkLCB0eXBlOiAndmFsaWRhdGlvbicgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2xhc3MgTm90Rm91bmRFcnJvciBleHRlbmRzIEdyYXBoUUxFcnJvciB7XG4gICAgICAgICAgY29uc3RydWN0b3IocmVzb3VyY2UgPSAnUmVzb3VyY2UnLCBpZCA9IG51bGwpIHtcbiAgICAgICAgICAgIHN1cGVyKFxcYFxcJHtyZXNvdXJjZX0gbm90IGZvdW5kXFwke2lkID8gXFxgIHdpdGggaWQ6IFxcJHtpZH1cXGAgOiAnJ31cXGAsICdOT1RfRk9VTkQnLCA0MDQsIHtcbiAgICAgICAgICAgICAgdHlwZTogJ25vdF9mb3VuZCcsIHJlc291cmNlLCBpZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTW9jayBkYXRhYmFzZSBmb3IgZGVtb25zdHJhdGlvblxuICAgICAgICBjb25zdCBtb2NrVXNlcnMgPSBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICcxJyxcbiAgICAgICAgICAgIGVtYWlsOiAnam9obi5kb2VAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgZmlyc3ROYW1lOiAnSm9obicsXG4gICAgICAgICAgICBsYXN0TmFtZTogJ0RvZScsXG4gICAgICAgICAgICBmdWxsTmFtZTogJ0pvaG4gRG9lJyxcbiAgICAgICAgICAgIGlzVHV0b3I6IGZhbHNlLFxuICAgICAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwWicsXG4gICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDAwOjAwOjAwWidcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnMicsXG4gICAgICAgICAgICBlbWFpbDogJ2phbmUuc21pdGhAZXhhbXBsZS5jb20nLFxuICAgICAgICAgICAgZmlyc3ROYW1lOiAnSmFuZScsXG4gICAgICAgICAgICBsYXN0TmFtZTogJ1NtaXRoJyxcbiAgICAgICAgICAgIGZ1bGxOYW1lOiAnSmFuZSBTbWl0aCcsXG4gICAgICAgICAgICBpc1R1dG9yOiB0cnVlLFxuICAgICAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6ICcyMDI0LTAxLTAyVDAwOjAwOjAwWicsXG4gICAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAyVDAwOjAwOjAwWidcbiAgICAgICAgICB9XG4gICAgICAgIF07XG5cbiAgICAgICAgZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0FwcFN5bmMgRXZlbnQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcbiAgICAgICAgICBcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBmaWVsZE5hbWUsIGFyZ3VtZW50czogYXJncywgc291cmNlLCBpZGVudGl0eSB9ID0gZXZlbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN3aXRjaCAoZmllbGROYW1lKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ21lJzpcbiAgICAgICAgICAgICAgICBpZiAoIWlkZW50aXR5Py5zdWIpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFVzZXIgPSBtb2NrVXNlcnMuZmluZCh1ID0+IHUuaWQgPT09IGlkZW50aXR5LnN1YikgfHwgbW9ja1VzZXJzWzBdO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAuLi5jdXJyZW50VXNlcixcbiAgICAgICAgICAgICAgICAgIGlkOiBpZGVudGl0eS5zdWIsXG4gICAgICAgICAgICAgICAgICBlbWFpbDogaWRlbnRpdHkuZW1haWwgfHwgY3VycmVudFVzZXIuZW1haWxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgY2FzZSAndXNlcic6XG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzLmlkKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKCdVc2VyIElEIGlzIHJlcXVpcmVkJywgJ2lkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXIgPSBtb2NrVXNlcnMuZmluZCh1ID0+IHUuaWQgPT09IGFyZ3MuaWQpO1xuICAgICAgICAgICAgICAgIGlmICghdXNlcikge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IE5vdEZvdW5kRXJyb3IoJ1VzZXInLCBhcmdzLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVzZXI7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBjYXNlICd1c2Vycyc6XG4gICAgICAgICAgICAgICAgY29uc3QgbGltaXQgPSBNYXRoLm1pbihhcmdzLmxpbWl0IHx8IDIwLCAxMDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGFyZ3Mub2Zmc2V0IHx8IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vY2tVc2Vycy5zbGljZShvZmZzZXQsIG9mZnNldCArIGxpbWl0KTtcblxuICAgICAgICAgICAgICBjYXNlICdjcmVhdGVVc2VyJzpcbiAgICAgICAgICAgICAgICBjb25zdCB7IGlucHV0IH0gPSBhcmdzO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoIWlucHV0LmVtYWlsIHx8ICFpbnB1dC5maXJzdE5hbWUgfHwgIWlucHV0Lmxhc3ROYW1lKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB1c2VyOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICB7IGZpZWxkOiAnZW1haWwnLCBtZXNzYWdlOiAnRW1haWwgaXMgcmVxdWlyZWQnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgeyBmaWVsZDogJ2ZpcnN0TmFtZScsIG1lc3NhZ2U6ICdGaXJzdCBuYW1lIGlzIHJlcXVpcmVkJyB9LFxuICAgICAgICAgICAgICAgICAgICAgIHsgZmllbGQ6ICdsYXN0TmFtZScsIG1lc3NhZ2U6ICdMYXN0IG5hbWUgaXMgcmVxdWlyZWQnIH1cbiAgICAgICAgICAgICAgICAgICAgXS5maWx0ZXIoZXJyID0+ICFpbnB1dFtlcnIuZmllbGRdKVxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBlbWFpbCBmb3JtYXRcbiAgICAgICAgICAgICAgICBjb25zdCBlbWFpbFJlZ2V4ID0gL15bXlxcXFxzQF0rQFteXFxcXHNAXStcXFxcLlteXFxcXHNAXSskLztcbiAgICAgICAgICAgICAgICBpZiAoIWVtYWlsUmVnZXgudGVzdChpbnB1dC5lbWFpbCkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHVzZXI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yczogW3sgZmllbGQ6ICdlbWFpbCcsIG1lc3NhZ2U6ICdJbnZhbGlkIGVtYWlsIGZvcm1hdCcgfV1cbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXNlciA9IHtcbiAgICAgICAgICAgICAgICAgIGlkOiAobW9ja1VzZXJzLmxlbmd0aCArIDEpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICBlbWFpbDogaW5wdXQuZW1haWwsXG4gICAgICAgICAgICAgICAgICBmaXJzdE5hbWU6IGlucHV0LmZpcnN0TmFtZSxcbiAgICAgICAgICAgICAgICAgIGxhc3ROYW1lOiBpbnB1dC5sYXN0TmFtZSxcbiAgICAgICAgICAgICAgICAgIGZ1bGxOYW1lOiBcXGBcXCR7aW5wdXQuZmlyc3ROYW1lfSBcXCR7aW5wdXQubGFzdE5hbWV9XFxgLFxuICAgICAgICAgICAgICAgICAgaXNUdXRvcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgbW9ja1VzZXJzLnB1c2gobmV3VXNlcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdXNlcjogbmV3VXNlciwgZXJyb3JzOiBbXSB9O1xuXG4gICAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZVVzZXInOlxuICAgICAgICAgICAgICAgIGNvbnN0IHVzZXJUb1VwZGF0ZSA9IG1vY2tVc2Vycy5maW5kKHUgPT4gdS5pZCA9PT0gYXJncy5pZCk7XG4gICAgICAgICAgICAgICAgaWYgKCF1c2VyVG9VcGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBOb3RGb3VuZEVycm9yKCdVc2VyJywgYXJncy5pZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuaW5wdXQuZmlyc3ROYW1lKSB1c2VyVG9VcGRhdGUuZmlyc3ROYW1lID0gYXJncy5pbnB1dC5maXJzdE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuaW5wdXQubGFzdE5hbWUpIHVzZXJUb1VwZGF0ZS5sYXN0TmFtZSA9IGFyZ3MuaW5wdXQubGFzdE5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuaW5wdXQuZmlyc3ROYW1lIHx8IGFyZ3MuaW5wdXQubGFzdE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgIHVzZXJUb1VwZGF0ZS5mdWxsTmFtZSA9IFxcYFxcJHt1c2VyVG9VcGRhdGUuZmlyc3ROYW1lfSBcXCR7dXNlclRvVXBkYXRlLmxhc3ROYW1lfVxcYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdXNlclRvVXBkYXRlLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyVG9VcGRhdGU7XG5cbiAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlVXNlcic6XG4gICAgICAgICAgICAgICAgY29uc3QgdXNlckluZGV4ID0gbW9ja1VzZXJzLmZpbmRJbmRleCh1ID0+IHUuaWQgPT09IGFyZ3MuaWQpO1xuICAgICAgICAgICAgICAgIGlmICh1c2VySW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTm90Rm91bmRFcnJvcignVXNlcicsIGFyZ3MuaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2NrVXNlcnMuc3BsaWNlKHVzZXJJbmRleCwgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgR3JhcGhRTEVycm9yKFxcYFVua25vd24gZmllbGQ6IFxcJHtmaWVsZE5hbWV9XFxgLCAnVU5LTk9XTl9GSUVMRCcsIDQwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jlc29sdmVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmUtdGhyb3cgY3VzdG9tIGVycm9ycyBhcy1pc1xuICAgICAgICAgICAgaWYgKGVycm9yLmV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFdyYXAgdW5rbm93biBlcnJvcnNcbiAgICAgICAgICAgIHRocm93IG5ldyBHcmFwaFFMRXJyb3IoXG4gICAgICAgICAgICAgICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxuICAgICAgICAgICAgICAnSU5URVJOQUxfRVJST1InLFxuICAgICAgICAgICAgICA1MDAsXG4gICAgICAgICAgICAgIHsgb3JpZ2luYWxFcnJvcjogZXJyb3IubWVzc2FnZSB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIGApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBVU0VSX1NFUlZJQ0VfVVJMOiBgaHR0cDovL3VzZXItc2VydmljZS4ke3Byb3BzLmVudmlyb25tZW50fTozMDAxYCxcbiAgICAgICAgQVdTX05PREVKU19DT05ORUNUSU9OX1JFVVNFX0VOQUJMRUQ6ICcxJyxcbiAgICAgIH0sXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgZGF0YSBzb3VyY2VcbiAgICBjb25zdCB1c2VyRGF0YVNvdXJjZSA9IHRoaXMuYXBpLmFkZExhbWJkYURhdGFTb3VyY2UoXG4gICAgICAnVXNlclNlcnZpY2VEYXRhU291cmNlJyxcbiAgICAgIHRoaXMudXNlclJlc29sdmVyLFxuICAgICAge1xuICAgICAgICBuYW1lOiAnVXNlclNlcnZpY2VEYXRhU291cmNlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgZGF0YSBzb3VyY2UgZm9yIFVzZXIgU2VydmljZSBvcGVyYXRpb25zIHdpdGggZXJyb3IgaGFuZGxpbmcnLFxuICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBDcmVhdGUgcmVzb2x2ZXJzXG4gICAgdXNlckRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ1F1ZXJ5TWVSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnbWUnLFxuICAgIH0pO1xuXG4gICAgdXNlckRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ1F1ZXJ5VXNlclJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICd1c2VyJyxcbiAgICB9KTtcblxuICAgIHVzZXJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdRdWVyeVVzZXJzUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ3VzZXJzJyxcbiAgICB9KTtcblxuICAgIHVzZXJEYXRhU291cmNlLmNyZWF0ZVJlc29sdmVyKCdNdXRhdGlvbkNyZWF0ZVVzZXJSZXNvbHZlcicsIHtcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnY3JlYXRlVXNlcicsXG4gICAgfSk7XG5cbiAgICB1c2VyRGF0YVNvdXJjZS5jcmVhdGVSZXNvbHZlcignTXV0YXRpb25VcGRhdGVVc2VyUmVzb2x2ZXInLCB7XG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ3VwZGF0ZVVzZXInLFxuICAgIH0pO1xuXG4gICAgdXNlckRhdGFTb3VyY2UuY3JlYXRlUmVzb2x2ZXIoJ011dGF0aW9uRGVsZXRlVXNlclJlc29sdmVyJywge1xuICAgICAgdHlwZU5hbWU6ICdNdXRhdGlvbicsXG4gICAgICBmaWVsZE5hbWU6ICdkZWxldGVVc2VyJyxcbiAgICB9KTtcblxuICAgIC8vIFVwZGF0ZSBTU00gcGFyYW1ldGVycyB3aXRoIHJlYWwgdmFsdWVzXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0FwcFN5bmNBcGlJZFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmFwaS5hcGlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBHcmFwaFFMIEFQSSBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQXBwU3luY0FwaVVybFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLXVybGAsXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5hcGkuZ3JhcGhxbFVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBHcmFwaFFMIEFQSSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0FwcFN5bmNBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS9hcHBzeW5jL2FwaS1rZXlgLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuYXBpLmFwaUtleSEsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgQVBJIEtleSBmb3IgZGV2ZWxvcG1lbnQnLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHcmFwaFFMQXBpSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcGkuYXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgR3JhcGhRTCBBUEkgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUdyYXBoUUxBcGlJZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaVVybCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5ncmFwaHFsVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBTeW5jIEdyYXBoUUwgQVBJIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tR3JhcGhRTEFwaVVybGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaUtleScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5hcGlLZXkhLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBTeW5jIEFQSSBLZXkgZm9yIGRldmVsb3BtZW50JyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1HcmFwaFFMQXBpS2V5YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXkzQ29tcGxldGlvblN0YXR1cycsIHtcbiAgICAgIHZhbHVlOiAnQ09NUExFVEVELVdJVEgtU0NIRU1BLUFORC1FUlJPUi1IQU5ETElORycsXG4gICAgICBkZXNjcmlwdGlvbjogJ0RheSAzOiBBcHBTeW5jIEFQSSB3aXRoIHNjaGVtYSByZWdpc3RyeSBhbmQgZXJyb3IgaGFuZGxpbmcgY29tcGxldGVkJyxcbiAgICB9KTtcbiAgfVxufSAiXX0=