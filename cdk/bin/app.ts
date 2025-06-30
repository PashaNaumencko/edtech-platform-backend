#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/stacks/network-stack';
import { SharedServicesStack } from '../lib/stacks/shared-services-stack';
import { UserServiceStack } from '../lib/stacks/user-service-stack';
import { AppSyncBasicStack } from '../lib/stacks/appsync-basic-stack';
// import { AppSyncStack } from '../lib/stacks/appsync-stack';
// import { AppSyncStack } from '../lib/stacks/appsync-stack';

const app = new cdk.App();

// Get environment from context
const environment = app.node.tryGetContext('environment') || 'development';

// Common tags for all resources
const commonTags = {
  Project: 'EdTech-Platform',
  Environment: environment,
  ManagedBy: 'CDK',
  Owner: 'Platform-Team'
};

// Environment-specific configuration
const config = {
  development: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
    },
    stackNamePrefix: 'EdTech-Dev'
  },
  production: {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
    },
    stackNamePrefix: 'EdTech-Prod'
  }
};

const currentConfig = config[environment as keyof typeof config];

// Network Foundation Stack
const networkStack = new NetworkStack(app, `${currentConfig.stackNamePrefix}-Network`, {
  env: currentConfig.env,
  tags: commonTags,
  environment
});

// Shared Services Stack (depends on network)
const sharedServicesStack = new SharedServicesStack(app, `${currentConfig.stackNamePrefix}-SharedServices`, {
  env: currentConfig.env,
  tags: commonTags,
  environment,
  vpc: networkStack.vpc
});

// User Service Stack (depends on network and shared services)
const userServiceStack = new UserServiceStack(app, `${currentConfig.stackNamePrefix}-UserService`, {
  env: currentConfig.env,
  tags: commonTags,
  environment,
  vpc: networkStack.vpc,
  userPool: sharedServicesStack.userPool,
  eventBus: sharedServicesStack.eventBus,
  contentBucket: sharedServicesStack.contentBucket
});

// AppSync Basic Stack (Day 2 completion - Cognito ready for AppSync)
const appSyncStack = new AppSyncBasicStack(app, `${currentConfig.stackNamePrefix}-AppSync`, {
  env: currentConfig.env,
  tags: commonTags,
  environment,
  vpc: networkStack.vpc,
  userPool: sharedServicesStack.userPool,
  userPoolClient: sharedServicesStack.userPoolClient
});

// AppSync Stack (commented out until schema definition issues are resolved)
// const appSyncStack = new AppSyncStack(app, `${currentConfig.stackNamePrefix}-AppSync`, {
//   env: currentConfig.env,
//   tags: commonTags,
//   environment,
//   vpc: networkStack.vpc,
//   userPool: sharedServicesStack.userPool,
//   userPoolClient: sharedServicesStack.userPoolClient
// });

// Add dependencies
sharedServicesStack.addDependency(networkStack);
userServiceStack.addDependency(networkStack);
userServiceStack.addDependency(sharedServicesStack);
appSyncStack.addDependency(sharedServicesStack);
// appSyncStack.addDependency(sharedServicesStack); 