async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export type AdminUserRow = {
  id: string;
  username: string | null;
  email: string | null;
  verified: boolean;
  banned: boolean;
  bannedReason: string | null;
  createdAt: string;
};

type AdminUsersResponse = {
  users: Array<Record<string, unknown>>;
  total: number;
};

export async function fetchAdminUsers(params: {
  query?: string;
  limit: number;
  offset: number;
}): Promise<{ users: AdminUserRow[]; total: number }> {
  const search = new URLSearchParams();
  if (params.query?.trim()) search.set("q", params.query.trim());
  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));

  const data = await fetchJson<AdminUsersResponse>(`/api/admin/users?${search.toString()}`);
  const rows = Array.isArray(data.users) ? data.users : [];

  const users: AdminUserRow[] = rows.map((row) => ({
    id: String(row.id),
    username:
      (row.username as string | null) ||
      (row.displayName as string | null) ||
      (row.email as string | null) ||
      "User",
    email: (row.email as string | null) ?? null,
    verified: Boolean(row.verified),
    banned: Boolean(row.banned),
    bannedReason: (row.bannedReason as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  }));

  return { users, total: typeof data.total === "number" ? data.total : users.length };
}

export type FlaggedContentItem = {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description?: string | null;
  status: string;
  priority?: string;
  createdAt: string;
  reporterName?: string;
  reportedUserName?: string;
};

export async function fetchFlaggedContent() {
  return fetchJson<FlaggedContentItem[]>("/api/admin/flagged-content");
}
