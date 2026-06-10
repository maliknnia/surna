/** Draw AR overlay elements on canvas after capture */
export type ArOverlayId =
  | "score-badge"
  | "lightning"
  | "stadium"
  | "trophy-ar"
  | "cork-pin"
  | "surna-stamp";

export function drawArOverlay(
  ctx: CanvasRenderingContext2D,
  overlayId: string,
  width: number,
  height: number,
  scoreText = "2 - 1",
) {
  const pad = Math.min(width, height) * 0.06;
  ctx.save();

  switch (overlayId) {
    case "score-badge": {
      const bw = width * 0.42;
      const bh = height * 0.1;
      const bx = (width - bw) / 2;
      const by = pad;
      ctx.fillStyle = "rgba(124, 58, 237, 0.92)";
      roundRect(ctx, bx, by, bw, bh, 12);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${bh * 0.45}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(scoreText, width / 2, by + bh / 2);
      break;
    }
    case "lightning": {
      ctx.font = `${height * 0.2}px serif`;
      ctx.fillText("⚡", width * 0.08, height * 0.22);
      break;
    }
    case "stadium": {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, height * 0.72, width, height * 0.28);
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${height * 0.04}px Inter`;
      ctx.textAlign = "center";
      ctx.fillText("🏟️ STADIUM CROWD", width / 2, height * 0.88);
      break;
    }
    case "trophy-ar": {
      ctx.font = `${height * 0.18}px serif`;
      ctx.fillText("🏆", width * 0.78, height * 0.18);
      break;
    }
    case "cork-pin": {
      ctx.fillStyle = "#166534";
      roundRect(ctx, pad, height - pad - 36, 120, 36, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "600 14px Inter";
      ctx.fillText("📍 Cork", pad + 12, height - pad - 14);
      break;
    }
    case "surna-stamp": {
      const size = Math.min(width, height) * 0.22;
      const sx = width - size - pad;
      const sy = height - size - pad;
      ctx.strokeStyle = "rgba(124, 58, 237, 0.9)";
      ctx.lineWidth = 3;
      ctx.strokeRect(sx, sy, size, size);
      ctx.fillStyle = "rgba(124, 58, 237, 0.75)";
      ctx.font = `bold ${size * 0.22}px Inter`;
      ctx.textAlign = "center";
      ctx.fillText("SURNA", sx + size / 2, sy + size / 2 + 6);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function applyFilterAndArToImage(
  source: HTMLImageElement | HTMLCanvasElement,
  filterId: string,
  arId: string | null,
  filterCss: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = filterCss === "none" ? "none" : filterCss;
  ctx.drawImage(source, 0, 0, w, h);
  ctx.filter = "none";
  if (arId && arId !== "none") {
    drawArOverlay(ctx, arId, w, h);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob failed"))), "image/jpeg", 0.92);
  });
}

export async function captureVideoFrame(
  video: HTMLVideoElement,
  filterId: string,
  arId: string | null,
  cssFilter: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = cssFilter === "none" ? "none" : cssFilter;
  ctx.drawImage(video, 0, 0);
  ctx.filter = "none";
  if (arId) {
    drawArOverlay(ctx, arId, canvas.width, canvas.height);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob failed"))), "image/jpeg", 0.92);
  });
}
