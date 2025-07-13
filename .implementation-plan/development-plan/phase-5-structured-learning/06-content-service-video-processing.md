# Step 6: Content Service - Video Processing

**Objective**: Automatically transcode uploaded videos into web-friendly formats (e.g., HLS for adaptive streaming).

This entire flow is a classic example of using **"Event-Driven Worker" Lambdas** to orchestrate a multi-step asynchronous pipeline.

## Video Processing Flow (Lambda-Orchestrated)

1.  **`AssetUploaded` Event**: The `FinalizeUpload` use case publishes this event after a file is successfully uploaded to the raw uploads bucket.
2.  **EventBridge Rule**: A rule filters for events where the `mimeType` is a video format (e.g., `video/mp4`, `video/quicktime`).
3.  **Trigger Lambda 1 (Start Transcoding)**: The rule's target is a "start transcoding" Lambda function.
    -   **Job**: Receives the S3 event, constructs a job for AWS MediaConvert, calls the MediaConvert API to start the job, and updates the `MediaAsset` status to `PROCESSING`.
4.  **MediaConvert Completion Event**: MediaConvert is configured to send an event to EventBridge when the job is `COMPLETE` or `ERROR`.
5.  **Trigger Lambda 2 (Finalize Processing)**: A separate Lambda is triggered by the MediaConvert completion event.
    -   **Job**: If the job succeeded, it updates the `MediaAsset` status to `READY` and saves the public CDN URL for the video. If it failed, it updates the status to `FAILED`.

### Implementation Sketch - Start Transcoding Lambda

```typescript
// apps/content-service/src/infrastructure/lambda/start-transcoding.handler.ts
import { MediaConvertClient, CreateJobCommand } from "@aws-sdk/client-mediaconvert";
// Assume a repository is available to update the asset status
import { assetRepository } from './repository';

export async function handler(event: any) {
    const sourceS3Key = event.detail.s3Key;
    const assetId = event.detail.assetId;

    // 1. Update asset status to PROCESSING
    await assetRepository.updateStatus(assetId, 'PROCESSING');

    // 2. Start the MediaConvert job
    const mediaConvertClient = new MediaConvertClient({ endpoint: process.env.MEDIA_CONVERT_ENDPOINT });
    const jobSettings = { /* ... complex MediaConvert job settings ... */ };
    const command = new CreateJobCommand({
        Role: process.env.MEDIA_CONVERT_ROLE_ARN,
        Settings: jobSettings,
    });
    await mediaConvertClient.send(command);
}
```
This serverless pipeline is robust, scalable, and cost-effective, as compute resources are only used when a video is actually being processed.