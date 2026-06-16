import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { requireTenantId } from './tenant.util';

export interface PresignedUpload {
  uploadUrl: string;
  fileKey: string;
}

/**
 * Allow-list of content types accepted for direct-to-bucket uploads. Deliberately excludes
 * active/executable types (text/html, image/svg+xml, application/x-* binaries, *.js) so a
 * presigned URL can never be used to stage a stored-XSS payload or malware that a later
 * download surfaces inline. New legitimate types must be added here explicitly.
 */
export const ALLOWED_UPLOAD_MIME: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/** Hard ceiling enforced at presign time regardless of the per-feature DTO limit (defense in depth). */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

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
    const safe = fileName
      .replace(/[^A-Za-z0-9._-]/g, '_')
      // Collapse any run of dots so a crafted name (e.g. "../../x") can never embed ".." in the
      // key — keeps the key flat and consistent with assertKeyInTenant's traversal guard.
      .replace(/\.{2,}/g, '_')
      .slice(0, 120);
    return `tenants/${tenantId}/${prefix}/${randomUUID()}-${safe}`;
  }

  /**
   * Guard against cross-tenant object references. The upload flow is two-step: the client gets a
   * presigned PUT for a server-generated key, then echoes a `fileKey` back at "confirm". Because
   * S3 lives outside Postgres, RLS cannot stop a client from confirming/downloading ANOTHER
   * tenant's key. This asserts the key sits inside the caller's tenant namespace
   * (`tenants/<tenantId>/…`). Call it before persisting or signing any client-supplied key.
   */
  assertKeyInTenant(fileKey: string): void {
    const prefix = `tenants/${requireTenantId()}/`;
    if (!fileKey.startsWith(prefix) || fileKey.includes('..')) {
      throw new ForbiddenException('File key does not belong to this tenant');
    }
  }

  /**
   * Validate a client-declared content type / size against the allow-list and hard limits.
   * Called automatically by presignUpload before a URL is minted, so disallowed types are
   * rejected with a 400 (never reaching the bucket). Exposed for reuse + unit testing.
   */
  assertUploadAllowed(contentType: string, sizeBytes?: number): void {
    const type = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
    if (!ALLOWED_UPLOAD_MIME.has(type)) {
      throw new BadRequestException(`Unsupported file type: ${type || '(none)'}`);
    }
    if (sizeBytes !== undefined && (sizeBytes < 0 || sizeBytes > MAX_UPLOAD_BYTES)) {
      throw new BadRequestException(`File exceeds the maximum allowed size`);
    }
  }

  async presignUpload(
    fileKey: string,
    contentType: string,
    sizeBytes?: number,
  ): Promise<PresignedUpload> {
    // Reject dangerous/oversized uploads before a presigned URL is ever minted.
    this.assertUploadAllowed(contentType, sizeBytes);

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
      // The signed ContentType is pinned: S3 rejects a PUT whose Content-Type header differs.
      ContentType: contentType,
      // Enforce a max object size at the bucket layer so a stolen/replayed URL can't stream GBs.
      ...(sizeBytes !== undefined ? { ContentLength: sizeBytes } : {}),
      // Encrypt at rest (SSE-S3) even if the bucket default is somehow misconfigured.
      ServerSideEncryption: 'AES256',
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
