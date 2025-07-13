# Step 6 (Day 19): Lambda Resolvers Implementation

**Objective**: Bridge the AWS AppSync supergraph with the `user-service` subgraph by creating Lambda resolvers that call the service's internal HTTP endpoints.

This is the "glue" that connects the federated gateway (AppSync) to the actual microservice implementation.

## 1. AppSync Data Source & Resolver Configuration

-   **Goal**: Configure AppSync to route GraphQL requests for the `user-service` to a Lambda function. This is done in the CDK.

```typescript
// cdk/lib/stacks/appsync-stack.ts

// 1. Define the Lambda function that will act as the resolver
const userServiceResolverLambda = new lambda.Function(this, 'UserServiceResolverLambda', {
    // ... lambda configuration
    // Ensure the Lambda has an environment variable for the service URL
    environment: {
        USER_SERVICE_URL: 'http://user-service.local:3000' // Example internal URL
    }
});

// 2. Create an AppSync Lambda Data Source
const userServiceDataSource = api.addLambdaDataSource('UserServiceDataSource', userServiceResolverLambda);

// 3. Attach the data source to specific fields in the GraphQL schema
userServiceDataSource.createResolver('QueryMeResolver', {
  typeName: 'Query',
  fieldName: 'me',
});

userServiceDataSource.createResolver('MutationUpdateMyProfileResolver', {
  typeName: 'Mutation',
  fieldName: 'updateMyProfile',
});
```

## 2. Lambda Resolver Function (Updated)

-   **Goal**: The Lambda function's code needs to translate the AppSync request context into an HTTP request to the `user-service`'s **internal REST endpoint**. This is more efficient and simpler than re-querying with GraphQL.

```typescript
// apps/user-service/src/infrastructure/lambda/appsync-resolver.handler.ts
import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

export async function handler(event: any, context: any) {
    const { typeName, fieldName, arguments: args, identity } = event;

    // The JWT from the client is passed in the identity object
    const authToken = identity.claims['token'];

    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
    };

    let response;
    try {
        switch (`${typeName}.${fieldName}`) {
            case 'Query.me':
                // Call the internal REST endpoint for getting the current user
                response = await axios.get(`${USER_SERVICE_URL}/internal/users/me`, { headers });
                return response.data;

            case 'Mutation.updateMyProfile':
                // Call the internal REST endpoint for updating the profile
                response = await axios.patch(`${USER_SERVICE_URL}/internal/users/me/profile`, args.input, { headers });
                return response.data;

            default:
                throw new Error(`Unknown resolver: ${typeName}.${fieldName}`);
        }
    } catch (error) {
        // Forward the error from the downstream service
        // AppSync will automatically format this into a GraphQL error response
        throw new Error(JSON.stringify(error.response.data));
    }
}
```
**Note**: This updated approach is cleaner. The Lambda acts as a simple, secure proxy, translating the GraphQL operation into a standard RESTful API call to the appropriate microservice.

## 3. Service Authentication

-   **Mechanism**: The Lambda resolver receives the end-user's JWT from AppSync. It forwards this token in the `Authorization` header of its request to the internal `user-service` endpoint.
-   **Security**: The internal endpoint is protected within the VPC and can only be accessed by the AppSync Lambda resolver (enforced by security groups). The `user-service` then validates the JWT to authorize the request.