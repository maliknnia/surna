import { useState, useCallback } from "react";
import type { PostWithAuthor } from "@shared/schema";
import {
  filterVideosByMode,
  inferVideoFormat,
} from "@/components/video/FeedVideoViewer";
import type { FeedViewerMode, VideoPost } from "@/components/video/FeedVideoViewer";
import { mapPostToVideoPost } from "@/lib/mapPostToVideoPost";

export type VideoViewerState = {
  videos: VideoPost[];
  startIndex: number;
  mode: FeedViewerMode;
  label: string;
} | null;

type PostLike = PostWithAuthor | Record<string, unknown>;

/** Build a swipe chain for one format (reels or full videos) from a post list. */
export function buildVideoViewerState(
  targetPost: PostLike,
  allPosts: PostLike[],
  labelOverride?: string,
): NonNullable<VideoViewerState> {
  const videoPost = mapPostToVideoPost(targetPost);
  const format = inferVideoFormat(videoPost);
  const mode: FeedViewerMode = format === "video" ? "videos" : "reels";
  const feedVideos = allPosts
    .filter((p) => !!(p as { videoUrl?: string | null }).videoUrl)
    .map((p) => mapPostToVideoPost(p));
  const chain = feedVideos.length > 0 ? filterVideosByMode(feedVideos, mode) : [videoPost];
  const startIndex = chain.findIndex((v) => v.id === videoPost.id);
  const sport = (targetPost as { sport?: string }).sport;
  return {
    videos: chain,
    startIndex: startIndex >= 0 ? startIndex : 0,
    mode,
    label: labelOverride ?? sport ?? (mode === "videos" ? "Videos" : "Reels"),
  };
}

/** Shared open/close state for FeedVideoViewer — feed, profile, deep links. */
export function useVideoViewer() {
  const [videoViewer, setVideoViewer] = useState<VideoViewerState>(null);

  const openFromPost = useCallback((post: PostLike, allPosts: PostLike[], labelOverride?: string) => {
    setVideoViewer(buildVideoViewerState(post, allPosts, labelOverride));
  }, []);

  const openFromGrid = useCallback(
    (videos: VideoPost[], startIndex: number, mode: FeedViewerMode, label: string) => {
      setVideoViewer({ videos, startIndex, mode, label });
    },
    [],
  );

  const close = useCallback(() => setVideoViewer(null), []);

  return { videoViewer, openFromPost, openFromGrid, close };
}
