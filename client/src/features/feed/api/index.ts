/**
 * Feed Feature API
 * 
 * All feed-related API calls centralized here.
 */

import { apiRequest } from '@/lib/queryClient';
import type { PostWithAuthor } from '@shared/schema';

export interface FeedResponse {
  items: PostWithAuthor[];
  nextCursor: string | null;
  totalCount?: number;
}

export const feedApi = {
  getPosts: async (cursor?: string): Promise<FeedResponse> => {
    const params = cursor ? `?cursor=${cursor}` : '';
    const response = await fetch(`/api/feed${params}`);
    return response.json();
  },

  likePost: async (postId: string) => {
    return apiRequest('POST', `/api/posts/${postId}/like`);
  },

  unlikePost: async (postId: string) => {
    return apiRequest('POST', `/api/posts/${postId}/unlike`);
  },

  createPost: async (data: { content: string; imageUrl?: string; videoUrl?: string; sport?: string; location?: string }) => {
    return apiRequest('POST', '/api/posts', data);
  },

  updatePost: async (postId: string, data: { content?: string; sport?: string | null; location?: string | null }) => {
    return apiRequest('PATCH', `/api/posts/${postId}`, data);
  },

  deletePost: async (postId: string) => {
    return apiRequest('DELETE', `/api/posts/${postId}`);
  },
};
