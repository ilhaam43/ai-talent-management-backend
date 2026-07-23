import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

// Whitelist of allowed file extensions per document folder
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  cv: ['.pdf', '.docx', '.doc'],
  ijazah: ['.pdf'],
  ktp: ['.pdf', '.jpg', '.jpeg', '.png'],
  transcript: ['.pdf'],
  photos: ['.jpg', '.jpeg', '.png', '.webp'],
  'talent-pool': ['.pdf'],
  'assessment-results': ['.pdf'],
  certificate: ['.pdf', '.jpg', '.jpeg', '.png'],
  portfolio: ['.pdf', '.jpg', '.jpeg', '.png'],
  additional: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  other: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
};

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  /** Used for server-to-MinIO operations (upload, download, HEAD, delete) */
  private internalClient!: S3Client;

  /** Used ONLY for signing presigned URLs (browser-facing endpoint) */
  private externalClient!: S3Client;

  private readonly documentsBucket: string;
  private readonly avatarsBucket: string;
  private readonly externalEndpoint: string;

  constructor(private configService: ConfigService) {
    this.documentsBucket = this.configService.get<string>('MINIO_BUCKET_NAME') || 'ai-talent-documents';
    this.avatarsBucket = this.configService.get<string>('MINIO_AVATARS_BUCKET') || 'ai-talent-avatars';
    this.externalEndpoint = this.configService.get<string>('MINIO_EXTERNAL_ENDPOINT') || 'http://localhost:9000';
  }

  onModuleInit() {
    const internalEndpoint = this.configService.get<string>('MINIO_INTERNAL_ENDPOINT') || 'http://localhost:9000';
    const externalEndpoint = this.externalEndpoint;

    const credentials = {
      accessKeyId: this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretAccessKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    };

    const commonConfig = {
      region: 'us-east-1', // MinIO ignores this but AWS SDK requires a value
      credentials,
      forcePathStyle: true, // REQUIRED for MinIO — uses path-style URLs, not virtual-hosted
    };

    this.internalClient = new S3Client({
      ...commonConfig,
      endpoint: internalEndpoint,
    });

    this.externalClient = new S3Client({
      ...commonConfig,
      endpoint: externalEndpoint,
    });

    this.logger.log(`StorageService initialized — internal: ${internalEndpoint}, external: ${externalEndpoint}`);
    this.logger.log(`Buckets — documents: ${this.documentsBucket}, avatars: ${this.avatarsBucket}`);
  }

  // ============================================
  // Key Generation
  // ============================================

  /**
   * Build a collision-safe, predictable object key.
   * Example: "cv/candidate-uuid/a1b2c3d4.pdf"
   */
  buildKey(folder: string, ownerId: string, filename: string): string {
    const ext = this.sanitizeExtension(filename);
    return `${folder}/${ownerId}/${randomUUID()}${ext}`;
  }

  /**
   * Build key for avatar photos.
   * Example: "user-uuid.jpg" (flat, no folders — avatars are public)
   */
  buildAvatarKey(ownerId: string, filename: string): string {
    const ext = this.sanitizeExtension(filename);
    return `${ownerId}${ext}`;
  }

  /**
   * Get public URL for an avatar (no presigning needed — bucket is public-read).
   */
  getAvatarPublicUrl(key: string): string {
    return `${this.externalEndpoint}/${this.avatarsBucket}/${key}`;
  }

  // ============================================
  // Presigned URLs (use externalClient — browser-facing)
  // ============================================

  /**
   * Generate a presigned PUT URL for browser-direct upload.
   * @param key Object key in MinIO
   * @param contentType MIME type to enforce
   * @param expiresIn Seconds until URL expires (default 900 = 15 min)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 900,
    bucket?: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket || this.documentsBucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.externalClient, command, { expiresIn });
  }

  /**
   * Generate a presigned GET URL for browser download.
   * @param key Object key in MinIO
   * @param expiresIn Seconds until URL expires (default 300 = 5 min)
   * @param bucket Optional bucket name overrides default documents bucket
   * @param useInternal If true, uses the internal S3 client for Docker network resolution
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn = 300,
    bucket?: string,
    useInternal = false,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket || this.documentsBucket,
      Key: key,
    });
    const client = useInternal ? this.internalClient : this.externalClient;
    return getSignedUrl(client, command, { expiresIn });
  }

  // ============================================
  // Server-side Operations (use internalClient — backend-to-MinIO)
  // ============================================

  /**
   * Upload a Buffer to MinIO. Used for server-side uploads
   * (talent pool bulk, n8n callback, multer-to-MinIO relay).
   */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    bucket?: string,
  ): Promise<void> {
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: bucket || this.documentsBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded ${key} (${buffer.length} bytes) to ${bucket || this.documentsBucket}`);
  }

  /**
   * Upload a Readable stream to MinIO.
   */
  async uploadStream(
    key: string,
    stream: Readable,
    contentType: string,
    bucket?: string,
  ): Promise<void> {
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: bucket || this.documentsBucket,
        Key: key,
        Body: stream,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded stream ${key} to ${bucket || this.documentsBucket}`);
  }

  /**
   * Download an object from MinIO as a Buffer.
   * Used by CV parser to read file bytes for text extraction.
   */
  async downloadToBuffer(key: string, bucket?: string): Promise<Buffer> {
    const response = await this.internalClient.send(
      new GetObjectCommand({
        Bucket: bucket || this.documentsBucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error(`Empty response body for key: ${key}`);
    }

    // AWS SDK v3 returns a Readable stream
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Check if an object exists in MinIO.
   */
  async objectExists(key: string, bucket?: string): Promise<boolean> {
    try {
      await this.internalClient.send(
        new HeadObjectCommand({
          Bucket: bucket || this.documentsBucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete an object from MinIO.
   */
  async deleteObject(key: string, bucket?: string): Promise<void> {
    await this.internalClient.send(
      new DeleteObjectCommand({
        Bucket: bucket || this.documentsBucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted ${key} from ${bucket || this.documentsBucket}`);
  }

  // ============================================
  // Helpers
  // ============================================

  /** Get the documents bucket name */
  getDocumentsBucket(): string {
    return this.documentsBucket;
  }

  /** Get the avatars bucket name */
  getAvatarsBucket(): string {
    return this.avatarsBucket;
  }

  /**
   * Extract and validate file extension. Returns empty string if invalid.
   */
  sanitizeExtension(filename: string): string {
    // Take only the last extension segment to prevent ".pdf.exe" tricks
    const parts = filename.split('.');
    if (parts.length < 2) return '';
    const ext = `.${parts[parts.length - 1].toLowerCase()}`;
    return ext;
  }

  /**
   * Validate that a file extension is allowed for the given folder.
   */
  isExtensionAllowed(filename: string, folder: string): boolean {
    const ext = this.sanitizeExtension(filename);
    const allowed = ALLOWED_EXTENSIONS[folder] || ALLOWED_EXTENSIONS['other'];
    return allowed.includes(ext);
  }

  // ============================================
  // Object Promotion and Tagging
  // ============================================

  /**
   * Copy an object to a new location, apply tags, and delete the original object.
   * Used for promoting Talent Pool staging files to permanent CV files.
   */
  async moveObjectWithTags(
    sourceKey: string,
    destKey: string,
    tags: Record<string, string>,
    bucket?: string,
  ): Promise<void> {
    const targetBucket = bucket || this.documentsBucket;

    // 1. Copy the object
    await this.internalClient.send(
      new CopyObjectCommand({
        Bucket: targetBucket,
        CopySource: `${targetBucket}/${sourceKey}`, // Format must be bucket/key
        Key: destKey,
      }),
    );
    this.logger.log(`Copied ${sourceKey} to ${destKey}`);

    // 2. Apply tags to the new object
    if (Object.keys(tags).length > 0) {
      const tagging = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
      await this.internalClient.send(
        new PutObjectTaggingCommand({
          Bucket: targetBucket,
          Key: destKey,
          Tagging: {
            TagSet: tagging,
          },
        }),
      );
      this.logger.log(`Applied tags to ${destKey}`);
    }

    // 3. Delete the original staging object
    await this.deleteObject(sourceKey, targetBucket);
    this.logger.log(`Deleted original staging object ${sourceKey}`);
  }
}
