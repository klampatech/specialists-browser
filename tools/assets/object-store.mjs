/**
 * Object store abstraction for the game's static payload.
 *
 * WHY THIS EXISTS
 * ---------------
 * Asset hosting is the one part of the project that genuinely varies by
 * provider, and it varies a lot. Cloudflare R2 costs ~$0.36/month at
 * 1,000 new players because egress is free; the same traffic from S3 is
 * ~$47 and from CloudFront ~$44. That difference is the entire reason R2
 * is the recommendation, and it is a CONFIG decision, not an ARCHITECTURE
 * one - provided the code goes through the S3 API rather than an
 * R2-specific binding.
 *
 * R2 is an S3-API drop-in: point the AWS SDK at a different endpoint and
 * it works. So do S3, MinIO, Backblaze B2 and Supabase Storage. Building
 * against S3 rather than against R2 keeps the provider choice open until
 * it is actually made, which is the point.
 *
 * INTERFACE
 * ---------
 * Deliberately tiny - three operations, because that is all the asset
 * pipeline needs. Everything else (listing, lifecycle, CDN config) is
 * provider-specific and deliberately not abstracted here; a narrow
 * interface is cheaper to live with than a leaky one.
 *
 *   putObject(key, body, contentType) -> { key, etag }
 *   getObject(key)                    -> Buffer
 *   publicUrl(key)                    -> string
 *
 * CONFIGURATION
 * -------------
 * All from env, so switching providers is a redeploy:
 *
 *   ASSET_STORE_ENDPOINT  S3-compatible endpoint. R2 looks like
 *                         https://<account-id>.r2.cloudflarestorage.com
 *                         (AWS: leave unset)
 *   ASSET_STORE_REGION    'auto' for R2, a real region for S3
 *   ASSET_STORE_BUCKET    bucket name
 *   ASSET_STORE_ACCESS_KEY_ID
 *   ASSET_STORE_SECRET_ACCESS_KEY
 *   ASSET_PUBLIC_BASE     optional CDN/asset domain in front of the bucket,
 *                         e.g. https://assets.example.com
 *
 * Note on why R2 matters: CDN cache-file limits make the payload's PART
 * SIZE the load-bearing parameter, not the store. See
 * docs/ASSET-DELIVERY.md - 64MB parts sit under Cloudflare's 512MB
 * ceiling, the archive as a single object did not.
 */

/**
 * @typedef {Object} ObjectStore
 * @property {(key: string, body: Buffer|Uint8Array|ReadableStream, contentType?: string) => Promise<{key: string, etag?: string}>} putObject
 * @property {(key: string) => Promise<Buffer>} getObject
 * @property {(key: string) => string} publicUrl
 */

/** Raised when the store is asked to do something it was not configured for. */
export class ObjectStoreError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ObjectStoreError';
    this.cause = cause;
  }
}

/**
 * Build an S3-compatible store from env.
 *
 * The AWS SDK is imported lazily so this module can be imported (and its
 * interface inspected) without the dependency installed - useful for
 * tests and for documenting the contract.
 *
 * @returns {Promise<ObjectStore>}
 */
export async function createObjectStoreFromEnv(env = process.env) {
  const bucket = env.ASSET_STORE_BUCKET;
  if (!bucket) {
    throw new ObjectStoreError(
      'ASSET_STORE_BUCKET is not set.\n' +
        '  This script talks to an S3-compatible object store. Configure:\n' +
        '    ASSET_STORE_BUCKET, ASSET_STORE_REGION, ASSET_STORE_ENDPOINT,\n' +
        '    ASSET_STORE_ACCESS_KEY_ID, ASSET_STORE_SECRET_ACCESS_KEY\n' +
        '  For Cloudflare R2 the endpoint is\n' +
        '    https://<account-id>.r2.cloudflarestorage.com\n' +
        '  and ASSET_STORE_REGION is "auto".',
    );
  }

  let S3Client;
  let PutObjectCommand;
  let GetObjectCommand;
  try {
    ({ S3Client, PutObjectCommand, GetObjectCommand } = await import(
      '@aws-sdk/client-s3'
    ));
  } catch (e) {
    throw new ObjectStoreError(
      '@aws-sdk/client-s3 is not installed. Run: npm i -D @aws-sdk/client-s3',
      e,
    );
  }

  const client = new S3Client({
    region: env.ASSET_STORE_REGION || 'auto',
    // Omitted for real S3, which resolves it from the region.
    ...(env.ASSET_STORE_ENDPOINT ? { endpoint: env.ASSET_STORE_ENDPOINT } : {}),
    credentials: {
      accessKeyId: env.ASSET_STORE_ACCESS_KEY_ID,
      secretAccessKey: env.ASSET_STORE_SECRET_ACCESS_KEY,
    },
  });

  const publicBase = (env.ASSET_PUBLIC_BASE || '').replace(/\/+$/, '');

  return {
    async putObject(key, body, contentType = 'application/octet-stream') {
      const res = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Long-lived but safe: every part is content-addressed, so a key
          // never changes meaning. The manifest is the only mutable object
          // and is uploaded separately with no-store semantics.
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return { key, etag: res.ETag };
    },

    async getObject(key) {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      return Buffer.from(await res.Body.transformToByteArray());
    },

    publicUrl(key) {
      return publicBase ? `${publicBase}/${key}` : `s3://${bucket}/${key}`;
    },
  };
}

/**
 * An in-memory store. Used by the upload script's `--dry-run` and by tests,
 * so the asset pipeline can be exercised with no cloud account at all.
 *
 * @returns {ObjectStore & { size(): number, keys(): string[] }}
 */
export function createMemoryStore() {
  const map = new Map();
  return {
    async putObject(key, body) {
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
      map.set(key, buf);
      return { key, etag: `mem-${buf.length}` };
    },
    async getObject(key) {
      const b = map.get(key);
      if (!b) throw new ObjectStoreError(`no such key: ${key}`);
      return b;
    },
    publicUrl(key) {
      return `memory://${key}`;
    },
    size: () => map.size,
    keys: () => [...map.keys()],
  };
}