/** Instagram-style feed media bounds: max portrait 4:5, max landscape ~1.91:1 */
const MIN_RATIO = 4 / 5; // 0.8 — tallest allowed
const MAX_RATIO = 1.91; // widest allowed
const DEFAULT_RATIO = 1;

export function clampFeedAspectRatio(width: number, height: number): number {
  if (!width || !height) return DEFAULT_RATIO;
  const ratio = width / height;
  if (ratio < MIN_RATIO) return MIN_RATIO;
  if (ratio > MAX_RATIO) return MAX_RATIO;
  return ratio;
}

export function feedAspectCss(ratio: number): string {
  return String(Number(ratio.toFixed(4)));
}

export function feedAspectFromDimensions(width?: number | null, height?: number | null): number {
  if (width && height) return clampFeedAspectRatio(width, height);
  return DEFAULT_RATIO;
}
