# Step 5: Notification Service - API

**Objective**: Provide a minimal GraphQL API for users to manage their notifications.

While most of the service is backend-only, users need a way to view their notification history and manage settings (though preferences are managed in `user-service`).

## 1. GraphQL Schema (`notification.subgraph.graphql`)

```graphql
# notification.subgraph.graphql

type Query {
  myNotifications(first: Int = 20, after: String): NotificationConnection! @authenticated
}

type Mutation {
  markNotificationsAsRead(notificationIds: [ID!]!): [Notification!]! @authenticated
}

type NotificationConnection {
  edges: [NotificationEdge!]!
  pageInfo: PageInfo!
}

type NotificationEdge {
  cursor: String!
  node: Notification!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Notification {
  notificationId: ID!
  type: NotificationType!
  content: String!
  isRead: Boolean!
  createdAt: AWSDateTime!
}

enum NotificationType {
  SESSION_CONFIRMED
  SESSION_REMINDER_24H
  PAYMENT_RECEIPT
  # ... other types
}
```

## 2. Resolver Implementation

The resolvers will interact with the `Notification` repository (e.g., a DynamoDB table).

```typescript
// apps/notification-service/src/presentation/graphql/notification.resolver.ts

@Resolver('Notification')
export class NotificationResolver {
    constructor(private readonly notificationRepo: INotificationRepository) {}

    @Query()
    @UseGuards(JwtAuthGuard)
    async myNotifications(@Context() ctx: any, @Args() args: any): Promise<NotificationConnection> {
        const userId = ctx.req.user.id;
        // Logic to fetch paginated notifications for the user from the database
        return this.notificationRepo.findByUserId(userId, {
            limit: args.first,
            cursor: args.after,
        });
    }

    @Mutation()
    @UseGuards(JwtAuthGuard)
    async markNotificationsAsRead(@Args('notificationIds') ids: string[], @Context() ctx: any): Promise<Notification[]> {
        const userId = ctx.req.user.id;
        // Logic to update the `isRead` status for the given notifications,
        // ensuring they belong to the authenticated user.
        return this.notificationRepo.markAsRead(ids, userId);
    }
}
```
