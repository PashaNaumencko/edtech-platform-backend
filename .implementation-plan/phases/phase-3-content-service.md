# Phase 3: Content Service (S3 & Media Management)
**Duration: 10 days | Priority: High**

## Phase Overview

This phase implements the Content Service for file storage, media processing, and CDN distribution. It follows our standardized microservice architecture with DDD + Clean Architecture + Use Case Pattern.

### Dependencies
- **Prerequisites**: Phase 1 (User Service) completed
- **Integrates with**: Learning Service (Phase 2) for course materials
- **Provides**: File storage, media processing, CDN for all services

## Subphase 3.1: Content Service Implementation (7 days)

### Domain Layer Implementation (1 day)

#### Entities (AggregateRoot)
```typescript
// domain/entities/file.entity.ts
import { AggregateRoot } from '@nestjs/cqrs';

export class File extends AggregateRoot {
  constructor(
    private readonly _id: FileId,
    private readonly _uploadedBy: UserId,
    private _originalName: string,
    private _mimeType: MimeType,
    private _size: number,
    private _s3Key: string,
    private _cdnUrl?: string,
    private readonly _uploadedAt: Date = new Date(),
  ) {
    super();
  }

  static create(data: CreateFileData): File {
    const file = new File(
      FileId.generate(),
      new UserId(data.uploadedBy),
      data.originalName,
      new MimeType(data.mimeType),
      data.size,
      data.s3Key,
    );

    file.apply(new FileUploadedEvent(file));
    return file;
  }

  processMedia(cdnUrl: string): void {
    this._cdnUrl = cdnUrl;
    this.apply(new MediaProcessedEvent(this));
  }

  // Getters
  get id(): FileId { return this._id; }
  get uploadedBy(): UserId { return this._uploadedBy; }
  get originalName(): string { return this._originalName; }
  get mimeType(): MimeType { return this._mimeType; }
  get size(): number { return this._size; }
  get s3Key(): string { return this._s3Key; }
  get cdnUrl(): string | undefined { return this._cdnUrl; }
  get uploadedAt(): Date { return this._uploadedAt; }
}
```

#### Value Objects
```typescript
// domain/value-objects/mime-type.vo.ts
export class MimeType {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new InvalidMimeTypeException();
    }
  }

  private isValid(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/avi', 'video/quicktime',
      'application/pdf', 'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return allowedTypes.includes(mimeType);
  }

  getValue(): string { return this.value; }
  isImage(): boolean { return this.value.startsWith('image/'); }
  isVideo(): boolean { return this.value.startsWith('video/'); }
  isDocument(): boolean { return this.value.startsWith('application/') || this.value.startsWith('text/'); }
}
```

### Application Layer Implementation (2 days)

#### Use Cases
```typescript
// application/use-cases/upload-file/upload-file.usecase.ts
@Injectable()
export class UploadFileUseCase implements IUseCase<UploadFileRequest, UploadFileResponse> {
  constructor(
    private fileRepository: FileRepository,
    private s3Service: S3Service,
    private virusScanService: VirusScanService,
  ) {}

  async execute(request: UploadFileRequest): Promise<UploadFileResponse> {
    // 1. Validate file
    if (request.file.size > 100 * 1024 * 1024) { // 100MB limit
      throw new FileTooLargeException();
    }

    // 2. Virus scan
    await this.virusScanService.scan(request.file.buffer);

    // 3. Generate S3 key
    const s3Key = this.generateS3Key(request.uploadedBy, request.file.originalname);

    // 4. Upload to S3
    const uploadResult = await this.s3Service.uploadFile(s3Key, request.file);

    // 5. Create file entity
    const file = File.create({
      uploadedBy: request.uploadedBy,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      s3Key,
    });

    // 6. Persist
    const savedFile = await this.fileRepository.save(file);

    // 7. Commit events
    savedFile.commit();

    return UploadFileResponse.fromDomain(savedFile);
  }

  private generateS3Key(userId: string, filename: string): string {
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    return `users/${userId}/${timestamp}-${randomUUID()}.${extension}`;
  }
}

// application/use-cases/process-media/process-media.usecase.ts
@Injectable()
export class ProcessMediaUseCase implements IUseCase<ProcessMediaRequest, ProcessMediaResponse> {
  constructor(
    private fileRepository: FileRepository,
    private mediaProcessor: MediaProcessorService,
    private cdnService: CDNService,
  ) {}

  async execute(request: ProcessMediaRequest): Promise<ProcessMediaResponse> {
    // 1. Get file
    const file = await this.fileRepository.findById(request.fileId);
    if (!file) {
      throw new FileNotFoundException();
    }

    // 2. Process based on type
    let processedUrl: string;
    
    if (file.mimeType.isImage()) {
      processedUrl = await this.mediaProcessor.optimizeImage(file.s3Key);
    } else if (file.mimeType.isVideo()) {
      processedUrl = await this.mediaProcessor.transcodeVideo(file.s3Key);
    } else {
      processedUrl = await this.cdnService.getDistributionUrl(file.s3Key);
    }

    // 3. Update file with CDN URL
    file.processMedia(processedUrl);

    // 4. Persist
    const updatedFile = await this.fileRepository.save(file);

    // 5. Commit events
    updatedFile.commit();

    return ProcessMediaResponse.fromDomain(updatedFile);
  }
}
```

