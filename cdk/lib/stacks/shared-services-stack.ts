import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as events from 'aws-cdk-lib/aws-events';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface SharedServicesStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
}

export class SharedServicesStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly contentBucket: s3.Bucket;
  public readonly videoBucket: s3.Bucket;
  public readonly uploadsBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: SharedServicesStackProps) {
    super(scope, id, props);

    // S3 Buckets for content storage
    this.contentBucket = new s3.Bucket(this, 'ContentBucket', {
      bucketName: `edtech-content-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy:
        props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
      removalPolicy:
        props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
      removalPolicy:
        props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
      priceClass:
        props.environment === 'production'
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
      removalPolicy:
        props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
