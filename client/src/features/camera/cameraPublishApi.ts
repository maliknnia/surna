import { apiRequest } from "@/lib/queryClient";
import { uploadCreateFile } from "@/lib/uploadCreateMedia";
import { uploadVideoPost } from "@/lib/videoUpload";

export function blobToCaptureFile(blob: Blob, mediaType: "image" | "video") {
  const isVideo = mediaType === "video";
  const ext = isVideo ? (blob.type.includes("webm") ? "webm" : "mp4") : "jpg";
  const mime = blob.type || (isVideo ? "video/webm" : "image/jpeg");
  return new File([blob], `capture.${ext}`, { type: mime });
}

export async function publishFeedPost(params: {
  blob: Blob;
  mediaType: "image" | "video";
  caption?: string;
  sport?: string;
  location?: string;
  videoFormat?: "reel" | "video";
  durationSec?: number;
}) {
  const caption = params.caption?.trim() ?? "";

  if (params.mediaType === "video") {
    const file = blobToCaptureFile(params.blob, "video");
    return uploadVideoPost({
      file,
      content: caption || " ",
      sport: params.sport,
      location: params.location,
      videoFormat: params.videoFormat ?? "video",
      durationSec: params.durationSec,
    });
  }

  const file = blobToCaptureFile(params.blob, "image");
  const { publicUrl } = await uploadCreateFile(file);
  const res = await apiRequest("POST", "/api/posts", {
    content: caption,
    postType: "image",
    imageUrl: publicUrl,
    videoUrl: null,
    mediaType: "image",
    location: params.location ?? "",
    sport: params.sport ?? null,
  });
  return res.json();
}

export async function publishStoryPost(
  blob: Blob,
  mediaType: "image" | "video",
  caption = "",
) {
  const file = blobToCaptureFile(blob, mediaType);
  const { publicUrl } = await uploadCreateFile(file);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  const res = await apiRequest("POST", "/api/stories", {
    mediaUrl: publicUrl,
    mediaType,
    caption,
    visibility: "public",
    expiresAt: expiresAt.toISOString(),
  });
  return res.json();
}

export async function publishChatMedia(params: {
  blob: Blob;
  mediaType: "image" | "video";
  conversationId: string;
}) {
  const file = blobToCaptureFile(params.blob, params.mediaType);
  const { publicUrl, mediaId } = await uploadCreateFile(file);
  if (mediaId) {
    await apiRequest("POST", "/api/messenger/dm/messages", {
      conversationId: params.conversationId,
      mediaId,
    });
  } else {
    await apiRequest("POST", "/api/messenger/dm/messages", {
      conversationId: params.conversationId,
      body: publicUrl,
    });
  }
  return { url: publicUrl, mediaId, type: params.mediaType };
}

export async function publishGifToChat(conversationId: string, gifUrl: string) {
  await apiRequest("POST", "/api/messenger/dm/messages", {
    conversationId,
    body: gifUrl,
  });
}
