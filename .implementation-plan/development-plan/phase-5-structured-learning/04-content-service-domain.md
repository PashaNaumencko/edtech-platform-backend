# Step 4: Content Service - Domain Layer

**Objective**: Model media assets to handle file uploads, storage, and delivery.

## 1. `MediaAsset` Aggregate

This aggregate represents a single file (video, PDF, image) uploaded to the platform.

### `AssetStatus` Enum

```typescript
// apps/content-service/src/domain/asset-status.enum.ts
export enum AssetStatus {
    UPLOADING = "UPLOADING",   // Client is uploading to S3
    PROCESSING = "PROCESSING", // File is being scanned or transcoded
    READY = "READY",           // File is available for consumption
    FAILED = "FAILED",         // An error occurred
}
```

### `MediaAsset` Class Definition

```typescript
// apps/content-service/src/domain/media-asset.aggregate.ts
import { AssetStatus } from './asset-status.enum';

export class MediaAsset {
    private constructor(
        public readonly assetId: string,
        public readonly uploaderId: string,
        public readonly fileName: string,
        public readonly mimeType: string,
        public readonly size: number, // in bytes
        public status: AssetStatus,
        public s3Key?: string,
        public cdnUrl?: string,
    ) {}

    public static create(input: {
        uploaderId: string;
        fileName: string;
        mimeType: string;
        size: number;
    }): MediaAsset {
        const id = '...'; // uuidv4()
        return new MediaAsset(id, input.uploaderId, input.fileName, input.mimeType, input.size, AssetStatus.UPLOADING);
    }

    public markAsProcessing(s3Key: string): void {
        this.status = AssetStatus.PROCESSING;
        this.s3Key = s3Key;
    }

    public markAsReady(cdnUrl: string): void {
        this.status = AssetStatus.READY;
        this.cdnUrl = cdnUrl;
        // Publish AssetReady event
    }

    public markAsFailed(): void {
        this.status = AssetStatus.FAILED;
    }
}
```

## 2. Repository Interface

```typescript
// apps/content-service/src/domain/media-asset.repository.ts
import { MediaAsset } from './media-asset.aggregate';

export interface IMediaAssetRepository {
    findById(assetId: string): Promise<MediaAsset | null>;
    save(asset: MediaAsset): Promise<void>;
}
```
