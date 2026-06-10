export type MediaKind = "image" | "video" | "audio";
export type MediaStatus = "pending" | "ready" | "failed";

export interface MediaRecord {
  id: string;
  userId: string;
  postId?: string | null;
  kind: MediaKind;
  status: MediaStatus;
  originalUrl: string;
  thumbUrl?: string | null;
  mediumUrl?: string | null;
  // Modern-format variants emitted by the resize worker. The frontend wraps
  // these in <picture> with the JPEG (`thumbUrl`/`mediumUrl`) as the fallback.
  thumbWebpUrl?: string | null;
  mediumWebpUrl?: string | null;
  thumbAvifUrl?: string | null;
  mediumAvifUrl?: string | null;
  createdAt: string; // ISO
}
