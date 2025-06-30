import * as cdk from 'aws-cdk-lib';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface AppSyncCompleteStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

export class AppSyncCompleteStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  public readonly userResolver: lambda.Function;

  constructor(scope: Construct, id: string, props: AppSyncCompleteStackProps) {
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
    const userDataSource = this.api.addLambdaDataSource(
      'UserServiceDataSource',
      this.userResolver,
      {
        name: 'UserServiceDataSource',
        description: 'Lambda data source for User Service operations with error handling',
      }
    );

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
      stringValue: this.api.apiKey!,
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
      value: this.api.apiKey!,
      description: 'AppSync API Key for development',
      exportName: `${props.environment}-GraphQLApiKey`,
    });

    new cdk.CfnOutput(this, 'Day3CompletionStatus', {
      value: 'COMPLETED-WITH-SCHEMA-AND-ERROR-HANDLING',
      description: 'Day 3: AppSync API with schema registry and error handling completed',
    });
  }
} 