### Infrastructure Layer Implementation (3 days)

#### S3 Integration
```typescript
// infrastructure/s3/services/file-storage.service.ts
@Injectable()
export class S3FileStorageService {
  constructor(
    @Inject('S3_CLIENT') private s3Client: S3Client,
    private configService: ConfigService,
  ) {}

  async uploadFile(key: string, file: Express.Multer.File): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3Client.send(command);
    return `https://${this.configService.get('AWS_S3_BUCKET')}.s3.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
```

#### Media Processing
```typescript
// infrastructure/media/services/media-processor.service.ts
@Injectable()
export class MediaProcessorService {
  constructor(
    @Inject('MEDIACONVERT_CLIENT') private mediaConvert: MediaConvertClient,
    private configService: ConfigService,
  ) {}

  async optimizeImage(s3Key: string): Promise<string> {
    // Image optimization logic using Sharp or AWS services
    const optimizedKey = s3Key.replace(/\.[^/.]+$/, '-optimized.webp');
    
    // Implementation for image optimization
    // This would typically involve:
    // 1. Download from S3
    // 2. Process with Sharp
    // 3. Upload optimized version
    // 4. Return CDN URL
    
    return `https://cdn.example.com/${optimizedKey}`;
  }

  async transcodeVideo(s3Key: string): Promise<string> {
    const jobSettings = {
      Role: this.configService.get('MEDIACONVERT_ROLE_ARN'),
      Settings: {
        Inputs: [{
          FileInput: `s3://${this.configService.get('AWS_S3_BUCKET')}/${s3Key}`,
        }],
        OutputGroups: [{
          Name: 'File Group',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${this.configService.get('AWS_S3_BUCKET')}/processed/`,
            },
          },
          Outputs: [{
            VideoDescription: {
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                },
              },
            },
            AudioDescriptions: [{
              CodecSettings: {
                Codec: 'AAC',
              },
            }],
            ContainerSettings: {
              Container: 'MP4',
            },
          }],
        }],
      },
    };

    const command = new CreateJobCommand(jobSettings);
    const response = await this.mediaConvert.send(command);
    
    // Return the processed file URL (would be determined after job completion)
    return `https://cdn.example.com/processed/${s3Key}`;
  }

  async generateThumbnail(s3Key: string): Promise<string> {
    // Thumbnail generation logic
    const thumbnailKey = s3Key.replace(/\.[^/.]+$/, '-thumb.jpg');
    
    // Implementation for thumbnail generation
    
    return `https://cdn.example.com/${thumbnailKey}`;
  }
}
```

#### CDN Integration
```typescript
// infrastructure/cdn/services/cloudfront.service.ts
@Injectable()
export class CloudFrontService {
  constructor(
    @Inject('CLOUDFRONT_CLIENT') private cloudFront: CloudFrontClient,
    private configService: ConfigService,
  ) {}

  getDistributionUrl(s3Key: string): string {
    const distributionDomain = this.configService.get('CLOUDFRONT_DISTRIBUTION_DOMAIN');
    return `https://${distributionDomain}/${s3Key}`;
  }

  async invalidateCache(paths: string[]): Promise<void> {
    const command = new CreateInvalidationCommand({
      DistributionId: this.configService.get('CLOUDFRONT_DISTRIBUTION_ID'),
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
        CallerReference: Date.now().toString(),
      },
    });

    await this.cloudFront.send(command);
  }

  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    const policy = {
      Statement: [{
        Resource: `https://${this.configService.get('CLOUDFRONT_DISTRIBUTION_DOMAIN')}/${s3Key}`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor((Date.now() + expiresIn * 1000) / 1000),
          },
        },
      }],
    };

    return getSignedUrl({
      url: this.getDistributionUrl(s3Key),
      policy: JSON.stringify(policy),
      privateKey: this.configService.get('CLOUDFRONT_PRIVATE_KEY'),
      keyPairId: this.configService.get('CLOUDFRONT_KEY_PAIR_ID'),
    });
  }
}
```

### Presentation Layer Implementation (1 day)

#### Internal HTTP Controllers
```typescript
// presentation/http/controllers/internal/files.internal.controller.ts
@Controller('internal/files')
@UseGuards(ServiceAuthGuard)
export class InternalFilesController {
  constructor(
    private uploadFileUseCase: UploadFileUseCase,
    private processMediaUseCase: ProcessMediaUseCase,
    private getFileUseCase: GetFileUseCase,
    private deleteFileUseCase: DeleteFileUseCase,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<FileDto> {
    const request = new UploadFileRequest();
    request.file = file;
    request.uploadedBy = dto.uploadedBy;
    request.context = dto.context; // 'course', 'profile', etc.
    
    const response = await this.uploadFileUseCase.execute(request);
    return response.file;
  }

  @Get(':id')
  async getFile(@Param('id') id: string): Promise<FileDto> {
    const request = new GetFileRequest();
    request.id = id;
    
    const response = await this.getFileUseCase.execute(request);
    return response.file;
  }

  @Get(':id/signed-url')
  async getSignedUrl(@Param('id') id: string): Promise<{ url: string }> {
    const request = new GetSignedUrlRequest();
    request.id = id;
    
    const response = await this.getSignedUrlUseCase.execute(request);
    return { url: response.signedUrl };
  }

  @Post(':id/process')
  async processMedia(@Param('id') id: string): Promise<FileDto> {
    const request = new ProcessMediaRequest();
    request.fileId = id;
    
    const response = await this.processMediaUseCase.execute(request);
    return response.file;
  }

  @Delete(':id')
  async deleteFile(@Param('id') id: string): Promise<void> {
    const request = new DeleteFileRequest();
    request.id = id;
    
    await this.deleteFileUseCase.execute(request);
  }
}
```

#### GraphQL Subgraph Schema
```graphql
# presentation/graphql/schemas/content.subgraph.graphql
extend type Query {
  file(id: ID!): File
  files(uploadedBy: ID!, context: String): [File!]!
}

extend type Mutation {
  uploadFile(input: UploadFileInput!): File! @auth(requires: USER)
  processMedia(id: ID!): File! @auth(requires: USER)
  deleteFile(id: ID!): Boolean! @auth(requires: USER)
}

type File @key(fields: "id") {
  id: ID!
  uploadedBy: ID!
  originalName: String!
  mimeType: String!
  size: Int!
  cdnUrl: String
  isProcessed: Boolean!
  uploadedAt: AWSDateTime!
  uploader: User @provides(fields: "uploadedBy")
}

# Federation relationships
extend type Course @key(fields: "id") {
  id: ID! @external
  materials: [File!]! @requires(fields: "id")
}

extend type Lesson @key(fields: "id") {
  id: ID! @external
  attachments: [File!]! @requires(fields: "id")
}

extend type User @key(fields: "id") {
  id: ID! @external
  uploadedFiles: [File!]! @requires(fields: "id")
}

input UploadFileInput {
  file: Upload!
  context: String! # 'course', 'lesson', 'profile', etc.
}
```

## Subphase 3.2: Integration & CDN Setup (3 days)

### CDN Configuration (2 days)
- CloudFront setup for global distribution
- Cache optimization and invalidation strategies
- Security configurations and access controls

### Service Integration (1 day)
- Integration with Learning Service for course materials
- Integration with User Service for profile images
- Lambda resolvers for media queries

## Success Criteria

### Technical Acceptance Criteria
- ✅ File upload API working with virus scanning
- ✅ S3 storage integration functional
- ✅ Media processing pipeline operational
- ✅ CDN distribution working globally
- ✅ Signed URL generation for secure access
- ✅ Content subgraph schema validates

### Functional Acceptance Criteria
- ✅ Users can upload files up to 100MB
- ✅ Images are automatically optimized
- ✅ Videos are transcoded for web delivery
- ✅ Files are delivered via CDN
- ✅ Secure access via signed URLs
- ✅ File deletion removes from S3 and CDN

### Performance Criteria
- ✅ File upload processing < 5 seconds for images
- ✅ CDN cache hit ratio > 90%
- ✅ Global content delivery < 200ms latency
- ✅ Video transcoding completes within 2x video length

## Dependencies & Integration
- **User Service**: File ownership and access control
- **Learning Service**: Course materials and lesson attachments
- **All Services**: Profile images, document storage
- **CDN**: Global content delivery and caching

This service provides the foundation for all file and media management across the platform! 