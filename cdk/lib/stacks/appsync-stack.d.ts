import * as cdk from 'aws-cdk-lib';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface AppSyncStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
}
export declare class AppSyncStack extends cdk.Stack {
    readonly api: appsync.GraphqlApi;
    readonly userDataSource: appsync.LambdaDataSource;
    constructor(scope: Construct, id: string, props: AppSyncStackProps);
}
