import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { invalidateFeedQueries } from "@/lib/postActions";
import {
  publishChatMedia,
  publishFeedPost,
  publishStoryPost,
} from "@/features/camera/cameraPublishApi";
import type { CameraMode } from "@/features/camera/constants";

export function useCameraPublish() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const afterPublish = useCallback(() => {
    invalidateFeedQueries(queryClient, user?.id);
    queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  }, [queryClient, user?.id]);

  const publishFeed = useCallback(
    async (params: {
      blob: Blob;
      mediaType: "image" | "video";
      caption?: string;
      sport?: string;
      location?: string;
      mode?: CameraMode;
      durationSec?: number;
    }) => {
      const videoFormat = params.mode === "reel" ? "reel" : "video";
      await publishFeedPost({
        ...params,
        videoFormat: params.mediaType === "video" ? videoFormat : undefined,
      });
      afterPublish();
    },
    [afterPublish],
  );

  const publishStory = useCallback(
    async (blob: Blob, mediaType: "image" | "video", caption = "") => {
      await publishStoryPost(blob, mediaType, caption);
      afterPublish();
    },
    [afterPublish],
  );

  const publishChat = useCallback(
    async (params: {
      blob: Blob;
      mediaType: "image" | "video";
      conversationId: string;
    }) => {
      return publishChatMedia(params);
    },
    [],
  );

  return { publishFeed, publishStory, publishChat, afterPublish };
}
