import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface S3Config {
  region: string;
  bucketName: string;
  endpoint?: string;
}

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly config: S3Config;

  constructor(private readonly configService: ConfigService) {
    const s3Config = this.configService.get("s3");
    this.config = {
      region: s3Config.region,
      bucketName: s3Config.bucketName,
      endpoint:
        this.configService.get("app.environment") === "development"
          ? this.configService.get("aws.endpoint")
          : undefined,
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      ...(this.config.endpoint && {
        endpoint: this.config.endpoint,
        forcePathStyle: true,
      }),
    });
  }

  /**
   * Generate presigned URL for file upload
   */
  async generateUploadUrl(key: string, options: UploadOptions = {}): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      this.logger.log(`Upload URL generated for: ${key}`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate upload URL for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for file download
   */
  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      this.logger.log(`Download URL generated for: ${key}`);
      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate download URL for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Upload file directly to S3
   */
  async uploadFile(
    key: string,
    fileBuffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await this.s3Client.send(command);

      const url = this.getFileUrl(key);
      this.logger.log(`File uploaded: ${key}`);

      return {
        key,
        url,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      return false;
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucketName}/${key}`;
    }
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Get file extension from content type
   */
  getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };
    return extensions[contentType] || "bin";
  }
}
