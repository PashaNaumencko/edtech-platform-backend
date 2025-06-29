# Phase 10: Content Service & Media Management
**Sprint 20 | Duration: 1 week**

## Phase Objectives
Implement a dedicated Content Service for file upload, storage, and media management with S3 integration, content delivery optimization, and media processing capabilities. This service handles all file operations across the platform including course materials, chat attachments, and user-generated content.

## Phase Dependencies
- **Prerequisites**: Phase 1-8 completed (User Service, Learning Service, Communication Service)
- **Requires**: AWS S3 buckets, CDN setup, file processing capabilities
- **Outputs**: Content Service with file upload, storage management, media processing, and CDN delivery

## Detailed Subphases

### 9.1 Content Service Infrastructure Setup
**Duration: 1 day | Priority: Critical**

#### DynamoDB Content Metadata Table
```typescript
interface ContentMetadata {
  contentId: string; // PK
  ownerId: string; // User who uploaded the content
  serviceContext: string; // 'learning', 'communication', 'user-profile'
  contextId: string; // Course ID, Chat Session ID, etc.
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  publicUrl: string;
  cdnUrl: string;
  uploadedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'DELETED';
  tags: string[];
  metadata: {
    width?: number; // For images
    height?: number; // For images
    duration?: number; // For videos/audio
    thumbnailUrl?: string;
    processedVariants?: {
      [key: string]: {
        url: string;
        size: number;
        format: string;
      };
    };
  };
  retentionPolicy: {
    deleteAfter?: string; // ISO date string
    archiveAfter?: string; // Move to cheaper storage
  };
}
```

#### S3 Bucket Configuration
```typescript
// CDK Stack for Content Service
export class ContentServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // Main content bucket
    const contentBucket = new Bucket(this, 'ContentBucket', {
      bucketName: 'edtech-content-storage',
      versioned: true,
      cors: [{
        allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 300,
      }],
      lifecycleRules: [{
        id: 'TransitionToIA',
        status: LifecycleRuleStatus.ENABLED,
        transitions: [{
          storageClass: StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30),
        }, {
          storageClass: StorageClass.GLACIER,
          transitionAfter: Duration.days(90),
        }],
      }],
    });

    // CloudFront distribution for content delivery
    const distribution = new Distribution(this, 'ContentDistribution', {
      defaultBehavior: {
        origin: new S3Origin(contentBucket),
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: ['cdn.edtech-platform.com'],
      certificate: Certificate.fromCertificateArn(this, 'Certificate', 
        'arn:aws:acm:us-east-1:123456789012:certificate/certificate-id'
      ),
    });

    // Lambda for image processing
    const imageProcessor = new Function(this, 'ImageProcessor', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset('lambda/image-processor'),
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        BUCKET_NAME: contentBucket.bucketName,
        CDN_DOMAIN: distribution.distributionDomainName,
      },
    });

    contentBucket.grantReadWrite(imageProcessor);
  }
}
```

### 9.2 File Upload Service Implementation
**Duration: 2 days | Priority: Critical**

