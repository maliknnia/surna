import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNativePlatform } from "./platform";

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function pickFileViaInput(accept: string, capture?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    if (capture) input.setAttribute("capture", capture);
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      document.body.removeChild(input);
      resolve(file);
    };
    input.oncancel = () => {
      document.body.removeChild(input);
      resolve(null);
    };
    input.click();
  });
}

/** Capture or pick a photo — Capacitor Camera on native, file input on web */
export async function capturePhoto(options?: {
  source?: "camera" | "gallery";
}): Promise<File | null> {
  if (isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: options?.source === "gallery" ? CameraSource.Photos : CameraSource.Camera,
      });
      if (!photo.dataUrl) return null;
      const ext = photo.format === "png" ? "png" : "jpg";
      return dataUrlToFile(photo.dataUrl, `surna-${Date.now()}.${ext}`);
    } catch {
      return null;
    }
  }
  return pickFileViaInput(
    "image/*",
    options?.source === "gallery" ? undefined : "environment",
  );
}

/** Pick photo or video from gallery */
export async function pickMediaFromGallery(accept = "image/*,video/*"): Promise<File | null> {
  if (isNativePlatform() && accept.startsWith("image")) {
    return capturePhoto({ source: "gallery" });
  }
  return pickFileViaInput(accept);
}
