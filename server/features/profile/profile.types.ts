export interface PublicProfile {
  id: string;
  username: string;
  displayName?: string | null;
  bio?: string | null;
  // Avatar variants. `avatarThumbUrl` is the existing canonical field (the
  // raw column on `users`). `avatarMediumUrl` and the modern WebP/AVIF
  // siblings are derived from the worker URL pattern when applicable so
  // larger surfaces (profile header) can request a sharper image without a
  // separate column. All optional â€” profiles using uploaded-elsewhere
  // avatars (Replit auth, dicebear, etc.) only get the base URL.
  avatarThumbUrl?: string | null;
  avatarMediumUrl?: string | null;
  avatarThumbWebpUrl?: string | null;
  avatarMediumWebpUrl?: string | null;
  avatarThumbAvifUrl?: string | null;
  avatarMediumAvifUrl?: string | null;
  // Canonical variant fields (mirror the avatar variants) so generic image
  // consumers can use the same `thumbUrl`/`mediumUrl` contract that posts,
  // products, and places expose.
  thumbUrl?: string | null;
  mediumUrl?: string | null;
  thumbWebpUrl?: string | null;
  mediumWebpUrl?: string | null;
  thumbAvifUrl?: string | null;
  mediumAvifUrl?: string | null;
  createdAt: string; // ISO
}