#### Presigned URL Generation
```typescript
export class FileUploadService {
  constructor(
    private readonly s3Client: S3Client,
    private readonly contentRepository: ContentRepository,
    private readonly bucketName: string,
    private readonly cdnDomain: string
  ) {}

  async generateUploadUrl(
    ownerId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    context: {
      service: string;
      contextId: string;
      tags?: string[];
    }
  ): Promise<PresignedUploadResult> {
    // Validate file
    this.validateFile(fileName, fileSize, mimeType);

    const contentId = this.generateContentId();
    const s3Key = this.generateS3Key(context.service, context.contextId, contentId, fileName);

    // Create metadata record
    const metadata: ContentMetadata = {
      contentId,
      ownerId,
      serviceContext: context.service,
      contextId: context.contextId,
      fileName: this.sanitizeFileName(fileName),
      originalFileName: fileName,
      fileSize,
      mimeType,
      s3Key,
      s3Bucket: this.bucketName,
      publicUrl: `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`,
      cdnUrl: `https://${this.cdnDomain}/${s3Key}`,
      uploadedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0,
      status: 'UPLOADING',
      tags: context.tags || [],
      metadata: {},
      retentionPolicy: this.getRetentionPolicy(context.service),
    };

    await this.contentRepository.save(metadata);

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: mimeType,
      ContentLength: fileSize,
      Metadata: {
        'content-id': contentId,
        'owner-id': ownerId,
        'service-context': context.service,
        'context-id': context.contextId,
      },
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    return {
      contentId,
      uploadUrl: presignedUrl,
      publicUrl: metadata.publicUrl,
      cdnUrl: metadata.cdnUrl,
      expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
    };
  }

  private validateFile(fileName: string, fileSize: number, mimeType: string): void {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Documents
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Code files
      'text/javascript', 'text/x-python', 'text/x-java-source', 'text/html',
      'text/css', 'application/json', 'text/markdown',
      // Video/Audio
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg',
      // Archives
      'application/zip', 'application/x-tar', 'application/gzip',
    ];

    if (fileSize > maxSize) {
      throw new ValidationError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationError(`File type ${mimeType} is not allowed`);
    }

    // Additional validation for specific file types
    if (mimeType.startsWith('image/') && fileSize > 10 * 1024 * 1024) {
      throw new ValidationError('Image files cannot exceed 10MB');
    }

    if (mimeType.startsWith('video/') && fileSize > 500 * 1024 * 1024) {
      throw new ValidationError('Video files cannot exceed 500MB');
    }
  }

  private generateS3Key(service: string, contextId: string, contentId: string, fileName: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    return `${service}/${year}/${month}/${contextId}/${contentId}.${extension}`;
  }
}
```

### 9.3 Media Processing Pipeline
**Duration: 2 days | Priority: High**

#### Image Processing Lambda
```typescript
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export class ImageProcessor {
  private readonly s3Client: S3Client;
  
  constructor() {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION });
  }

  async processImage(event: S3Event): Promise<void> {
    for (const record of event.Records) {
      if (record.eventName.startsWith('ObjectCreated')) {
        await this.handleImageUpload(record.s3.bucket.name, record.s3.object.key);
      }
    }
  }

  private async handleImageUpload(bucketName: string, objectKey: string): Promise<void> {
    // Skip if already a processed variant
    if (objectKey.includes('/processed/')) {
      return;
    }

    // Get original image
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await this.s3Client.send(getCommand);
    const imageBuffer = await this.streamToBuffer(response.Body);

    // Create multiple sizes
    const variants = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'small', width: 400, height: 300 },
      { name: 'medium', width: 800, height: 600 },
      { name: 'large', width: 1200, height: 900 },
    ];

    const processedVariants: { [key: string]: any } = {};

    for (const variant of variants) {
      const processed = await sharp(imageBuffer)
        .resize(variant.width, variant.height, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const variantKey = this.getVariantKey(objectKey, variant.name);
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: variantKey,
        Body: processed,
        ContentType: 'image/jpeg',
        CacheControl: 'max-age=31536000', // 1 year
      }));

      processedVariants[variant.name] = {
        url: `https://${bucketName}.s3.amazonaws.com/${variantKey}`,
        size: processed.length,
        format: 'jpeg',
        dimensions: { width: variant.width, height: variant.height },
      };
    }

    // Update metadata with processed variants
    await this.updateContentMetadata(objectKey, processedVariants);
  }

  private getVariantKey(originalKey: string, variantName: string): string {
    const parts = originalKey.split('/');
    const fileName = parts.pop();
    const nameWithoutExt = fileName?.split('.')[0];
    return `${parts.join('/')}/processed/${nameWithoutExt}_${variantName}.jpg`;
  }
}
```

#### Video Processing Pipeline
```typescript
export class VideoProcessor {
  async processVideo(bucketName: string, objectKey: string): Promise<void> {
    // Generate thumbnail from video
    const thumbnailCommand = new EcsRunTaskCommand({
      cluster: 'video-processing-cluster',
      taskDefinition: 'ffmpeg-thumbnail-generator',
      launchType: 'FARGATE',
      overrides: {
        containerOverrides: [{
          name: 'ffmpeg-container',
          environment: [
            { name: 'INPUT_BUCKET', value: bucketName },
            { name: 'INPUT_KEY', value: objectKey },
            { name: 'OUTPUT_BUCKET', value: bucketName },
            { name: 'OUTPUT_KEY', value: this.getThumbnailKey(objectKey) },
          ],
        }],
      },
    });

    // Generate multiple quality versions
    const qualities = [
      { name: '720p', resolution: '1280x720', bitrate: '2500k' },
      { name: '480p', resolution: '854x480', bitrate: '1500k' },
      { name: '360p', resolution: '640x360', bitrate: '800k' },
    ];

    for (const quality of qualities) {
      await this.generateVideoVariant(bucketName, objectKey, quality);
    }
  }
}
```

### 9.4 Content Delivery & Access Control
**Duration: 1 day | Priority: High**

#### Content Access Service
```typescript
export class ContentAccessService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly userService: UserService
  ) {}

  async getContent(contentId: string, userId: string): Promise<ContentAccessResult> {
    const content = await this.contentRepository.findById(contentId);
    
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check access permissions
    const hasAccess = await this.checkAccess(content, userId);
    
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to this content');
    }

    // Update access tracking
    await this.trackAccess(content, userId);

    return {
      contentId: content.contentId,
      fileName: content.fileName,
      mimeType: content.mimeType,
      fileSize: content.fileSize,
      cdnUrl: content.cdnUrl,
      variants: content.metadata.processedVariants,
      thumbnailUrl: content.metadata.thumbnailUrl,
      duration: content.metadata.duration,
    };
  }

  private async checkAccess(content: ContentMetadata, userId: string): Promise<boolean> {
    // Owner always has access
    if (content.ownerId === userId) {
      return true;
    }

    // Context-based access control
    switch (content.serviceContext) {
      case 'learning':
        return this.checkLearningAccess(content.contextId, userId);
      case 'communication':
        return this.checkCommunicationAccess(content.contextId, userId);
      case 'user-profile':
        return content.ownerId === userId; // Only owner can access profile content
      default:
        return false;
    }
  }

  private async checkLearningAccess(courseId: string, userId: string): Promise<boolean> {
    // Check if user is enrolled in the course or is the tutor
    const enrollment = await this.learningService.getEnrollment(courseId, userId);
    return enrollment !== null;
  }

  private async checkCommunicationAccess(sessionId: string, userId: string): Promise<boolean> {
    // Check if user is participant in the chat session
    const session = await this.communicationService.getSession(sessionId);
    return session.participants.includes(userId);
  }

  private async trackAccess(content: ContentMetadata, userId: string): Promise<void> {
    // Update access count and last accessed time
    await this.contentRepository.update(content.contentId, {
      lastAccessedAt: new Date().toISOString(),
      accessCount: content.accessCount + 1,
    });

    // Log access for analytics
    await this.analyticsService.trackEvent({
      event: 'content_accessed',
      userId,
      contentId: content.contentId,
      serviceContext: content.serviceContext,
      mimeType: content.mimeType,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 9.5 Content Management APIs
**Duration: 1 day | Priority: High**

#### REST API Controllers
```typescript
@Controller('content')
@UseGuards(AuthGuard)
export class ContentController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly contentAccessService: ContentAccessService,
    private readonly contentManagementService: ContentManagementService
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Generate presigned URL for file upload' })
  async generateUploadUrl(
    @Body() request: GenerateUploadUrlRequest,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<PresignedUploadResult> {
    return this.fileUploadService.generateUploadUrl(
      user.id,
      request.fileName,
      request.fileSize,
      request.mimeType,
      {
        service: request.serviceContext,
        contextId: request.contextId,
        tags: request.tags,
      }
    );
  }

  @Get(':contentId')
  @ApiOperation({ summary: 'Get content metadata and access URL' })
  async getContent(
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<ContentAccessResult> {
    return this.contentAccessService.getContent(contentId, user.id);
  }

  @Delete(':contentId')
  @ApiOperation({ summary: 'Delete content' })
  async deleteContent(
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<void> {
    await this.contentManagementService.deleteContent(contentId, user.id);
  }

  @Post(':contentId/share')
  @ApiOperation({ summary: 'Generate shareable link for content' })
  async shareContent(
    @Param('contentId') contentId: string,
    @Body() request: ShareContentRequest,
    @CurrentUser() user: AuthenticatedUser
  ): Promise<ShareableLink> {
    return this.contentManagementService.createShareableLink(
      contentId,
      user.id,
      request.expiresIn,
      request.permissions
    );
  }

  @Get('context/:serviceContext/:contextId')
  @ApiOperation({ summary: 'List content by context' })
  async listContentByContext(
    @Param('serviceContext') serviceContext: string,
    @Param('contextId') contextId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContentQuery
  ): Promise<PaginatedContentList> {
    return this.contentManagementService.listContentByContext(
      serviceContext,
      contextId,
      user.id,
      query
    );
  }
}
```

## Success Criteria

### Technical Acceptance Criteria
- [ ] Content Service deploys successfully to ECS
- [ ] DynamoDB content metadata table created
- [ ] S3 buckets configured with proper permissions
- [ ] CloudFront distribution set up for content delivery
- [ ] File upload with presigned URLs working
- [ ] Image processing pipeline functional
- [ ] Video thumbnail generation working
- [ ] Access control system enforcing permissions
- [ ] Content deletion and cleanup working

### Functional Acceptance Criteria
- [ ] Users can upload files through the API
- [ ] Images are automatically processed into multiple sizes
- [ ] Videos generate thumbnails automatically
- [ ] Content is delivered via CDN for optimal performance
- [ ] Access control prevents unauthorized access
- [ ] File metadata is properly tracked
- [ ] Content can be shared with time-limited links
- [ ] Old content is archived according to retention policies

### Performance Criteria
- [ ] File upload presigned URL generation: < 500ms
- [ ] Content access URL generation: < 200ms
- [ ] Image processing completes within 30 seconds
- [ ] CDN cache hit ratio > 85%
- [ ] Content delivery via CDN < 2 seconds globally

## Risk Mitigation

### Technical Risks
- **Storage Costs**: Implement lifecycle policies and compression
- **Processing Delays**: Use SQS for reliable async processing
- **CDN Propagation**: Use cache invalidation strategies

### Business Risks
- **Content Moderation**: Implement content scanning and flagging
- **Copyright Issues**: Clear content ownership and licensing
- **Data Privacy**: Ensure content encryption and access controls

## Key Performance Indicators

### Performance Metrics
- File upload success rate: > 99%
- Image processing success rate: > 95%
- CDN cache hit ratio: > 85%
- Average content delivery time: < 2 seconds

### Business Metrics
- Total content storage usage
- Content access patterns
- Most popular content types
- Content retention and deletion rates

## Integration Points

### Service Dependencies
- **User Service**: User authentication and authorization
- **Learning Service**: Course content associations
- **Communication Service**: Chat attachments and media
- **Analytics Service**: Content usage tracking

### External Dependencies
- **AWS S3**: Primary storage backend
- **AWS CloudFront**: Content delivery network
- **AWS Lambda**: Image and video processing
- **Sharp**: Image processing library
- **FFmpeg**: Video processing (via ECS tasks)

---

**Previous Phase**: [Phase 8: Communication Service](phase-8-communication-service.md)  
**Next Phase**: [Phase 10: Notification Service](phase-10-notification-service.md) 