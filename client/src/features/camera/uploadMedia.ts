import { apiFormRequest, apiRequest } from "@/lib/queryClient";

export async function uploadMediaBlob(blob: Blob, filename: string): Promise<{ url: string; mediaId?: string }> {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
  const formData = new FormData();
  formData.append("files", file);

  const res = await apiFormRequest("POST", "/api/media/upload-multiple", formData);
  const data = await res.json();
  const job = data.jobs?.[0];
  return {
    url: job?.url ?? URL.createObjectURL(blob),
    mediaId: job?.mediaId ?? job?.jobId,
  };
}

export async function postToFeed(payload: {
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: string;
  location?: string;
  sport?: string;
}) {
  const res = await apiRequest("POST", "/api/posts", {
    content: payload.content,
    postType: payload.videoUrl ? "video" : payload.imageUrl ? "image" : "text",
    imageUrl: payload.imageUrl ?? null,
    videoUrl: payload.videoUrl ?? null,
    mediaType: payload.mediaType ?? "image",
    location: payload.location ?? "",
    sport: payload.sport ?? null,
  });
  return res.json();
}

export async function postStory(mediaUrl: string, mediaType: "image" | "video", caption = "") {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  const res = await apiRequest("POST", "/api/stories", {
    mediaUrl,
    mediaType,
    caption,
    visibility: "public",
    expiresAt: expiresAt.toISOString(),
  });
  return res.json();
}
