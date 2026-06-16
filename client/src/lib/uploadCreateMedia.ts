import { apiFormRequest, apiRequest } from "@/lib/queryClient";

export type UploadedCreateMedia = {
  mediaId?: string;
  publicUrl: string;
};

/** Upload a single image through the app media pipeline (session auth). */
export async function uploadCreateImage(file: File): Promise<UploadedCreateMedia> {
  const initRes = await apiRequest("POST", "/api/media/init", {
    kind: "image",
    filename: file.name,
    contentType: file.type || "image/jpeg",
    sizeBytes: file.size,
  });

  const init = (await initRes.json()) as {
    mediaId?: string | null;
    uploadMode?: "multipart" | "presigned";
    uploadEndpoint?: string;
    uploadUrl?: string;
    publicUrl?: string;
    cacheControl?: string;
  };

  if (init.uploadMode === "multipart" && init.uploadEndpoint) {
    const form = new FormData();
    form.append("file", file);
    const uploadRes = await apiFormRequest("POST", init.uploadEndpoint, form);
    const uploaded = (await uploadRes.json()) as { mediaId?: string; publicUrl: string };
    return { mediaId: uploaded.mediaId, publicUrl: uploaded.publicUrl };
  }

  if (!init.uploadUrl || !init.publicUrl) throw new Error("Upload not configured");

  const putHeaders: Record<string, string> = {
    "Content-Type": file.type || "image/jpeg",
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

/** Upload a single file (image or video) through the app media pipeline. */
export async function uploadCreateFile(file: File): Promise<UploadedCreateMedia> {
  if (file.type.startsWith("image/") || !file.type.startsWith("video/")) {
    return uploadCreateImage(file);
  }

  const initRes = await apiRequest("POST", "/api/media/init", {
    kind: "video",
    filename: file.name,
    contentType: file.type || "video/mp4",
    sizeBytes: file.size,
  });

  const init = (await initRes.json()) as {
    mediaId?: string | null;
    uploadUrl?: string;
    publicUrl?: string;
    cacheControl?: string;
  };

  if (!init.uploadUrl || !init.publicUrl) throw new Error("Video upload not configured");

  const putHeaders: Record<string, string> = {
    "Content-Type": file.type || "video/mp4",
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
