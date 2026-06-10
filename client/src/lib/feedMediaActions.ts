import { apiRequest } from "@/lib/queryClient";

/** Demo / seed ids — skip API, still show UX feedback */
export function isDemoMediaId(id: string): boolean {
  return (
    id.startsWith("dv") ||
    id.startsWith("fv") ||
    id.startsWith("fp") ||
    id.startsWith("demo-")
  );
}

export async function togglePostLike(postId: string, currentlyLiked: boolean): Promise<void> {
  if (isDemoMediaId(postId)) return;
  if (currentlyLiked) {
    await apiRequest("POST", `/api/posts/${postId}/unlike`);
  } else {
    await apiRequest("POST", `/api/posts/${postId}/like`);
  }
}

export async function togglePostSave(postId: string, currentlySaved: boolean): Promise<void> {
  if (isDemoMediaId(postId)) return;
  if (currentlySaved) {
    await apiRequest("DELETE", `/api/posts/${postId}/save`);
  } else {
    await apiRequest("POST", `/api/posts/${postId}/save`);
  }
}

export type ContentReportInput = {
  contentType: string;
  contentId: string;
  reason: string;
  description?: string;
  reportedUserId?: string;
};

export async function submitContentReport(input: ContentReportInput): Promise<void> {
  if (isDemoMediaId(input.contentId)) return;
  await apiRequest("POST", "/api/content/report", input);
}

/** Hide creator locally until a dedicated block API exists */
export function hideCreatorInSession(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  const key = "surna_hidden_creators";
  const prev = JSON.parse(sessionStorage.getItem(key) || "[]") as string[];
  if (!prev.includes(userId)) {
    sessionStorage.setItem(key, JSON.stringify([...prev, userId]));
  }
}
