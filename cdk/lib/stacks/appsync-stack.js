"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSyncStack = void 0;
const cdk = require("aws-cdk-lib");
const appsync = require("@aws-cdk/aws-appsync-alpha");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const ssm = require("aws-cdk-lib/aws-ssm");
const ec2 = require("aws-cdk-lib/aws-ec2");
class AppSyncStack extends cdk.Stack {
    api;
    userDataSource;
    constructor(scope, id, props) {
        super(scope, id, props);
        // AppSync GraphQL API - Start with basic setup
        this.api = new appsync.GraphqlApi(this, 'EdTechGraphQLAPI', {
            name: `EdTech-GraphQL-API-${props.environment}`,
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
        // Basic schema types for User operations
        const userType = new appsync.ObjectType('User', {
            definition: {
                id: appsync.GraphqlType.id({ isRequired: true }),
                email: appsync.GraphqlType.string({ isRequired: true }),
                firstName: appsync.GraphqlType.string({ isRequired: true }),
                lastName: appsync.GraphqlType.string({ isRequired: true }),
                fullName: appsync.GraphqlType.string({ isRequired: true }),
                isTutor: appsync.GraphqlType.boolean({ isRequired: true }),
                isActive: appsync.GraphqlType.boolean({ isRequired: true }),
                createdAt: appsync.GraphqlType.awsDateTime({ isRequired: true }),
                updatedAt: appsync.GraphqlType.awsDateTime({ isRequired: true }),
            },
        });
        // Input types
        const createUserInput = new appsync.InputType('CreateUserInput', {
            definition: {
                email: appsync.GraphqlType.string({ isRequired: true }),
                firstName: appsync.GraphqlType.string({ isRequired: true }),
                lastName: appsync.GraphqlType.string({ isRequired: true }),
                password: appsync.GraphqlType.string({ isRequired: true }),
            },
        });
        const updateUserInput = new appsync.InputType('UpdateUserInput', {
            definition: {
                firstName: appsync.GraphqlType.string(),
                lastName: appsync.GraphqlType.string(),
            },
        });
        // Add types to schema
        this.api.addType(userType);
        this.api.addType(createUserInput);
        this.api.addType(updateUserInput);
        // Lambda execution role for resolvers
        const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
            inlinePolicies: {
                ServiceCommunication: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['ssm:GetParameter', 'ssm:GetParameters', 'secretsmanager:GetSecretValue'],
                            resources: [
                                `arn:aws:ssm:${this.region}:${this.account}:parameter/edtech/${props.environment}/*`,
                                `arn:aws:secretsmanager:${this.region}:${this.account}:secret:edtech/${props.environment}/*`,
                            ],
                        }),
                    ],
                }),
            },
        });
        // User Service Lambda Resolver
        const userServiceResolver = new lambda.Function(this, 'UserServiceResolver', {
            functionName: `edtech-${props.environment}-user-resolver`,
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('AppSync Event:', JSON.stringify(event, null, 2));
          
          const { fieldName, arguments: args, source, identity } = event;
          
          // Mock data for Phase 1 - will be replaced with actual service calls
          switch (fieldName) {
            case 'me':
              return {
                id: identity?.sub || 'mock-user-id',
                email: identity?.email || 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                isTutor: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            
            case 'user':
              return {
                id: args.id,
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                isTutor: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

            case 'createUser':
              return {
                id: 'new-user-id',
                email: args.input.email,
                firstName: args.input.firstName,
                lastName: args.input.lastName,
                fullName: args.input.firstName + ' ' + args.input.lastName,
                isTutor: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

            case 'updateUser':
              return {
                id: args.id,
                email: 'user@example.com',
                firstName: args.input.firstName || 'John',
                lastName: args.input.lastName || 'Doe',
                fullName: (args.input.firstName || 'John') + ' ' + (args.input.lastName || 'Doe'),
                isTutor: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            
            default:
              throw new Error('Unknown field: ' + fieldName);
          }
        };
      `),
            environment: {
                ENVIRONMENT: props.environment,
                USER_SERVICE_URL: `http://user-service.${props.environment}:3001`,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
            },
            role: lambdaExecutionRole,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            vpc: props.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });
        // Create Lambda Data Source
        this.userDataSource = this.api.addLambdaDataSource('UserServiceDataSource', userServiceResolver, {
            name: 'UserServiceDataSource',
            description: 'Lambda data source for User Service operations',
        });
        // Add Query and Mutation fields
        this.api.addQuery('me', new appsync.ResolvableField({
            returnType: userType.attribute(),
            dataSource: this.userDataSource,
        }));
        this.api.addQuery('user', new appsync.ResolvableField({
            returnType: userType.attribute(),
            args: {
                id: appsync.GraphqlType.id({ isRequired: true }),
            },
            dataSource: this.userDataSource,
        }));
        this.api.addMutation('createUser', new appsync.ResolvableField({
            returnType: userType.attribute({ isRequired: true }),
            args: {
                input: createUserInput.attribute({ isRequired: true }),
            },
            dataSource: this.userDataSource,
        }));
        this.api.addMutation('updateUser', new appsync.ResolvableField({
            returnType: userType.attribute({ isRequired: true }),
            args: {
                id: appsync.GraphqlType.id({ isRequired: true }),
                input: updateUserInput.attribute({ isRequired: true }),
            },
            dataSource: this.userDataSource,
        }));
        // Store AppSync configuration in SSM
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
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: props.userPool.userPoolId,
            description: 'Cognito User Pool ID for authentication',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: props.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID for authentication',
        });
    }
}
exports.AppSyncStack = AppSyncStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcHN5bmMtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHNEQUFzRDtBQUV0RCwyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELDZDQUE2QztBQUM3QywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBVTNDLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3pCLEdBQUcsQ0FBcUI7SUFDeEIsY0FBYyxDQUEyQjtJQUV6RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLCtDQUErQztRQUMvQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUQsSUFBSSxFQUFFLHNCQUFzQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQy9DLG1CQUFtQixFQUFFO2dCQUNuQixvQkFBb0IsRUFBRTtvQkFDcEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLFNBQVM7b0JBQ3RELGNBQWMsRUFBRTt3QkFDZCxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7d0JBQ3hCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO3dCQUN2RCxhQUFhLEVBQUUsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEtBQUs7cUJBQ25EO2lCQUNGO2dCQUNELDRCQUE0QixFQUFFO29CQUM1Qjt3QkFDRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTzt3QkFDcEQsWUFBWSxFQUFFOzRCQUNaLE9BQU8sRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FB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QVUsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLGdCQUFnQjtTQUNqRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ2hDLFdBQVcsRUFBRSx5Q0FBeUM7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDNUMsV0FBVyxFQUFFLGdEQUFnRDtTQUM5RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFqUkQsb0NBaVJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSAnQGF3cy1jZGsvYXdzLWFwcHN5bmMtYWxwaGEnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwcFN5bmNTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB2cGM6IGVjMi5WcGM7XG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcbn1cblxuZXhwb3J0IGNsYXNzIEFwcFN5bmNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwcHN5bmMuR3JhcGhxbEFwaTtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJEYXRhU291cmNlOiBhcHBzeW5jLkxhbWJkYURhdGFTb3VyY2U7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwcFN5bmNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBBcHBTeW5jIEdyYXBoUUwgQVBJIC0gU3RhcnQgd2l0aCBiYXNpYyBzZXR1cFxuICAgIHRoaXMuYXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCAnRWRUZWNoR3JhcGhRTEFQSScsIHtcbiAgICAgIG5hbWU6IGBFZFRlY2gtR3JhcGhRTC1BUEktJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzoge1xuICAgICAgICAgICAgdXNlclBvb2w6IHByb3BzLnVzZXJQb29sLFxuICAgICAgICAgICAgYXBwSWRDbGllbnRSZWdleDogcHJvcHMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgICAgIGRlZmF1bHRBY3Rpb246IGFwcHN5bmMuVXNlclBvb2xEZWZhdWx0QWN0aW9uLkFMTE9XLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxBdXRob3JpemF0aW9uTW9kZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5BUElfS0VZLFxuICAgICAgICAgICAgYXBpS2V5Q29uZmlnOiB7XG4gICAgICAgICAgICAgIGV4cGlyZXM6IGNkay5FeHBpcmF0aW9uLmFmdGVyKGNkay5EdXJhdGlvbi5kYXlzKDM2NSkpLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FQSSBLZXkgZm9yIGRldmVsb3BtZW50IGFuZCB0ZXN0aW5nJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5JQU0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBsb2dDb25maWc6IHtcbiAgICAgICAgZmllbGRMb2dMZXZlbDogYXBwc3luYy5GaWVsZExvZ0xldmVsLkFMTCxcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICB9LFxuICAgICAgeHJheUVuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBCYXNpYyBzY2hlbWEgdHlwZXMgZm9yIFVzZXIgb3BlcmF0aW9uc1xuICAgIGNvbnN0IHVzZXJUeXBlID0gbmV3IGFwcHN5bmMuT2JqZWN0VHlwZSgnVXNlcicsIHtcbiAgICAgIGRlZmluaXRpb246IHtcbiAgICAgICAgaWQ6IGFwcHN5bmMuR3JhcGhxbFR5cGUuaWQoeyBpc1JlcXVpcmVkOiB0cnVlIH0pLFxuICAgICAgICBlbWFpbDogYXBwc3luYy5HcmFwaHFsVHlwZS5zdHJpbmcoeyBpc1JlcXVpcmVkOiB0cnVlIH0pLFxuICAgICAgICBmaXJzdE5hbWU6IGFwcHN5bmMuR3JhcGhxbFR5cGUuc3RyaW5nKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgICAgbGFzdE5hbWU6IGFwcHN5bmMuR3JhcGhxbFR5cGUuc3RyaW5nKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgICAgZnVsbE5hbWU6IGFwcHN5bmMuR3JhcGhxbFR5cGUuc3RyaW5nKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgICAgaXNUdXRvcjogYXBwc3luYy5HcmFwaHFsVHlwZS5ib29sZWFuKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgICAgaXNBY3RpdmU6IGFwcHN5bmMuR3JhcGhxbFR5cGUuYm9vbGVhbih7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICAgIGNyZWF0ZWRBdDogYXBwc3luYy5HcmFwaHFsVHlwZS5hd3NEYXRlVGltZSh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICAgIHVwZGF0ZWRBdDogYXBwc3luYy5HcmFwaHFsVHlwZS5hd3NEYXRlVGltZSh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gSW5wdXQgdHlwZXNcbiAgICBjb25zdCBjcmVhdGVVc2VySW5wdXQgPSBuZXcgYXBwc3luYy5JbnB1dFR5cGUoJ0NyZWF0ZVVzZXJJbnB1dCcsIHtcbiAgICAgIGRlZmluaXRpb246IHtcbiAgICAgICAgZW1haWw6IGFwcHN5bmMuR3JhcGhxbFR5cGUuc3RyaW5nKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgICAgZmlyc3ROYW1lOiBhcHBzeW5jLkdyYXBocWxUeXBlLnN0cmluZyh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICAgIGxhc3ROYW1lOiBhcHBzeW5jLkdyYXBocWxUeXBlLnN0cmluZyh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICAgIHBhc3N3b3JkOiBhcHBzeW5jLkdyYXBocWxUeXBlLnN0cmluZyh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlVXNlcklucHV0ID0gbmV3IGFwcHN5bmMuSW5wdXRUeXBlKCdVcGRhdGVVc2VySW5wdXQnLCB7XG4gICAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGZpcnN0TmFtZTogYXBwc3luYy5HcmFwaHFsVHlwZS5zdHJpbmcoKSxcbiAgICAgICAgbGFzdE5hbWU6IGFwcHN5bmMuR3JhcGhxbFR5cGUuc3RyaW5nKCksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIHR5cGVzIHRvIHNjaGVtYVxuICAgIHRoaXMuYXBpLmFkZFR5cGUodXNlclR5cGUpO1xuICAgIHRoaXMuYXBpLmFkZFR5cGUoY3JlYXRlVXNlcklucHV0KTtcbiAgICB0aGlzLmFwaS5hZGRUeXBlKHVwZGF0ZVVzZXJJbnB1dCk7XG5cbiAgICAvLyBMYW1iZGEgZXhlY3V0aW9uIHJvbGUgZm9yIHJlc29sdmVyc1xuICAgIGNvbnN0IGxhbWJkYUV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0xhbWJkYUV4ZWN1dGlvblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFWUENBY2Nlc3NFeGVjdXRpb25Sb2xlJyksXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIFNlcnZpY2VDb21tdW5pY2F0aW9uOiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogWydzc206R2V0UGFyYW1ldGVyJywgJ3NzbTpHZXRQYXJhbWV0ZXJzJywgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJ10sXG4gICAgICAgICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgICAgICAgIGBhcm46YXdzOnNzbToke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06cGFyYW1ldGVyL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS8qYCxcbiAgICAgICAgICAgICAgICBgYXJuOmF3czpzZWNyZXRzbWFuYWdlcjoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06c2VjcmV0OmVkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS8qYCxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFVzZXIgU2VydmljZSBMYW1iZGEgUmVzb2x2ZXJcbiAgICBjb25zdCB1c2VyU2VydmljZVJlc29sdmVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXNlclNlcnZpY2VSZXNvbHZlcicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGVkdGVjaC0ke3Byb3BzLmVudmlyb25tZW50fS11c2VyLXJlc29sdmVyYCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXG4gICAgICAgIGV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdBcHBTeW5jIEV2ZW50OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgeyBmaWVsZE5hbWUsIGFyZ3VtZW50czogYXJncywgc291cmNlLCBpZGVudGl0eSB9ID0gZXZlbnQ7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gTW9jayBkYXRhIGZvciBQaGFzZSAxIC0gd2lsbCBiZSByZXBsYWNlZCB3aXRoIGFjdHVhbCBzZXJ2aWNlIGNhbGxzXG4gICAgICAgICAgc3dpdGNoIChmaWVsZE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ21lJzpcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBpZDogaWRlbnRpdHk/LnN1YiB8fCAnbW9jay11c2VyLWlkJyxcbiAgICAgICAgICAgICAgICBlbWFpbDogaWRlbnRpdHk/LmVtYWlsIHx8ICd1c2VyQGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICAgICBmaXJzdE5hbWU6ICdKb2huJyxcbiAgICAgICAgICAgICAgICBsYXN0TmFtZTogJ0RvZScsXG4gICAgICAgICAgICAgICAgZnVsbE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgICAgICAgICAgaXNUdXRvcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAndXNlcic6XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6IGFyZ3MuaWQsXG4gICAgICAgICAgICAgICAgZW1haWw6ICd1c2VyQGV4YW1wbGUuY29tJyxcbiAgICAgICAgICAgICAgICBmaXJzdE5hbWU6ICdKb2huJyxcbiAgICAgICAgICAgICAgICBsYXN0TmFtZTogJ0RvZScsXG4gICAgICAgICAgICAgICAgZnVsbE5hbWU6ICdKb2huIERvZScsXG4gICAgICAgICAgICAgICAgaXNUdXRvcjogZmFsc2UsXG4gICAgICAgICAgICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2FzZSAnY3JlYXRlVXNlcic6XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaWQ6ICduZXctdXNlci1pZCcsXG4gICAgICAgICAgICAgICAgZW1haWw6IGFyZ3MuaW5wdXQuZW1haWwsXG4gICAgICAgICAgICAgICAgZmlyc3ROYW1lOiBhcmdzLmlucHV0LmZpcnN0TmFtZSxcbiAgICAgICAgICAgICAgICBsYXN0TmFtZTogYXJncy5pbnB1dC5sYXN0TmFtZSxcbiAgICAgICAgICAgICAgICBmdWxsTmFtZTogYXJncy5pbnB1dC5maXJzdE5hbWUgKyAnICcgKyBhcmdzLmlucHV0Lmxhc3ROYW1lLFxuICAgICAgICAgICAgICAgIGlzVHV0b3I6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZVVzZXInOlxuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlkOiBhcmdzLmlkLFxuICAgICAgICAgICAgICAgIGVtYWlsOiAndXNlckBleGFtcGxlLmNvbScsXG4gICAgICAgICAgICAgICAgZmlyc3ROYW1lOiBhcmdzLmlucHV0LmZpcnN0TmFtZSB8fCAnSm9obicsXG4gICAgICAgICAgICAgICAgbGFzdE5hbWU6IGFyZ3MuaW5wdXQubGFzdE5hbWUgfHwgJ0RvZScsXG4gICAgICAgICAgICAgICAgZnVsbE5hbWU6IChhcmdzLmlucHV0LmZpcnN0TmFtZSB8fCAnSm9obicpICsgJyAnICsgKGFyZ3MuaW5wdXQubGFzdE5hbWUgfHwgJ0RvZScpLFxuICAgICAgICAgICAgICAgIGlzVHV0b3I6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGlzQWN0aXZlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBmaWVsZDogJyArIGZpZWxkTmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgYCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBFTlZJUk9OTUVOVDogcHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICAgIFVTRVJfU0VSVklDRV9VUkw6IGBodHRwOi8vdXNlci1zZXJ2aWNlLiR7cHJvcHMuZW52aXJvbm1lbnR9OjMwMDFgLFxuICAgICAgICBBV1NfTk9ERUpTX0NPTk5FQ1RJT05fUkVVU0VfRU5BQkxFRDogJzEnLFxuICAgICAgfSxcbiAgICAgIHJvbGU6IGxhbWJkYUV4ZWN1dGlvblJvbGUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBMYW1iZGEgRGF0YSBTb3VyY2VcbiAgICB0aGlzLnVzZXJEYXRhU291cmNlID0gdGhpcy5hcGkuYWRkTGFtYmRhRGF0YVNvdXJjZShcbiAgICAgICdVc2VyU2VydmljZURhdGFTb3VyY2UnLFxuICAgICAgdXNlclNlcnZpY2VSZXNvbHZlcixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ1VzZXJTZXJ2aWNlRGF0YVNvdXJjZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIGRhdGEgc291cmNlIGZvciBVc2VyIFNlcnZpY2Ugb3BlcmF0aW9ucycsXG4gICAgICB9XG4gICAgKTtcblxuICAgIC8vIEFkZCBRdWVyeSBhbmQgTXV0YXRpb24gZmllbGRzXG4gICAgdGhpcy5hcGkuYWRkUXVlcnkoJ21lJywgbmV3IGFwcHN5bmMuUmVzb2x2YWJsZUZpZWxkKHtcbiAgICAgIHJldHVyblR5cGU6IHVzZXJUeXBlLmF0dHJpYnV0ZSgpLFxuICAgICAgZGF0YVNvdXJjZTogdGhpcy51c2VyRGF0YVNvdXJjZSxcbiAgICB9KSk7XG5cbiAgICB0aGlzLmFwaS5hZGRRdWVyeSgndXNlcicsIG5ldyBhcHBzeW5jLlJlc29sdmFibGVGaWVsZCh7XG4gICAgICByZXR1cm5UeXBlOiB1c2VyVHlwZS5hdHRyaWJ1dGUoKSxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgaWQ6IGFwcHN5bmMuR3JhcGhxbFR5cGUuaWQoeyBpc1JlcXVpcmVkOiB0cnVlIH0pLFxuICAgICAgfSxcbiAgICAgIGRhdGFTb3VyY2U6IHRoaXMudXNlckRhdGFTb3VyY2UsXG4gICAgfSkpO1xuXG4gICAgdGhpcy5hcGkuYWRkTXV0YXRpb24oJ2NyZWF0ZVVzZXInLCBuZXcgYXBwc3luYy5SZXNvbHZhYmxlRmllbGQoe1xuICAgICAgcmV0dXJuVHlwZTogdXNlclR5cGUuYXR0cmlidXRlKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgaW5wdXQ6IGNyZWF0ZVVzZXJJbnB1dC5hdHRyaWJ1dGUoeyBpc1JlcXVpcmVkOiB0cnVlIH0pLFxuICAgICAgfSxcbiAgICAgIGRhdGFTb3VyY2U6IHRoaXMudXNlckRhdGFTb3VyY2UsXG4gICAgfSkpO1xuXG4gICAgdGhpcy5hcGkuYWRkTXV0YXRpb24oJ3VwZGF0ZVVzZXInLCBuZXcgYXBwc3luYy5SZXNvbHZhYmxlRmllbGQoe1xuICAgICAgcmV0dXJuVHlwZTogdXNlclR5cGUuYXR0cmlidXRlKHsgaXNSZXF1aXJlZDogdHJ1ZSB9KSxcbiAgICAgIGFyZ3M6IHtcbiAgICAgICAgaWQ6IGFwcHN5bmMuR3JhcGhxbFR5cGUuaWQoeyBpc1JlcXVpcmVkOiB0cnVlIH0pLFxuICAgICAgICBpbnB1dDogdXBkYXRlVXNlcklucHV0LmF0dHJpYnV0ZSh7IGlzUmVxdWlyZWQ6IHRydWUgfSksXG4gICAgICB9LFxuICAgICAgZGF0YVNvdXJjZTogdGhpcy51c2VyRGF0YVNvdXJjZSxcbiAgICB9KSk7XG5cbiAgICAvLyBTdG9yZSBBcHBTeW5jIGNvbmZpZ3VyYXRpb24gaW4gU1NNXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0FwcFN5bmNBcGlJZFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmFwaS5hcGlJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBHcmFwaFFMIEFQSSBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQXBwU3luY0FwaVVybFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2FwcHN5bmMvYXBpLXVybGAsXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5hcGkuZ3JhcGhxbFVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwU3luYyBHcmFwaFFMIEFQSSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0FwcFN5bmNBcGlLZXlQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS9hcHBzeW5jL2FwaS1rZXlgLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuYXBpLmFwaUtleSEsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgQVBJIEtleSBmb3IgZGV2ZWxvcG1lbnQnLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHcmFwaFFMQXBpSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5hcGkuYXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcFN5bmMgR3JhcGhRTCBBUEkgSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUdyYXBoUUxBcGlJZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaVVybCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5ncmFwaHFsVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBTeW5jIEdyYXBoUUwgQVBJIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tR3JhcGhRTEFwaVVybGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR3JhcGhRTEFwaUtleScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5hcGlLZXkhLFxuICAgICAgZGVzY3JpcHRpb246ICdBcHBTeW5jIEFQSSBLZXkgZm9yIGRldmVsb3BtZW50JyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1HcmFwaFFMQXBpS2V5YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHByb3BzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEIGZvciBhdXRoZW50aWNhdGlvbicsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiBwcm9wcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQgZm9yIGF1dGhlbnRpY2F0aW9uJyxcbiAgICB9KTtcbiAgfVxufSAiXX0=