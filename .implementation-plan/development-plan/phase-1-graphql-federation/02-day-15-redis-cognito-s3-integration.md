# Step 2 (Day 15): Redis, Cognito & S3 Integration

**Objective**: Implement the remaining core infrastructure services for caching, authentication, and file storage.

## 1. Redis Caching Service

-   **Goal**: Cache frequently accessed `User` objects to reduce database load.
-   **Implementation**: Create a `UserCacheRepository` that acts as a decorator around the main `UserRepository`.

```typescript
// apps/user-service/src/infrastructure/redis/user-cache.repository.ts
import { Redis } from 'ioredis';

export class UserCacheRepository implements IUserRepository {
    private redisClient: Redis;
    private ttl = 3600; // 1 hour

    constructor(private readonly decoratedRepo: IUserRepository) {
        // ... initialize redisClient
    }

    async findById(id: string): Promise<User | null> {
        const cachedUser = await this.redisClient.get(`user:${id}`);
        if (cachedUser) {
            // Deserialize and return the domain object
            return this.deserialize(cachedUser);
        }

        const user = await this.decoratedRepo.findById(id);
        if (user) {
            // Serialize and cache the user object
            await this.redisClient.set(`user:${id}`, this.serialize(user), 'EX', this.ttl);
        }
        return user;
    }

    // Implement write-through caching for save() and delete() to ensure cache consistency.
    async save(user: User): Promise<void> {
        await this.decoratedRepo.save(user);
        await this.redisClient.set(`user:${user.id}`, this.serialize(user), 'EX', this.ttl);
    }
}
```

## 2. Cognito Authentication Service

-   **Goal**: Create a service that can validate a JWT from Cognito and provide user information.
-   **Implementation**: Use a library like `jwk-to-pem` and `jsonwebtoken` to verify the token signature against Cognito's public JSON Web Key Set (JWKS).

```typescript
// apps/user-service/src/infrastructure/cognito-auth/cognito.service.ts
import { verify } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export class CognitoAuthService {
    private client = jwksClient({
        jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
    });

    async verifyToken(token: string): Promise<any> {
        const decodedToken = // ... decode token to get kid
        const key = await this.client.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();
        
        const payload = verify(token, signingKey);
        return payload; // Contains user claims like sub, email, etc.
    }
}
```

## 3. S3 Service for Profile Pictures

-   **Goal**: Allow users to upload profile pictures.
-   **Implementation**: This will be nearly identical to the `content-service` upload flow:
    1.  An endpoint provides a pre-signed URL for uploading.
    2.  The client uploads the file directly to an S3 bucket (e.g., `edtech-prod-user-avatars`).
    3.  The `UserProfile` value object is updated with the S3 key or the resulting CloudFront URL of the image.

## 4. Email Service

-   **Goal**: Abstract email sending for notifications.
-   **Implementation**: Use AWS SES. Create a simple provider interface.

```typescript
// apps/user-service/src/infrastructure/email/ses.provider.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface IEmailProvider {
    sendWelcomeEmail(to: string, name: string): Promise<void>;
}

export class SesEmailProvider implements IEmailProvider {
    private client = new SESClient({});

    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        const body = `<h1>Welcome, ${name}!</h1><p>Welcome to the platform.</p>`; // Use a template engine here
        
        const command = new SendEmailCommand({
            Source: 'noreply@my-platform.com',
            Destination: { ToAddresses: [to] },
            Message: {
                Subject: { Data: 'Welcome!' },
                Body: { Html: { Data: body } },
            },
        });
        await this.client.send(command);
    }
}
```
This provider will be used by event handlers (e.g., `UserCreatedEventHandler`).
