/** Reliable demo image URLs — Unsplash hotlinks often 404 after IDs are removed. */

export function avatarUrl(seed: string, size = 256): string {
  return `https://i.pravatar.cc/${size}?u=${encodeURIComponent(seed)}`;
}

export function actionPhotoUrl(seed: string, w = 800, h = 533): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
