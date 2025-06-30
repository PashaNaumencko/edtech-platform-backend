import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as events from 'aws-cdk-lib/aws-events';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface SharedServicesStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
}
export declare class SharedServicesStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly identityPool: cognito.CfnIdentityPool;
    readonly contentBucket: s3.Bucket;
    readonly videoBucket: s3.Bucket;
    readonly uploadsBucket: s3.Bucket;
    readonly distribution: cloudfront.Distribution;
    readonly eventBus: events.EventBus;
    constructor(scope: Construct, id: string, props: SharedServicesStackProps);
}
