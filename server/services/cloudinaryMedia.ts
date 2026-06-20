import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

export type CloudinaryImageResult = {
  publicUrl: string;
  publicId: string;
  width?: number;
  height?: number;
};

export type CloudinaryVideoResult = {
  videoUrl: string;
  thumbnailUrl: string;
  publicId: string;
  duration?: number;
  width?: number;
  height?: number;
};

export async function uploadImageToCloudinary(
  buffer: Buffer,
  _filename?: string,
): Promise<CloudinaryImageResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "surna/media",
        overwrite: false,
        quality: "auto:good",
        fetch_format: "auto",
        transformation: [{ width: 2048, crop: "limit" }],
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary image upload failed"));
          return;
        }
        resolve({
          publicUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadVideoToCloudinary(
  buffer: Buffer,
  _filename?: string,
): Promise<CloudinaryVideoResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "surna/media",
        overwrite: false,
        eager: [
          { width: 720, crop: "limit", quality: "auto", fetch_format: "mp4" },
          { width: 400, height: 400, crop: "fill", gravity: "auto", format: "jpg" },
        ],
        eager_async: false,
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary video upload failed"));
          return;
        }
        const eager = (result.eager ?? []) as Array<{ secure_url?: string; format?: string }>;
        const compressed = eager.find((e) => e.format === "mp4") ?? eager[0];
        const thumb = eager.find((e) => e.format === "jpg") ?? eager[1];

        resolve({
          videoUrl: compressed?.secure_url ?? result.secure_url,
          thumbnailUrl:
            thumb?.secure_url ??
            cloudinary.url(result.public_id, {
              resource_type: "video",
              format: "jpg",
              transformation: [{ width: 400, height: 400, crop: "fill", gravity: "auto" }],
            }),
          publicId: result.public_id,
          duration: result.duration,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}
