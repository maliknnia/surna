import { sql } from "drizzle-orm";
import { db } from "../db";
import { posts } from "@shared/schema";
import { ensurePhase9MobileTables } from "../infrastructure/phase9Mobile";
import {
  isCloudinaryConfigured,
  uploadVideoToCloudinary,
  type CloudinaryVideoResult,
} from "./cloudinaryMedia";

export { isCloudinaryConfigured };
export type VideoUploadResult = CloudinaryVideoResult;

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

export { uploadVideoToCloudinary };

export async function createVideoPost(
  authorId: string,
  params: {
    content: string;
    videoUrl: string;
    thumbnailUrl: string;
    sport?: string;
    location?: string;
    videoFormat?: "reel" | "video";
    durationSec?: number;
  },
) {
  await ensurePhase9MobileTables();
  const eventData =
    params.videoFormat || params.durationSec != null
      ? {
          ...(params.videoFormat ? { videoFormat: params.videoFormat } : {}),
          ...(params.durationSec != null ? { durationSec: params.durationSec } : {}),
        }
      : null;
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
      eventData,
    })
    .returning();
  console.log("[Phase9-5] Video post created:", post.id);
  return post;
}
