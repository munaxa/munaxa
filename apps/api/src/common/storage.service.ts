import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

export interface PresignedUpload {
  uploadUrl: string;
  fileKey: string;
}

/**
 * S3 storage for secure direct-to-bucket uploads via pre-signed URLs. The AWS SDK is
 * lazily imported only when configured (AWS_S3_BUCKET present); otherwise a deterministic
 * dev/test stub URL is returned so the flow is exercisable without cloud credentials.
 *
 * Keys are namespaced by tenant: `tenants/<tenantId>/<prefix>/<uuid>-<safeName>`.
 */
@Injectable()
export class StorageService {
  private readonly bucket?: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET') || undefined;
    this.region = config.get<string>('AWS_REGION') ?? 'eu-central-1';
    this.endpoint = config.get<string>('AWS_S3_ENDPOINT') || undefined;
  }

  get configured(): boolean {
    return Boolean(this.bucket && this.config.get('AWS_ACCESS_KEY_ID'));
  }

  buildKey(tenantId: string, prefix: string, fileName: string): string {
    const safe = fileName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
    return `tenants/${tenantId}/${prefix}/${randomUUID()}-${safe}`;
  }

  async presignUpload(fileKey: string, contentType: string): Promise<PresignedUpload> {
    if (!this.configured) {
      const base = this.endpoint ?? 'https://uploads.munaxa.local';
      return { uploadUrl: `${base}/${this.bucket ?? 'munaxa-dev'}/${fileKey}?stub=put`, fileKey };
    }
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = new S3Client({ region: this.region, endpoint: this.endpoint });
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return { uploadUrl, fileKey };
  }

  async presignDownload(fileKey: string): Promise<string> {
    if (!this.configured) {
      const base = this.endpoint ?? 'https://uploads.munaxa.local';
      return `${base}/${this.bucket ?? 'munaxa-dev'}/${fileKey}?stub=get`;
    }
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = new S3Client({ region: this.region, endpoint: this.endpoint });
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
    return getSignedUrl(client, command, { expiresIn: 900 });
  }
}
