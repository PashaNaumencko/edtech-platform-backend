"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServiceStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const rds = require("aws-cdk-lib/aws-rds");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const logs = require("aws-cdk-lib/aws-logs");
const iam = require("aws-cdk-lib/aws-iam");
const ssm = require("aws-cdk-lib/aws-ssm");
class UserServiceStack extends cdk.Stack {
    database;
    cluster;
    service;
    loadBalancer;
    taskDefinition;
    constructor(scope, id, props) {
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
                instanceType: props.environment === 'production'
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
                retention: props.environment === 'production' ? cdk.Duration.days(30) : cdk.Duration.days(7),
                preferredWindow: '03:00-04:00',
            },
            cloudwatchLogsExports: ['postgresql'],
            deletionProtection: props.environment === 'production',
            removalPolicy: props.environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
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
            retention: props.environment === 'production'
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
                DATABASE_URL: ecs.Secret.fromSecretsManager(this.database.secret, 'DATABASE_URL'),
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
exports.UserServiceStack = UserServiceStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1zZXJ2aWNlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlci1zZXJ2aWNlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyxnRUFBZ0U7QUFDaEUsNkNBQTZDO0FBQzdDLDJDQUEyQztBQUkzQywyQ0FBMkM7QUFXM0MsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QixRQUFRLENBQXNCO0lBQzlCLE9BQU8sQ0FBYztJQUNyQixPQUFPLENBQXFCO0lBQzVCLFlBQVksQ0FBZ0M7SUFDNUMsY0FBYyxDQUE0QjtJQUUxRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHdCQUF3QjtRQUN4QixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ3JFLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLFdBQVcsRUFBRSxtREFBbUQ7WUFDaEUsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjthQUM1QztTQUNGLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDbkUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7Z0JBQy9DLE9BQU8sRUFBRSxHQUFHLENBQUMsMkJBQTJCLENBQUMsUUFBUTthQUNsRCxDQUFDO1lBQ0YsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFO2dCQUMz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QUFVLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVywwQkFBMEI7U0FDM0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBelFELDRDQXlRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJTZXJ2aWNlU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdnBjOiBlYzIuVnBjO1xuICB1c2VyUG9vbDogY29nbml0by5Vc2VyUG9vbDtcbiAgZXZlbnRCdXM6IGV2ZW50cy5FdmVudEJ1cztcbiAgY29udGVudEJ1Y2tldDogczMuQnVja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgVXNlclNlcnZpY2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZTogcmRzLkRhdGFiYXNlQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IGNsdXN0ZXI6IGVjcy5DbHVzdGVyO1xuICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xuICBwdWJsaWMgcmVhZG9ubHkgbG9hZEJhbGFuY2VyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcjtcbiAgcHVibGljIHJlYWRvbmx5IHRhc2tEZWZpbml0aW9uOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBVc2VyU2VydmljZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIERhdGFiYXNlIFN1Ym5ldCBHcm91cFxuICAgIGNvbnN0IGRiU3VibmV0R3JvdXAgPSBuZXcgcmRzLlN1Ym5ldEdyb3VwKHRoaXMsICdEYXRhYmFzZVN1Ym5ldEdyb3VwJywge1xuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgVXNlciBTZXJ2aWNlIFBvc3RncmVTUUwgZGF0YWJhc2UnLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFJEUyBQb3N0Z3JlU1FMIENsdXN0ZXJcbiAgICB0aGlzLmRhdGFiYXNlID0gbmV3IHJkcy5EYXRhYmFzZUNsdXN0ZXIodGhpcywgJ1VzZXJTZXJ2aWNlRGF0YWJhc2UnLCB7XG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUNsdXN0ZXJFbmdpbmUuYXVyb3JhUG9zdGdyZXMoe1xuICAgICAgICB2ZXJzaW9uOiByZHMuQXVyb3JhUG9zdGdyZXNFbmdpbmVWZXJzaW9uLlZFUl8xNV80LFxuICAgICAgfSksXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21HZW5lcmF0ZWRTZWNyZXQoJ3Bvc3RncmVzJywge1xuICAgICAgICBzZWNyZXROYW1lOiBgZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9L3Jkcy91c2VyLXNlcnZpY2VgLFxuICAgICAgfSksXG4gICAgICBpbnN0YW5jZVByb3BzOiB7XG4gICAgICAgIGluc3RhbmNlVHlwZTpcbiAgICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nXG4gICAgICAgICAgICA/IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuUjZHLCBlYzIuSW5zdGFuY2VTaXplLkxBUkdFKVxuICAgICAgICAgICAgOiBlYzIuSW5zdGFuY2VUeXBlLm9mKGVjMi5JbnN0YW5jZUNsYXNzLlQ0RywgZWMyLkluc3RhbmNlU2l6ZS5NRURJVU0pLFxuICAgICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcbiAgICAgICAgfSxcbiAgICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgICB9LFxuICAgICAgaW5zdGFuY2VzOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMiA6IDEsXG4gICAgICBkZWZhdWx0RGF0YWJhc2VOYW1lOiAndXNlcnNlcnZpY2UnLFxuICAgICAgc3VibmV0R3JvdXA6IGRiU3VibmV0R3JvdXAsXG4gICAgICBiYWNrdXA6IHtcbiAgICAgICAgcmV0ZW50aW9uOlxuICAgICAgICAgIHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyBjZGsuRHVyYXRpb24uZGF5cygzMCkgOiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcbiAgICAgICAgcHJlZmVycmVkV2luZG93OiAnMDM6MDAtMDQ6MDAnLFxuICAgICAgfSxcbiAgICAgIGNsb3Vkd2F0Y2hMb2dzRXhwb3J0czogWydwb3N0Z3Jlc3FsJ10sXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicsXG4gICAgICByZW1vdmFsUG9saWN5OlxuICAgICAgICBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEVDUyBDbHVzdGVyXG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdVc2VyU2VydmljZUNsdXN0ZXInLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIGNsdXN0ZXJOYW1lOiBgRWRUZWNoLVVzZXJTZXJ2aWNlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGNvbnRhaW5lckluc2lnaHRzOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgIH0pO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2cgR3JvdXBcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdVc2VyU2VydmljZUxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2Vjcy9lZHRlY2gtdXNlci1zZXJ2aWNlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjpcbiAgICAgICAgcHJvcHMuZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJ1xuICAgICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USFxuICAgICAgICAgIDogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIFRhc2sgRXhlY3V0aW9uIFJvbGVcbiAgICBjb25zdCB0YXNrRXhlY3V0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVGFza0V4ZWN1dGlvblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIFRhc2sgUm9sZSB3aXRoIHBlcm1pc3Npb25zIGZvciBBV1Mgc2VydmljZXNcbiAgICBjb25zdCB0YXNrUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVGFza1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIFVzZXJTZXJ2aWNlUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5EZWxldGVVc2VyJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6TGlzdFVzZXJzJyxcbiAgICAgICAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxuICAgICAgICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtwcm9wcy51c2VyUG9vbC51c2VyUG9vbEFybl0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbJ2V2ZW50czpQdXRFdmVudHMnXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZXZlbnRCdXMuZXZlbnRCdXNBcm5dLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnLCAnczM6UHV0T2JqZWN0JywgJ3MzOkRlbGV0ZU9iamVjdCcsICdzMzpHZXRTaWduZWRVcmwnXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYCR7cHJvcHMuY29udGVudEJ1Y2tldC5idWNrZXRBcm59LypgXSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFsnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnNlY3JldDplZHRlY2gvJHtwcm9wcy5lbnZpcm9ubWVudH0vKmAsXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgICBhY3Rpb25zOiBbJ3NzbTpHZXRQYXJhbWV0ZXInLCAnc3NtOkdldFBhcmFtZXRlcnMnLCAnc3NtOkdldFBhcmFtZXRlcnNCeVBhdGgnXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgICAgICAgYGFybjphd3M6c3NtOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpwYXJhbWV0ZXIvZWR0ZWNoLyR7cHJvcHMuZW52aXJvbm1lbnR9LypgLFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gRmFyZ2F0ZSBUYXNrIERlZmluaXRpb25cbiAgICB0aGlzLnRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1VzZXJTZXJ2aWNlVGFza0RlZmluaXRpb24nLCB7XG4gICAgICBtZW1vcnlMaW1pdE1pQjogcHJvcHMuZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDEwMjQgOiA1MTIsXG4gICAgICBjcHU6IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyA1MTIgOiAyNTYsXG4gICAgICBleGVjdXRpb25Sb2xlOiB0YXNrRXhlY3V0aW9uUm9sZSxcbiAgICAgIHRhc2tSb2xlOiB0YXNrUm9sZSxcbiAgICB9KTtcblxuICAgIC8vIENvbnRhaW5lciBEZWZpbml0aW9uXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy50YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ1VzZXJTZXJ2aWNlQ29udGFpbmVyJywge1xuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ3B1YmxpYy5lY3IuYXdzL2RvY2tlci9saWJyYXJ5L25vZGU6MTgtYWxwaW5lJyksIC8vIFBsYWNlaG9sZGVyXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBOT0RFX0VOVjogcHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICAgIFBPUlQ6ICczMDAwJyxcbiAgICAgICAgQVdTX1JFR0lPTjogY2RrLkF3cy5SRUdJT04sXG4gICAgICAgIFVTRVJfUE9PTF9JRDogcHJvcHMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgRVZFTlRfQlVTX0FSTjogcHJvcHMuZXZlbnRCdXMuZXZlbnRCdXNBcm4sXG4gICAgICAgIENPTlRFTlRfQlVDS0VUX05BTUU6IHByb3BzLmNvbnRlbnRCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIH0sXG4gICAgICBzZWNyZXRzOiB7XG4gICAgICAgIERBVEFCQVNFX1VSTDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIodGhpcy5kYXRhYmFzZS5zZWNyZXQhLCAnREFUQUJBU0VfVVJMJyksXG4gICAgICB9LFxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuYXdzTG9ncyh7XG4gICAgICAgIHN0cmVhbVByZWZpeDogJ3VzZXItc2VydmljZScsXG4gICAgICAgIGxvZ0dyb3VwLFxuICAgICAgfSksXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBjb21tYW5kOiBbJ0NNRC1TSEVMTCcsICdjdXJsIC1mIGh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9oZWFsdGggfHwgZXhpdCAxJ10sXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxuICAgICAgICByZXRyaWVzOiAzLFxuICAgICAgICBzdGFydFBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xuICAgICAgY29udGFpbmVyUG9ydDogMzAwMCxcbiAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVENQLFxuICAgIH0pO1xuXG4gICAgLy8gQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlclxuICAgIHRoaXMubG9hZEJhbGFuY2VyID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsICdVc2VyU2VydmljZUFMQicsIHtcbiAgICAgIHZwYzogcHJvcHMudnBjLFxuICAgICAgaW50ZXJuZXRGYWNpbmc6IGZhbHNlLCAvLyBJbnRlcm5hbCBBTEJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgICBsb2FkQmFsYW5jZXJOYW1lOiBgRWRUZWNoLVVzZXJTZXJ2aWNlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIFRhcmdldCBHcm91cFxuICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1VzZXJTZXJ2aWNlVGFyZ2V0R3JvdXAnLCB7XG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JUCxcbiAgICAgIGhlYWx0aENoZWNrOiB7XG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIHBhdGg6ICcvaGVhbHRoJyxcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLlByb3RvY29sLkhUVFAsXG4gICAgICAgIHBvcnQ6ICczMDAwJyxcbiAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxuICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxuICAgICAgfSxcbiAgICAgIHRhcmdldEdyb3VwTmFtZTogYEVkVGVjaC1Vc2VyU2VydmljZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgfSk7XG5cbiAgICAvLyBBTEIgTGlzdGVuZXJcbiAgICBjb25zdCBsaXN0ZW5lciA9IHRoaXMubG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdVc2VyU2VydmljZUxpc3RlbmVyJywge1xuICAgICAgcG9ydDogODAsXG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxuICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RhcmdldEdyb3VwXSxcbiAgICB9KTtcblxuICAgIC8vIEVDUyBGYXJnYXRlIFNlcnZpY2VcbiAgICB0aGlzLnNlcnZpY2UgPSBuZXcgZWNzLkZhcmdhdGVTZXJ2aWNlKHRoaXMsICdVc2VyU2VydmljZUZhcmdhdGVTZXJ2aWNlJywge1xuICAgICAgY2x1c3RlcjogdGhpcy5jbHVzdGVyLFxuICAgICAgdGFza0RlZmluaXRpb246IHRoaXMudGFza0RlZmluaXRpb24sXG4gICAgICBkZXNpcmVkQ291bnQ6IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyIDogMSxcbiAgICAgIG1pbkhlYWx0aHlQZXJjZW50OiA1MCxcbiAgICAgIG1heEhlYWx0aHlQZXJjZW50OiAyMDAsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICB9LFxuICAgICAgc2VydmljZU5hbWU6IGBFZFRlY2gtVXNlclNlcnZpY2UtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgLy8gUmVnaXN0ZXIgc2VydmljZSB3aXRoIHRhcmdldCBncm91cFxuICAgIHRoaXMuc2VydmljZS5yZWdpc3RlckxvYWRCYWxhbmNlclRhcmdldHMoe1xuICAgICAgY29udGFpbmVyTmFtZTogJ1VzZXJTZXJ2aWNlQ29udGFpbmVyJyxcbiAgICAgIGNvbnRhaW5lclBvcnQ6IDMwMDAsXG4gICAgICBuZXdUYXJnZXRHcm91cElkOiAnVXNlclNlcnZpY2VURycsXG4gICAgICBsaXN0ZW5lcjogZWNzLkxpc3RlbmVyQ29uZmlnLmFwcGxpY2F0aW9uTGlzdGVuZXIobGlzdGVuZXIsIHtcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gQWxsb3cgZGF0YWJhc2UgY29ubmVjdGlvbnMgZnJvbSBzZXJ2aWNlXG4gICAgdGhpcy5kYXRhYmFzZS5jb25uZWN0aW9ucy5hbGxvd0Zyb20odGhpcy5zZXJ2aWNlLCBlYzIuUG9ydC50Y3AoNTQzMikpO1xuXG4gICAgLy8gU1NNIFBhcmFtZXRlcnMgZm9yIHNlcnZpY2UgY29uZmlndXJhdGlvblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdEYXRhYmFzZUVuZHBvaW50UGFyYW1ldGVyJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogYC9lZHRlY2gvJHtwcm9wcy5lbnZpcm9ubWVudH0vdXNlci1zZXJ2aWNlL2RhdGFiYXNlLWVuZHBvaW50YCxcbiAgICAgIHN0cmluZ1ZhbHVlOiB0aGlzLmRhdGFiYXNlLmNsdXN0ZXJFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlciBTZXJ2aWNlIERhdGFiYXNlIEVuZHBvaW50JyxcbiAgICB9KTtcblxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdMb2FkQmFsYW5jZXJETlNQYXJhbWV0ZXInLCB7XG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgL2VkdGVjaC8ke3Byb3BzLmVudmlyb25tZW50fS91c2VyLXNlcnZpY2UvbG9hZC1iYWxhbmNlci1kbnNgLFxuICAgICAgc3RyaW5nVmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzZXIgU2VydmljZSBMb2FkIEJhbGFuY2VyIEROUyBOYW1lJyxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRhdGFiYXNlLmNsdXN0ZXJFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkRTIFBvc3RncmVTUUwgQ2x1c3RlciBFbmRwb2ludCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5lbnZpcm9ubWVudH0tVXNlclNlcnZpY2UtRGF0YWJhc2VFbmRwb2ludGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRE5TJywge1xuICAgICAgdmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgRE5TIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LVVzZXJTZXJ2aWNlLUxvYWRCYWxhbmNlckROU2AsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VydmljZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5zZXJ2aWNlLnNlcnZpY2VOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgRmFyZ2F0ZSBTZXJ2aWNlIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LVVzZXJTZXJ2aWNlLVNlcnZpY2VOYW1lYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmNsdXN0ZXIuY2x1c3Rlck5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBDbHVzdGVyIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LVVzZXJTZXJ2aWNlLUNsdXN0ZXJOYW1lYCxcbiAgICB9KTtcbiAgfVxufVxuIl19