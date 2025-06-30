import * as cdk from 'aws-cdk-lib';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface AppSyncCompleteStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
}
export declare class AppSyncCompleteStack extends cdk.Stack {
    readonly api: appsync.GraphqlApi;
    readonly userResolver: lambda.Function;
    constructor(scope: Construct, id: string, props: AppSyncCompleteStackProps);
}
