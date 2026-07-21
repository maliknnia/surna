const colorCache = new Map<string, string>();
const edgeColorCache = new Map<string, string>();

function normalizeImageUrl(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;
  return trimmed;
}

export function getCachedColor(imageUrl: string): string | null {
  return colorCache.get(normalizeImageUrl(imageUrl)) || null;
}

export function getCachedEdgeColor(imageUrl: string): string | null {
  return edgeColorCache.get(imageUrl) || null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Lift a hex colour toward white for UI washes (coach hero, chips, etc.). */
export function brightenHex(hex: string, amount = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lift = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  return `#${((1 << 24) + (lift(r) << 16) + (lift(g) << 8) + lift(b)).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hh / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/**
 * Discovery card fill from a photo colour —
 * keep the image’s warmth, pull toward brick red / brown, solid (no wash).
 */
export function softenCardColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#8B2635";

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Warm brick target (~12°) — reds/oranges keep more of their own hue
  const targetHue = 12;
  const isAlreadyWarm = h <= 45 || h >= 330;
  const hueBlend = isAlreadyWarm ? 0.28 : 0.62;
  let warmH = h + ((targetHue - h + 540) % 360 - 180) * hueBlend;
  warmH = ((warmH % 360) + 360) % 360;

  // Rich but not neon; dark enough for white text (event-card look)
  const warmS = Math.min(0.72, Math.max(0.38, s * 0.85 + 0.22));
  const warmL = Math.min(0.4, Math.max(0.26, l * 0.55 + 0.12));

  const out = hslToRgb(warmH, warmS, warmL);
  return rgbToHex(out.r, out.g, out.b);
}

/** Average colour along image edges — for post-card gradient washes. */
export function extractEdgeColor(imageUrl: string): Promise<string> {
  if (edgeColorCache.has(imageUrl)) {
    return Promise.resolve(edgeColorCache.get(imageUrl)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("#1a1a1a");
          return;
        }
        const w = 48;
        const h = 48;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        const sample = (x: number, y: number) => {
          const i = (y * w + x) * 4;
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const pa = data[i + 3];
          if (pa < 128) return;
          if (pr > 240 && pg > 240 && pb > 240) return;
          if (pr < 12 && pg < 12 && pb < 12) return;
          r += pr;
          g += pg;
          b += pb;
          count++;
        };

        for (let x = 0; x < w; x++) {
          sample(x, 0);
          sample(x, h - 1);
        }
        for (let y = 1; y < h - 1; y++) {
          sample(0, y);
          sample(w - 1, y);
        }

        if (count === 0) {
          resolve("#1a1a1a");
          return;
        }
        r = Math.min(255, Math.round((r / count) * 0.72));
        g = Math.min(255, Math.round((g / count) * 0.72));
        b = Math.min(255, Math.round((b / count) * 0.72));
        const hex = softenCardColor(rgbToHex(r, g, b));
        edgeColorCache.set(imageUrl, hex);
        resolve(hex);
      } catch {
        resolve("#1a1a1a");
      }
    };
    img.onerror = () => resolve("#1a1a1a");
    img.src = imageUrl;
  });
}

/** Same-origin, blob, and data URLs can be sampled without CORS taint issues. */
function canSampleImagePixels(imageUrl: string): boolean {
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) return true;
  if (imageUrl.startsWith("/")) return true;
  try {
    return new URL(imageUrl, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function extractDominantColor(imageUrl: string): Promise<string> {
  const normalized = normalizeImageUrl(imageUrl);
  if (colorCache.has(normalized)) {
    return Promise.resolve(colorCache.get(normalized)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (canSampleImagePixels(normalized) || normalized.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve("#8b2635"); return; }
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
          if (pa < 128) continue;
          if (pr > 240 && pg > 240 && pb > 240) continue;
          if (pr < 15 && pg < 15 && pb < 15) continue;
          r += pr; g += pg; b += pb; count++;
        }
        if (count === 0) { resolve("#8b2635"); return; }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const hex = softenCardColor(
          `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`,
        );
        colorCache.set(normalized, hex);
        resolve(hex);
      } catch {
        resolve("#8b2635");
      }
    };
    img.onerror = () => resolve("#8b2635");
    img.src = normalized;
  });
}
