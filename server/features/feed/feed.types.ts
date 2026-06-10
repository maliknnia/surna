import type { ImageVariants } from "../media/variants";

// Canonical image-variant contract used by every list/detail surface.
// `thumbUrl` is the small (256w) variant; `mediumUrl` is the large (1024w)
// variant. The WebP/AVIF siblings are included when the resize worker
// produced them. All fields are optional â€” callers fall back to the legacy
// `imageUrl` when a post pre-dates the variant pipeline.
export interface FeedItem extends ImageVariants {
  id: string;
  userId: string;
  caption: string | null;
  createdAt: string;
  username: string;
  avatarThumbUrl?: string;
  likeCount: number;
  commentCount: number;
}

export interface FeedCursor {
  createdAt: string;
  id: string;
}
