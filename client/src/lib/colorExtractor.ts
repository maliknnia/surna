/**
 * Extract dominant colors from an image for Spotify-style dynamic theming.
 */
export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  isDark: boolean;
}

export async function extractColors(imageUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(img, 0, 0, 64, 64);

      const imageData = ctx.getImageData(0, 0, 64, 64).data;
      let r = 0;
      let g = 0;
      let b = 0;
      let r2 = 0;
      let g2 = 0;
      let b2 = 0;
      let r3 = 0;
      let g3 = 0;
      let b3 = 0;
      let count = 0;

      for (let i = 0; i < imageData.length; i += 16) {
        const pr = imageData[i];
        const pg = imageData[i + 1];
        const pb = imageData[i + 2];
        const brightness = (pr + pg + pb) / 3;
        if (brightness < 20 || brightness > 240) continue;

        r += pr;
        g += pg;
        b += pb;
        r2 += pr * 0.8;
        g2 += pg * 1.1;
        b2 += pb * 0.9;
        r3 += pr * 1.1;
        g3 += pg * 0.8;
        b3 += pb * 1.2;
        count++;
      }

      if (count === 0) {
        resolve({
          primary: "rgb(220, 38, 38)",
          secondary: "rgb(153, 27, 27)",
          accent: "rgb(239, 68, 68)",
          isDark: true,
        });
        return;
      }

      const primary = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
      const secondary = `rgb(${Math.round(r2 / count)}, ${Math.round(g2 / count)}, ${Math.round(b2 / count)})`;
      const accent = `rgb(${Math.round(r3 / count)}, ${Math.round(g3 / count)}, ${Math.round(b3 / count)})`;
      const avgBrightness = (r / count + g / count + b / count) / 3;

      resolve({
        primary,
        secondary,
        accent,
        isDark: avgBrightness < 128,
      });
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}

export function generateGradient(colors: ExtractedColors, direction = "to bottom"): string {
  return `linear-gradient(${direction}, ${colors.primary} 0%, ${colors.secondary} 50%, rgb(10, 10, 10) 100%)`;
}

export function getContrastColor(isDark: boolean): string {
  return isDark ? "#FFFFFF" : "#000000";
}
