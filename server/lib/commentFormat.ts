/** Normalized comment JSON for feed + CommentsSheet. */
export type ApiComment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId: string | null;
  createdAt: string | Date;
  likesCount: number;
  author: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    displayName?: string | null;
    email?: string | null;
    profileImageUrl?: string | null;
  };
  authorName?: string;
  authorUsername?: string | null;
  authorAvatar?: string | null;
};

type AuthorRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  profileImageUrl?: string | null;
};

type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string | null;
  createdAt?: string | Date | null;
};

export function formatApiComment(comment: CommentRow, author: AuthorRow): ApiComment {
  const displayName =
    author.displayName?.trim() ||
    [author.firstName, author.lastName].filter(Boolean).join(" ").trim() ||
    author.username ||
    author.email ||
    "User";

  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    content: comment.content,
    parentId: comment.parentId ?? null,
    createdAt: comment.createdAt ?? new Date(),
    likesCount: 0,
    author: {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      username: author.username,
      displayName: author.displayName,
      email: author.email,
      profileImageUrl: author.profileImageUrl,
    },
    authorName: displayName,
    authorUsername: author.username,
    authorAvatar: author.profileImageUrl,
  };
}

export function formatApiCommentFromJoin(row: {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentId?: string | null;
  createdAt?: string | Date | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
}): ApiComment {
  const name = row.authorName?.trim() || row.authorUsername || "User";
  const parts = name.split(/\s+/);
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    content: row.content,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt ?? new Date(),
    likesCount: 0,
    author: {
      id: row.authorId,
      firstName: parts[0] ?? null,
      lastName: parts.slice(1).join(" ") || null,
      username: row.authorUsername,
      displayName: name,
      email: row.authorUsername,
      profileImageUrl: row.authorAvatar,
    },
    authorName: name,
    authorUsername: row.authorUsername,
    authorAvatar: row.authorAvatar,
  };
}
