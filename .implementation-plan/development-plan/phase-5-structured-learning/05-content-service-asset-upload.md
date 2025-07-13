# Step 5: Content Service - Asset Upload

**Objective**: Implement a secure and robust file upload mechanism using S3 pre-signed URLs.

This approach avoids proxying file uploads through our service, improving performance and scalability.

## Upload Flow

1.  **Client Request**: The client sends a GraphQL mutation (`requestUploadUrl`) with file metadata (name, type, size).
2.  **`RequestUploadUrl` Use Case**:
    a.  Creates a `MediaAsset` record in the database with `UPLOADING` status.
    b.  Generates a unique S3 key for the file (e.g., `uploads/<assetId>/<fileName>`).
    c.  Uses the AWS S3 SDK to generate a **pre-signed PUT URL** for that key.
    d.  Returns the `assetId` and the `preSignedUrl` to the client.
3.  **Client Upload**: The client uses the received URL to upload the file directly to S3 via an HTTP PUT request.
4.  **S3 Event Notification**: The S3 bucket is configured to send an event (e.g., to an SQS queue or a Lambda function) upon successful object creation (`s3:ObjectCreated:*`).
5.  **`FinalizeUpload` Use Case**:
    a.  The event handler (e.g., Lambda) receives the S3 event containing the bucket and key.
    b.  It parses the `assetId` from the S3 key.
    c.  It fetches the `MediaAsset` from the database.
    d.  It calls the `markAsProcessing()` method on the aggregate and saves it.
    e.  It triggers the next step (e.g., virus scan or video transcoding) by publishing an `AssetUploaded` event.

## `RequestUploadUrl` Use Case

```typescript
// apps/content-service/src/application/use-cases/request-upload-url.use-case.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class RequestUploadUrlUseCase {
    constructor(private readonly assetRepo: IMediaAssetRepository) {}

    async execute(command: { uploaderId, fileName, mimeType, size }): Promise<{ assetId: string, uploadUrl: string }> {
        // 1. Create the MediaAsset record
        const asset = MediaAsset.create(command);
        await this.assetRepo.save(asset);

        // 2. Generate S3 key and pre-signed URL
        const s3Key = `uploads/${asset.assetId}/${asset.fileName}`;
        const s3Client = new S3Client({});
        const putCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            ContentType: command.mimeType,
        });

        const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 }); // 1 hour expiry

        return { assetId: asset.assetId, uploadUrl };
    }
}
```
