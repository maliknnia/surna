import { selectProfileByUsername, updateMe } from "./profile.repo";
import type { PublicProfile } from "./profile.types";
import { deriveImageVariants } from "../media/variants";

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const row = await selectProfileByUsername(username);
  if (!row) return null;
  // Derive medium/WebP/AVIF avatar URLs when the stored avatar is a
  // worker-generated variant. Surfaces that need a larger, sharper avatar
  // (profile header) prefer `avatarMediumUrl`; small surfaces keep using
  // `avatarThumbUrl`. We also expose the canonical `thumbUrl`/`mediumUrl`
  // contract so generic image consumers don't need profile-specific fields.
  const r = row as Record<string, unknown> & { avatarThumbUrl: string | null };
  const v = deriveImageVariants(r.avatarThumbUrl) ?? {};
  return {
    ...r,
    avatarThumbUrl: v.thumbUrl ?? r.avatarThumbUrl,
    avatarMediumUrl: v.mediumUrl,
    avatarThumbWebpUrl: v.thumbWebpUrl,
    avatarMediumWebpUrl: v.mediumWebpUrl,
    avatarThumbAvifUrl: v.thumbAvifUrl,
    avatarMediumAvifUrl: v.mediumAvifUrl,
    thumbUrl: v.thumbUrl,
    mediumUrl: v.mediumUrl,
    thumbWebpUrl: v.thumbWebpUrl,
    mediumWebpUrl: v.mediumWebpUrl,
    thumbAvifUrl: v.thumbAvifUrl,
    mediumAvifUrl: v.mediumAvifUrl,
  } as PublicProfile;
}

export async function patchMe(userId: string, data: {
  displayName?: string; bio?: string; avatarThumbUrl?: string;
}) {
  return await updateMe(userId, data);
}
