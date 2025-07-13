# Step 7: Content Service - API

**Objective**: Expose the necessary GraphQL mutations and queries for managing media assets.

## 1. GraphQL Schema (`content.subgraph.graphql`)

```graphql
# content.subgraph.graphql

type Query {
  getAsset(id: ID!): MediaAsset
}

type Mutation {
  # Starts the upload process by getting a pre-signed URL
  requestUploadUrl(input: RequestUploadUrlInput!): RequestUploadUrlPayload! @authenticated
}

type MediaAsset @key(fields: "assetId") {
  assetId: ID!
  fileName: String!
  mimeType: String!
  status: AssetStatus!
  # The cdnUrl is the main field clients will use
  cdnUrl: String
}

enum AssetStatus {
  UPLOADING
  PROCESSING
  READY
  FAILED
}

input RequestUploadUrlInput {
  fileName: String!
  mimeType: String!
  size: Int! # in bytes
}

type RequestUploadUrlPayload {
  assetId: ID!
  # The URL the client will use to PUT the file to S3
  uploadUrl: String!
}
```

## 2. Resolver Implementation

### `requestUploadUrl` Mutation

This resolver triggers the use case that generates the pre-signed URL.

```typescript
// apps/content-service/src/presentation/graphql/asset.resolver.ts
@Resolver()
export class AssetResolver {
    constructor(private readonly requestUploadUrlUseCase: RequestUploadUrlUseCase) {}

    @Mutation()
    @UseGuards(JwtAuthGuard)
    async requestUploadUrl(
        @Args('input') input: RequestUploadUrlInput,
        @Context() ctx: any,
    ): Promise<RequestUploadUrlPayload> {
        const uploaderId = ctx.req.user.id;
        return this.requestUploadUrlUseCase.execute({ ...input, uploaderId });
    }
}
```

### `getAsset` Query

A simple query to fetch the status and URL of an asset by its ID.

```typescript
// ... in AssetResolver
@Query()
async getAsset(@Args('id') id: string): Promise<MediaAsset | null> {
    // The repository can be called directly for simple queries
    return this.assetRepo.findById(id);
}
```
