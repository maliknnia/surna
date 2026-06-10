import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_PUBLIC_BASE_URL
} = process.env;

export const MEDIA_CACHE_CONTROL =
  process.env.MEDIA_CACHE_CONTROL || "public, max-age=31536000, immutable";

export const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT, // keep undefined for real AWS if you want
  forcePathStyle: !S3_ENDPOINT?.includes("amazonaws"), // true for many S3-compatible providers
  credentials: { accessKeyId: S3_ACCESS_KEY!, secretAccessKey: S3_SECRET_KEY! },
});

export async function createPresignedPut(key: string, contentType: string, expiresSec = 900) {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: MEDIA_CACHE_CONTROL,
    ACL: "public-read",
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresSec });
  // S3_PUBLIC_BASE_URL is the CDN hostname in front of the bucket (e.g. cdn.surna.io)
  // so clients fetch via the edge cache, not the raw S3 endpoint.
  const publicUrl = `${process.env.S3_PUBLIC_BASE_URL}/${key}`;
  // Clients PUTting to uploadUrl must echo the Cache-Control header below or
  // the signature check fails. Surface it so the uploader can set it.
  return { uploadUrl: url, publicUrl, cacheControl: MEDIA_CACHE_CONTROL };
}

/** Server-side upload after Sharp compression (images only). */
export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: MEDIA_CACHE_CONTROL,
    ACL: "public-read",
  });
  await s3.send(cmd);
  return `${S3_PUBLIC_BASE_URL}/${key}`;
}

export function buildUploadKey(userId: string, filename: string): string {
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `uploads/${userId}/${ts}_${safe.replace(/\.[^.]+$/, "")}.jpg`;
}

export function isS3Configured(): boolean {
  return Boolean(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY && S3_PUBLIC_BASE_URL);
}
