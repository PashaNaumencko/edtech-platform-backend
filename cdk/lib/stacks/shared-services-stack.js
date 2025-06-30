"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedServicesStack = void 0;
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
const s3 = require("aws-cdk-lib/aws-s3");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const events = require("aws-cdk-lib/aws-events");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const ssm = require("aws-cdk-lib/aws-ssm");
class SharedServicesStack extends cdk.Stack {
    userPool;
    userPoolClient;
    identityPool;
    contentBucket;
    videoBucket;
    uploadsBucket;
    distribution;
    eventBus;
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 Buckets for content storage
        this.contentBucket = new s3.Bucket(this, 'ContentBucket', {
            bucketName: `edtech-content-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            versioned: props.environment === 'production',
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
                    allowedOrigins: ['*'], // Will be restricted in production
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
        });
        // S3 Bucket for tutor video introductions
        this.videoBucket = new s3.Bucket(this, 'VideoBucket', {
            bucketName: `edtech-videos-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            versioned: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
                },
            ],
        });
        // S3 Bucket for general uploads
        this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
            bucketName: `edtech-uploads-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
            versioned: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });
        // CloudFront Distribution for global content delivery
        this.distribution = new cloudfront.Distribution(this, 'ContentDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(this.contentBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
            },
            additionalBehaviors: {
                '/videos/*': {
                    origin: new origins.S3Origin(this.videoBucket),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                },
            },
            priceClass: props.environment === 'production'
                ? cloudfront.PriceClass.PRICE_CLASS_ALL
                : cloudfront.PriceClass.PRICE_CLASS_100,
            enabled: true,
            comment: `EdTech Platform Content CDN - ${props.environment}`,
        });
        // Cognito User Pool with enhanced social authentication
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `EdTech-UserPool-${props.environment}`,
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: 'Welcome to EdTech Platform! Verify your email',
                emailBody: 'Welcome to EdTech Platform! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
                smsMessage: 'Welcome to EdTech Platform! Your verification code is {####}',
            },
            signInAliases: {
                email: true,
                username: false,
                phone: false,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
                locale: {
                    required: false,
                    mutable: true,
                },
                timezone: {
                    required: false,
                    mutable: true,
                },
            },
            customAttributes: {
                is_tutor: new cognito.BooleanAttribute({ mutable: true }),
                onboarding_completed: new cognito.BooleanAttribute({ mutable: true }),
                preferred_language: new cognito.StringAttribute({ mutable: true }),
                video_intro_url: new cognito.StringAttribute({ mutable: true }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // User Pool Client
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: `EdTech-Client-${props.environment}`,
            generateSecret: false, // For web/mobile apps
            authFlows: {
                userSrp: true,
                userPassword: false,
                adminUserPassword: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: false,
                },
                scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
                callbackUrls: [
                    `https://localhost:3000/auth/callback`,
                    `https://app.edtech-platform.com/auth/callback`, // Production URL
                ],
                logoutUrls: [
                    `https://localhost:3000/auth/logout`,
                    `https://app.edtech-platform.com/auth/logout`, // Production URL
                ],
            },
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO,
                cognito.UserPoolClientIdentityProvider.GOOGLE,
                cognito.UserPoolClientIdentityProvider.FACEBOOK,
                cognito.UserPoolClientIdentityProvider.APPLE,
            ],
            refreshTokenValidity: cdk.Duration.days(30),
            idTokenValidity: cdk.Duration.hours(1),
            accessTokenValidity: cdk.Duration.hours(1),
        });
        // Identity Pool for temporary AWS credentials
        this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
            identityPoolName: `EdTech_Identity_Pool_${props.environment}`,
            allowUnauthenticatedIdentities: true, // For browse-before-register
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
        // EventBridge Custom Event Bus
        this.eventBus = new events.EventBus(this, 'EventBus', {
            eventBusName: `EdTech-EventBus-${props.environment}`,
        });
        // Secrets Manager for social authentication credentials
        const socialAuthSecrets = new secretsmanager.Secret(this, 'SocialAuthSecrets', {
            secretName: `edtech/${props.environment}/social-auth`,
            description: 'Social authentication provider credentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    google_client_id: '',
                    google_client_secret: '',
                    facebook_app_id: '',
                    facebook_app_secret: '',
                    apple_client_id: '',
                    apple_team_id: '',
                    apple_key_id: '',
                    apple_private_key: '',
                }),
                generateStringKey: 'placeholder',
                excludeCharacters: '"@/\\',
            },
        });
        // SSM Parameters for non-sensitive configuration
        new ssm.StringParameter(this, 'UserPoolIdParameter', {
            parameterName: `/edtech/${props.environment}/cognito/user-pool-id`,
            stringValue: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new ssm.StringParameter(this, 'UserPoolClientIdParameter', {
            parameterName: `/edtech/${props.environment}/cognito/user-pool-client-id`,
            stringValue: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });
        new ssm.StringParameter(this, 'IdentityPoolIdParameter', {
            parameterName: `/edtech/${props.environment}/cognito/identity-pool-id`,
            stringValue: this.identityPool.ref,
            description: 'Cognito Identity Pool ID',
        });
        new ssm.StringParameter(this, 'EventBusArnParameter', {
            parameterName: `/edtech/${props.environment}/eventbridge/event-bus-arn`,
            stringValue: this.eventBus.eventBusArn,
            description: 'EventBridge Custom Event Bus ARN',
        });
        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: `${props.environment}-UserPoolId`,
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: `${props.environment}-UserPoolClientId`,
        });
        new cdk.CfnOutput(this, 'ContentBucketName', {
            value: this.contentBucket.bucketName,
            description: 'S3 Content Bucket Name',
            exportName: `${props.environment}-ContentBucketName`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.distribution.distributionId,
            description: 'CloudFront Distribution ID',
            exportName: `${props.environment}-CloudFrontDistributionId`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
            exportName: `${props.environment}-CloudFrontDomainName`,
        });
        new cdk.CfnOutput(this, 'EventBusArn', {
            value: this.eventBus.eventBusArn,
            description: 'EventBridge Custom Event Bus ARN',
            exportName: `${props.environment}-EventBusArn`,
        });
    }
}
exports.SharedServicesStack = SharedServicesStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLXNlcnZpY2VzLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2hhcmVkLXNlcnZpY2VzLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxtREFBbUQ7QUFDbkQseUNBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCw4REFBOEQ7QUFDOUQsaURBQWlEO0FBQ2pELGlFQUFpRTtBQUNqRSwyQ0FBMkM7QUFTM0MsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoQyxRQUFRLENBQW1CO0lBQzNCLGNBQWMsQ0FBeUI7SUFDdkMsWUFBWSxDQUEwQjtJQUN0QyxhQUFhLENBQVk7SUFDekIsV0FBVyxDQUFZO0lBQ3ZCLGFBQWEsQ0FBWTtJQUN6QixZQUFZLENBQTBCO0lBQ3RDLFFBQVEsQ0FBa0I7SUFFMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN4RCxVQUFVLEVBQUUsa0JBQWtCLEtBQUssQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDdkUsYUFBYSxFQUNYLEtBQUssQ0FBQyxXQUFXLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQzNGLFNBQVMsRUFBRSxLQUFLLENBQUMsV0FBVyxLQUFLLFlBQVk7WUFDN0MsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lB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LEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVU7WUFDcEMsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxvQkFBb0I7U0FDckQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjO1lBQ3ZDLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsMkJBQTJCO1NBQzVELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsc0JBQXNCO1lBQy9DLFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsVUFBVSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsdUJBQXVCO1NBQ3hELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVc7WUFDaEMsV0FBVyxFQUFFLGtDQUFrQztZQUMvQyxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxjQUFjO1NBQy9DLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxSRCxrREFrUkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoYXJlZFNlcnZpY2VzU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdnBjOiBlYzIuVnBjO1xufVxuXG5leHBvcnQgY2xhc3MgU2hhcmVkU2VydmljZXNTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xuICBwdWJsaWMgcmVhZG9ubHkgaWRlbnRpdHlQb29sOiBjb2duaXRvLkNmbklkZW50aXR5UG9vbDtcbiAgcHVibGljIHJlYWRvbmx5IGNvbnRlbnRCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IHZpZGVvQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb246IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRCdXM6IGV2ZW50cy5FdmVudEJ1cztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU2hhcmVkU2VydmljZXNTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBTMyBCdWNrZXRzIGZvciBjb250ZW50IHN0b3JhZ2VcbiAgICB0aGlzLmNvbnRlbnRCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdDb250ZW50QnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGVkdGVjaC1jb250ZW50LSR7cHJvcHMuZW52aXJvbm1lbnR9LSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsXG4gICAgICByZW1vdmFsUG9saWN5OlxuICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHZlcnNpb25lZDogcHJvcHMuZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCwgczMuSHR0cE1ldGhvZHMuUFVULCBzMy5IdHRwTWV0aG9kcy5QT1NUXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIC8vIFdpbGwgYmUgcmVzdHJpY3RlZCBpbiBwcm9kdWN0aW9uXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIG1heEFnZTogMzAwMCxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBTMyBCdWNrZXQgZm9yIHR1dG9yIHZpZGVvIGludHJvZHVjdGlvbnNcbiAgICB0aGlzLnZpZGVvQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnVmlkZW9CdWNrZXQnLCB7XG4gICAgICBidWNrZXROYW1lOiBgZWR0ZWNoLXZpZGVvcy0ke3Byb3BzLmVudmlyb25tZW50fS0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLFxuICAgICAgcmVtb3ZhbFBvbGljeTpcbiAgICAgICAgcHJvcHMuZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0RlbGV0ZUluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciBnZW5lcmFsIHVwbG9hZHNcbiAgICB0aGlzLnVwbG9hZHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdVcGxvYWRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGVkdGVjaC11cGxvYWRzLSR7cHJvcHMuZW52aXJvbm1lbnR9LSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsXG4gICAgICByZW1vdmFsUG9saWN5OlxuICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gZm9yIGdsb2JhbCBjb250ZW50IGRlbGl2ZXJ5XG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0NvbnRlbnREaXN0cmlidXRpb24nLCB7XG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLmNvbnRlbnRCdWNrZXQpLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFELFxuICAgICAgfSxcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy92aWRlb3MvKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHRoaXMudmlkZW9CdWNrZXQpLFxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVEX0ZPUl9VTkNPTVBSRVNTRURfT0JKRUNUUyxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwcmljZUNsYXNzOlxuICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nXG4gICAgICAgICAgPyBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfQUxMXG4gICAgICAgICAgOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGNvbW1lbnQ6IGBFZFRlY2ggUGxhdGZvcm0gQ29udGVudCBDRE4gLSAke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgfSk7XG5cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCB3aXRoIGVuaGFuY2VkIHNvY2lhbCBhdXRoZW50aWNhdGlvblxuICAgIHRoaXMudXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnVXNlclBvb2wnLCB7XG4gICAgICB1c2VyUG9vbE5hbWU6IGBFZFRlY2gtVXNlclBvb2wtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gRWRUZWNoIFBsYXRmb3JtISBWZXJpZnkgeW91ciBlbWFpbCcsXG4gICAgICAgIGVtYWlsQm9keTogJ1dlbGNvbWUgdG8gRWRUZWNoIFBsYXRmb3JtISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5DT0RFLFxuICAgICAgICBzbXNNZXNzYWdlOiAnV2VsY29tZSB0byBFZFRlY2ggUGxhdGZvcm0hIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9JyxcbiAgICAgIH0sXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICB1c2VybmFtZTogZmFsc2UsXG4gICAgICAgIHBob25lOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhdXRvVmVyaWZ5OiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDoge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGdpdmVuTmFtZToge1xuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgICAgIG11dGFibGU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGZhbWlseU5hbWU6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBsb2NhbGU6IHtcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZXpvbmU6IHtcbiAgICAgICAgICByZXF1aXJlZDogZmFsc2UsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XG4gICAgICAgIGlzX3R1dG9yOiBuZXcgY29nbml0by5Cb29sZWFuQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KSxcbiAgICAgICAgb25ib2FyZGluZ19jb21wbGV0ZWQ6IG5ldyBjb2duaXRvLkJvb2xlYW5BdHRyaWJ1dGUoeyBtdXRhYmxlOiB0cnVlIH0pLFxuICAgICAgICBwcmVmZXJyZWRfbGFuZ3VhZ2U6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUgfSksXG4gICAgICAgIHZpZGVvX2ludHJvX3VybDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbXV0YWJsZTogdHJ1ZSB9KSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OlxuICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIFVzZXIgUG9vbCBDbGllbnRcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sQ2xpZW50Jywge1xuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6IGBFZFRlY2gtQ2xpZW50LSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSwgLy8gRm9yIHdlYi9tb2JpbGUgYXBwc1xuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgIHVzZXJQYXNzd29yZDogZmFsc2UsXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIG9BdXRoOiB7XG4gICAgICAgIGZsb3dzOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvbkNvZGVHcmFudDogdHJ1ZSxcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIHNjb3BlczogW2NvZ25pdG8uT0F1dGhTY29wZS5FTUFJTCwgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCwgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEVdLFxuICAgICAgICBjYWxsYmFja1VybHM6IFtcbiAgICAgICAgICBgaHR0cHM6Ly9sb2NhbGhvc3Q6MzAwMC9hdXRoL2NhbGxiYWNrYCxcbiAgICAgICAgICBgaHR0cHM6Ly9hcHAuZWR0ZWNoLXBsYXRmb3JtLmNvbS9hdXRoL2NhbGxiYWNrYCwgLy8gUHJvZHVjdGlvbiBVUkxcbiAgICAgICAgXSxcbiAgICAgICAgbG9nb3V0VXJsczogW1xuICAgICAgICAgIGBodHRwczovL2xvY2FsaG9zdDozMDAwL2F1dGgvbG9nb3V0YCxcbiAgICAgICAgICBgaHR0cHM6Ly9hcHAuZWR0ZWNoLXBsYXRmb3JtLmNvbS9hdXRoL2xvZ291dGAsIC8vIFByb2R1Y3Rpb24gVVJMXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgc3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAgY29nbml0by5Vc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuQ09HTklUTyxcbiAgICAgICAgY29nbml0by5Vc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuR09PR0xFLFxuICAgICAgICBjb2duaXRvLlVzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlci5GQUNFQk9PSyxcbiAgICAgICAgY29nbml0by5Vc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuQVBQTEUsXG4gICAgICBdLFxuICAgICAgcmVmcmVzaFRva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgYWNjZXNzVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgIH0pO1xuXG4gICAgLy8gSWRlbnRpdHkgUG9vbCBmb3IgdGVtcG9yYXJ5IEFXUyBjcmVkZW50aWFsc1xuICAgIHRoaXMuaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsICdJZGVudGl0eVBvb2wnLCB7XG4gICAgICBpZGVudGl0eVBvb2xOYW1lOiBgRWRUZWNoX0lkZW50aXR5X1Bvb2xfJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiB0cnVlLCAvLyBGb3IgYnJvd3NlLWJlZm9yZS1yZWdpc3RlclxuICAgICAgY29nbml0b0lkZW50aXR5UHJvdmlkZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjbGllbnRJZDogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgIHByb3ZpZGVyTmFtZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBFdmVudEJyaWRnZSBDdXN0b20gRXZlbnQgQnVzXG4gICAgdGhpcy5ldmVudEJ1cyA9IG5ldyBldmVudHMuRXZlbnRCdXModGhpcywgJ0V2ZW50QnVzJywge1xuICAgICAgZXZlbnRCdXNOYW1lOiBgRWRUZWNoLUV2ZW50QnVzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIFNlY3JldHMgTWFuYWdlciBmb3Igc29jaWFsIGF1dGhlbnRpY2F0aW9uIGNyZWRlbnRpYWxzXG4gICAgY29uc3Qgc29jaWFsQXV0aFNlY3JldHMgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdTb2NpYWxBdXRoU2VjcmV0cycsIHtcbiAgICAgIHNlY3JldE5hbWU6IGBlZHRlY2gvJHtwcm9wcy5lbnZpcm9ubWVudH0vc29jaWFsLWF1dGhgLFxuICAgICAgZGVzY3JpcHRpb246ICdTb2NpYWwgYXV0aGVudGljYXRpb24gcHJvdmlkZXIgY3JlZGVudGlhbHMnLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBnb29nbGVfY2xpZW50X2lkOiAnJyxcbiAgICAgICAgICBnb29nbGVfY2xpZW50X3NlY3JldDogJycsXG4gICAgICAgICAgZmFjZWJvb2tfYXBwX2lkOiAnJyxcbiAgICAgICAgICBmYWNlYm9va19hcHBfc2VjcmV0OiAnJyxcbiAgICAgICAgICBhcHBsZV9jbGllbnRfaWQ6ICcnLFxuICAgICAgICAgIGFwcGxlX3RlYW1faWQ6ICcnLFxuICAgICAgICAgIGFwcGxlX2tleV9pZDogJycsXG4gICAgICAgICAgYXBwbGVfcHJpdmF0ZV9rZXk6ICcnLFxuICAgICAgICB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwbGFjZWhvbGRlcicsXG4gICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiAnXCJAL1xcXFwnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFNTTSBQYXJhbWV0ZXJzIGZvciBub24tc2Vuc2l0aXZlIGNvbmZpZ3VyYXRpb25cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnVXNlclBvb2xJZFBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2NvZ25pdG8vdXNlci1wb29sLWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdVc2VyUG9vbENsaWVudElkUGFyYW1ldGVyJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogYC9lZHRlY2gvJHtwcm9wcy5lbnZpcm9ubWVudH0vY29nbml0by91c2VyLXBvb2wtY2xpZW50LWlkYCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnSWRlbnRpdHlQb29sSWRQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS9jb2duaXRvL2lkZW50aXR5LXBvb2wtaWRgLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBJZGVudGl0eSBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdFdmVudEJ1c0FyblBhcmFtZXRlcicsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L2V2ZW50YnJpZGdlL2V2ZW50LWJ1cy1hcm5gLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMuZXZlbnRCdXMuZXZlbnRCdXNBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0V2ZW50QnJpZGdlIEN1c3RvbSBFdmVudCBCdXMgQVJOJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1Vc2VyUG9vbElkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS1Vc2VyUG9vbENsaWVudElkYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb250ZW50QnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNvbnRlbnRCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQ29udGVudCBCdWNrZXQgTmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tQ29udGVudEJ1Y2tldE5hbWVgLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gSUQnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUNsb3VkRnJvbnREaXN0cmlidXRpb25JZGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERvbWFpbk5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gRG9tYWluIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LUNsb3VkRnJvbnREb21haW5OYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFdmVudEJ1c0FybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmV2ZW50QnVzLmV2ZW50QnVzQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdFdmVudEJyaWRnZSBDdXN0b20gRXZlbnQgQnVzIEFSTicsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tRXZlbnRCdXNBcm5gLFxuICAgIH0pO1xuICB9XG59XG4iXX0=