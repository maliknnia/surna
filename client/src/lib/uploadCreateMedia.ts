import { apiFormRequest, apiRequest } from "@/lib/queryClient";

export type UploadedCreateMedia = {
  mediaId?: string;
  publicUrl: string;
  kind?: "image" | "video";
};

type InitResponse = {
  mediaId?: string | null;
  uploadMode?: "multipart" | "presigned";
  uploadEndpoint?: string;
  uploadUrl?: string;
  publicUrl?: string;
  cacheControl?: string;
};

async function uploadViaMultipart(endpoint: string, file: File): Promise<UploadedCreateMedia> {
  const form = new FormData();
  form.append("file", file);
  const uploadRes = await apiFormRequest("POST", endpoint, form);
  const uploaded = (await uploadRes.json()) as { mediaId?: string; publicUrl: string };
  return { mediaId: uploaded.mediaId, publicUrl: uploaded.publicUrl };
}

async function uploadViaPresigned(init: InitResponse, file: File): Promise<UploadedCreateMedia> {
  if (!init.uploadUrl || !init.publicUrl) throw new Error("Upload not configured");

  const putHeaders: Record<string, string> = {
    "Content-Type": file.type || "application/octet-stream",
  };
  if (init.cacheControl) putHeaders["Cache-Control"] = init.cacheControl;

  const putRes = await fetch(init.uploadUrl, {
    method: "PUT",
    headers: putHeaders,
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload to storage failed");

  if (init.mediaId) {
    await apiRequest("POST", "/api/media/complete", { mediaId: init.mediaId });
  }

  return { mediaId: init.mediaId ?? undefined, publicUrl: init.publicUrl };
}

/** Upload a single image through the app media pipeline (Cloudinary or S3). */
export async function uploadCreateImage(file: File): Promise<UploadedCreateMedia> {
  const initRes = await apiRequest("POST", "/api/media/init", {
    kind: "image",
    filename: file.name,
    contentType: file.type || "image/jpeg",
    sizeBytes: file.size,
  });

  const init = (await initRes.json()) as InitResponse;

  if (init.uploadMode === "multipart" && init.uploadEndpoint) {
    return { ...(await uploadViaMultipart(init.uploadEndpoint, file)), kind: "image" };
  }

  return { ...(await uploadViaPresigned(init, file)), kind: "image" };
}

/** Read width/height from a local image file before upload. */
export async function imageDimensionsFromFile(
  file: File,
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not read image dimensions"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload a gallery/profile photo and return dimensions for the API payload. */
export async function uploadGalleryPhoto(
  file: File,
): Promise<UploadedCreateMedia & { width: number; height: number }> {
  const [uploaded, dims] = await Promise.all([
    uploadCreateImage(file),
    imageDimensionsFromFile(file),
  ]);
  return { ...uploaded, ...dims };
}

/** Upload a single file (image or video) through the app media pipeline. */
export async function uploadCreateFile(file: File): Promise<UploadedCreateMedia> {
  const kind = file.type.startsWith("video/") ? "video" : "image";
  const contentType =
    file.type || (kind === "video" ? "video/mp4" : "image/jpeg");

  const initRes = await apiRequest("POST", "/api/media/init", {
    kind,
    filename: file.name,
    contentType,
    sizeBytes: file.size,
  });

  const init = (await initRes.json()) as InitResponse;

  if (init.uploadMode === "multipart" && init.uploadEndpoint) {
    const uploaded = await uploadViaMultipart(init.uploadEndpoint, file);
    return { ...uploaded, kind };
  }

  const uploaded = await uploadViaPresigned(init, file);
  return { ...uploaded, kind };
}
