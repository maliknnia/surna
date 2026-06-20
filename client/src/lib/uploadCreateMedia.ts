import { apiFormRequest, apiRequest } from "@/lib/queryClient";

export type UploadedCreateMedia = {
  mediaId?: string;
  publicUrl: string;
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
    return uploadViaMultipart(init.uploadEndpoint, file);
  }

  return uploadViaPresigned(init, file);
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
    return uploadViaMultipart(init.uploadEndpoint, file);
  }

  return uploadViaPresigned(init, file);
}
