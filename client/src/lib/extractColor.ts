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

/** Soften extracted photo colours for card backgrounds — lighter, less aggressive. */
export function softenCardColor(hex: string): string {
  return brightenHex(hex, 0.38);
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
