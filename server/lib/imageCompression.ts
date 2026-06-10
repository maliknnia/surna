import sharp from "sharp";

/** Stored originals — max width before S3 upload. */
export const IMAGE_MAX_WIDTH = 1200;
export const IMAGE_JPEG_QUALITY = 80;

const COMPRESSIBLE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isCompressibleImage(mimeType: string): boolean {
  return COMPRESSIBLE.has(mimeType);
}

export async function compressImageForStorage(input: Buffer): Promise<{
  buffer: Buffer;
  contentType: "image/jpeg";
  width: number;
  height: number;
}> {
  const rotated = sharp(input).rotate();
  const metadata = await rotated.metadata();
  const buffer = await rotated
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  const out = await sharp(buffer).metadata();
  return {
    buffer,
    contentType: "image/jpeg",
    width: out.width ?? metadata.width ?? 0,
    height: out.height ?? metadata.height ?? 0,
  };
}
