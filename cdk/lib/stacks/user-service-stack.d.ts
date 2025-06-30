import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as events from 'aws-cdk-lib/aws-events';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export interface UserServiceStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
    userPool: cognito.UserPool;
    eventBus: events.EventBus;
    contentBucket: s3.Bucket;
}
export declare class UserServiceStack extends cdk.Stack {
    readonly database: rds.DatabaseCluster;
    readonly cluster: ecs.Cluster;
    readonly service: ecs.FargateService;
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    constructor(scope: Construct, id: string, props: UserServiceStackProps);
}
