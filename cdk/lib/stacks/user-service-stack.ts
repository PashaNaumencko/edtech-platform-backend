import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface UserServiceStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  userPool: cognito.UserPool;
  eventBus: events.EventBus;
  contentBucket: s3.Bucket;
}

export class UserServiceStack extends cdk.Stack {
  public readonly database: rds.DatabaseCluster;
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: UserServiceStackProps) {
    super(scope, id, props);

    // Database Subnet Group
    const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: props.vpc,
      description: 'Subnet group for User Service PostgreSQL database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // RDS PostgreSQL Cluster
    this.database = new rds.DatabaseCluster(this, 'UserServiceDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: `edtech/${props.environment}/rds/user-service`,
      }),
      instanceProps: {
        instanceType:
          props.environment === 'production'
            ? ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE)
            : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        vpc: props.vpc,
      },
      instances: props.environment === 'production' ? 2 : 1,
      defaultDatabaseName: 'userservice',
      subnetGroup: dbSubnetGroup,
      backup: {
        retention:
          props.environment === 'production' ? cdk.Duration.days(30) : cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      cloudwatchLogsExports: ['postgresql'],
      deletionProtection: props.environment === 'production',
      removalPolicy:
        props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ECS Cluster
    this.cluster = new ecs.Cluster(this, 'UserServiceCluster', {
      vpc: props.vpc,
      clusterName: `EdTech-UserService-${props.environment}`,
      containerInsights: props.environment === 'production',
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'UserServiceLogGroup', {
      logGroupName: `/ecs/edtech-user-service-${props.environment}`,
      retention:
        props.environment === 'production'
          ? logs.RetentionDays.ONE_MONTH
          : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Execution Role
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task Role with permissions for AWS services
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        UserServicePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:ListUsers',
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
              ],
              resources: [props.userPool.userPoolArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['events:PutEvents'],
              resources: [props.eventBus.eventBusArn],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:GetSignedUrl'],
              resources: [`${props.contentBucket.bucketArn}/*`],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: [
                `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:edtech/${props.environment}/*`,
              ],
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
              resources: [
                `arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/edtech/${props.environment}/*`,
              ],
            }),
          ],
        }),
      },
    });

    // Fargate Task Definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'UserServiceTaskDefinition', {
      memoryLimitMiB: props.environment === 'production' ? 1024 : 512,
      cpu: props.environment === 'production' ? 512 : 256,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    // Container Definition
    const container = this.taskDefinition.addContainer('UserServiceContainer', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/node:18-alpine'), // Placeholder
      environment: {
        NODE_ENV: props.environment,
        PORT: '3000',
        AWS_REGION: cdk.Aws.REGION,
        USER_POOL_ID: props.userPool.userPoolId,
        EVENT_BUS_ARN: props.eventBus.eventBusArn,
        CONTENT_BUCKET_NAME: props.contentBucket.bucketName,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(this.database.secret!, 'DATABASE_URL'),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'user-service',
        logGroup,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'UserServiceALB', {
      vpc: props.vpc,
      internetFacing: false, // Internal ALB
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      loadBalancerName: `EdTech-UserService-${props.environment}`,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'UserServiceTargetGroup', {
      vpc: props.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: '/health',
        protocol: elbv2.Protocol.HTTP,
        port: '3000',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      targetGroupName: `EdTech-UserService-${props.environment}`,
    });

    // ALB Listener
    const listener = this.loadBalancer.addListener('UserServiceListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // ECS Fargate Service
    this.service = new ecs.FargateService(this, 'UserServiceFargateService', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: props.environment === 'production' ? 2 : 1,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serviceName: `EdTech-UserService-${props.environment}`,
    });

    // Register service with target group
    this.service.registerLoadBalancerTargets({
      containerName: 'UserServiceContainer',
      containerPort: 3000,
      newTargetGroupId: 'UserServiceTG',
      listener: ecs.ListenerConfig.applicationListener(listener, {
        protocol: elbv2.ApplicationProtocol.HTTP,
      }),
    });

    // Allow database connections from service
    this.database.connections.allowFrom(this.service, ec2.Port.tcp(5432));

    // SSM Parameters for service configuration
    new ssm.StringParameter(this, 'DatabaseEndpointParameter', {
      parameterName: `/edtech/${props.environment}/user-service/database-endpoint`,
      stringValue: this.database.clusterEndpoint.hostname,
      description: 'User Service Database Endpoint',
    });

    new ssm.StringParameter(this, 'LoadBalancerDNSParameter', {
      parameterName: `/edtech/${props.environment}/user-service/load-balancer-dns`,
      stringValue: this.loadBalancer.loadBalancerDnsName,
      description: 'User Service Load Balancer DNS Name',
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.clusterEndpoint.hostname,
      description: 'RDS PostgreSQL Cluster Endpoint',
      exportName: `${props.environment}-UserService-DatabaseEndpoint`,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
      exportName: `${props.environment}-UserService-LoadBalancerDNS`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Fargate Service Name',
      exportName: `${props.environment}-UserService-ServiceName`,
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${props.environment}-UserService-ClusterName`,
    });
  }
}
