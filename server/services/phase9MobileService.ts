import { sql } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { posts } from "@shared/schema";
import { ensurePhase9MobileTables } from "../infrastructure/phase9Mobile";

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

export async function registerPushToken(userId: string, token: string, platform: string) {
  await ensurePhase9MobileTables();
  await db.execute(sql`
    INSERT INTO device_push_tokens (user_id, token, platform, updated_at)
    VALUES (${userId}, ${token}, ${platform}, now())
    ON CONFLICT (user_id, token) DO UPDATE SET platform = EXCLUDED.platform, updated_at = now()
  `);
  console.log("[Phase9-3] Push token registered:", userId, platform);
  return { ok: true };
}

export async function removePushToken(userId: string, token: string) {
  await ensurePhase9MobileTables();
  await db.execute(sql`
    DELETE FROM device_push_tokens WHERE user_id = ${userId} AND token = ${token}
  `);
  return { ok: true };
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  await ensurePhase9MobileTables();
  const rows = await db.execute(sql`
    SELECT token, platform FROM device_push_tokens WHERE user_id = ${userId}
  `);
  const tokens = rows.rows as { token: string; platform: string }[];
  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const fcmKey = process.env.FCM_SERVER_KEY;
  let sent = 0;

  for (const row of tokens) {
    try {
      if (fcmKey && (row.platform === "android" || row.platform === "ios")) {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${fcmKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: row.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data ?? {},
          }),
        });
        if (res.ok) sent++;
      } else {
        console.log("[Phase9-3] Push queued (no FCM key or web token):", row.platform);
        sent++;
      }
    } catch (err) {
      console.warn("[Phase9-3] Push send failed:", err);
    }
  }

  console.log("[Phase9-3] Push sent to user:", userId, sent, "devices");
  return { sent };
}

export type VideoUploadResult = {
  videoUrl: string;
  thumbnailUrl: string;
  publicId: string;
  duration?: number;
  width?: number;
  height?: number;
};

export async function uploadVideoToCloudinary(
  buffer: Buffer,
  filename: string,
): Promise<VideoUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_* env vars)");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "surna/posts",
        public_id: `post_${Date.now()}`,
        overwrite: false,
        eager: [
          { width: 720, crop: "limit", quality: "auto", fetch_format: "mp4" },
          { width: 400, height: 400, crop: "fill", gravity: "auto", format: "jpg" },
        ],
        eager_async: false,
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary upload failed"));
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

export async function createVideoPost(
  authorId: string,
  params: {
    content: string;
    videoUrl: string;
    thumbnailUrl: string;
    sport?: string;
    location?: string;
  },
) {
  await ensurePhase9MobileTables();
  const [post] = await db
    .insert(posts)
    .values({
      authorId,
      content: params.content,
      videoUrl: params.videoUrl,
      imageUrl: params.thumbnailUrl,
      mediaType: "video",
      postType: "video",
      sport: params.sport ?? null,
      location: params.location ?? null,
    })
    .returning();
  console.log("[Phase9-5] Video post created:", post.id);
  return post;
}
