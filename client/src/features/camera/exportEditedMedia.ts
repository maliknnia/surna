import { drawArOverlay } from "./arOverlays";
import { filterCss } from "./filterEngine";

export type ExportSticker = { label: string; x: number; y: number; scale: number };
export type ExportTextLayer = { text: string; x: number; y: number; color: string };
export type ExportDrawStroke = { points: { x: number; y: number }[]; color: string; size: number };

export type ExportEditedMediaInput = {
  blob: Blob;
  mediaType: "image" | "video";
  filterId: string;
  arId?: string | null;
  /** Photo from in-app capture already has filter (+ AR) baked into the blob */
  filterBaked?: boolean;
  displayWidth: number;
  displayHeight: number;
  stickers: ExportSticker[];
  texts: ExportTextLayer[];
  strokes: ExportDrawStroke[];
};

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: ExportDrawStroke[],
  scaleX: number,
  scaleY: number,
  sizeScale: number,
) {
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size * sizeScale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * scaleX, s.points[0].y * scaleY);
    for (let i = 1; i < s.points.length; i++) {
      ctx.lineTo(s.points[i].x * scaleX, s.points[i].y * scaleY);
    }
    ctx.stroke();
  }
}

function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: ExportSticker[],
  scaleX: number,
  scaleY: number,
) {
  for (const s of stickers) {
    const fontSize = 36 * Math.min(scaleX, scaleY) * s.scale;
    ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, s.x * scaleX, s.y * scaleY);
  }
}

function drawTexts(
  ctx: CanvasRenderingContext2D,
  texts: ExportTextLayer[],
  width: number,
  height: number,
  scale: number,
) {
  for (const t of texts) {
    const trimmed = t.text.trim();
    if (!trimmed || trimmed === "Tap to type") continue;
    ctx.fillStyle = t.color;
    ctx.font = `700 ${18 * scale}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(trimmed, (t.x / 100) * width, (t.y / 100) * height);
  }
}

function drawAllOverlays(
  ctx: CanvasRenderingContext2D,
  input: ExportEditedMediaInput,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
) {
  const sizeScale = Math.min(scaleX, scaleY);
  if (input.arId && !input.filterBaked) {
    drawArOverlay(ctx, input.arId, width, height);
  }
  drawStickers(ctx, input.stickers, scaleX, scaleY);
  drawTexts(ctx, input.texts, width, height, sizeScale);
  drawStrokes(ctx, input.strokes, scaleX, scaleY, sizeScale);
}

export function hasExportableEdits(input: ExportEditedMediaInput): boolean {
  if (input.stickers.length > 0 || input.strokes.length > 0) return true;
  if (input.texts.some((t) => t.text.trim() && t.text.trim() !== "Tap to type")) return true;
  if (!input.filterBaked && input.filterId !== "none") return true;
  if (input.arId && !input.filterBaked) return true;
  return false;
}

export async function exportEditedImage(input: ExportEditedMediaInput): Promise<Blob> {
  const img = await loadImageFromBlob(input.blob);
  const w = img.naturalWidth || input.displayWidth;
  const h = img.naturalHeight || input.displayHeight;
  const scaleX = w / input.displayWidth;
  const scaleY = h / input.displayHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const cssF = filterCss(input.filterId);
  if (!input.filterBaked && cssF !== "none") {
    ctx.filter = cssF;
  }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";

  drawAllOverlays(ctx, input, w, h, scaleX, scaleY);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

export async function exportEditedVideo(input: ExportEditedMediaInput): Promise<Blob> {
  const url = URL.createObjectURL(input.blob);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Failed to load video"));
  });

  const w = video.videoWidth || 720;
  const h = video.videoHeight || 1280;
  const scaleX = w / input.displayWidth;
  const scaleY = h / input.displayHeight;
  const cssF = filterCss(input.filterId);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  await new Promise<void>((resolve, reject) => {
    recorder.onstop = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    recorder.onerror = () => reject(new Error("Video export failed"));

    const paint = () => {
      ctx.filter = cssF === "none" ? "none" : cssF;
      ctx.drawImage(video, 0, 0, w, h);
      ctx.filter = "none";
      drawAllOverlays(ctx, input, w, h, scaleX, scaleY);
    };

    recorder.start(100);
    video.play().catch(reject);

    const tick = () => {
      if (video.ended) {
        paint();
        recorder.stop();
        return;
      }
      paint();
      requestAnimationFrame(tick);
    };

    video.onended = () => {
      paint();
      if (recorder.state === "recording") recorder.stop();
    };

    requestAnimationFrame(tick);
  });

  const out = new Blob(chunks, { type: mime });
  if (out.size === 0) {
    return input.blob;
  }
  return out;
}

/** Returns a blob with stickers, text, draw, and filter baked in (WYSIWYG). */
export async function exportEditedMedia(input: ExportEditedMediaInput): Promise<Blob> {
  if (!hasExportableEdits(input)) {
    return input.blob;
  }

  if (input.mediaType === "image") {
    return exportEditedImage(input);
  }

  return exportEditedVideo(input);
}
