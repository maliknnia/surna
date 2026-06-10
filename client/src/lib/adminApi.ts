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

export async function fetchAdminUsers(params: {
  query?: string;
  limit: number;
  offset: number;
}): Promise<{ users: AdminUserRow[]; total: number }> {
  const search = new URLSearchParams();
  if (params.query?.trim()) search.set("query", params.query.trim());
  search.set("limit", String(params.limit));
  search.set("offset", String(params.offset));

  const rows = await fetchJson<Record<string, unknown>[]>(
    `/api/admin/users?${search.toString()}`,
  );

  const users = (Array.isArray(rows) ? rows : []).map((row) => {
    const firstName = String(row.firstName ?? row.first_name ?? "");
    const lastName = String(row.lastName ?? row.last_name ?? "");
    const email = (row.email as string | null) ?? null;
    const status = String(row.status ?? "active");
    return {
      id: String(row.id),
      username:
        (row.username as string | null) ||
        [firstName, lastName].filter(Boolean).join(" ") ||
        email ||
        "User",
      email,
      verified: status === "verified",
      banned: status === "banned" || status === "suspended",
      bannedReason: null,
      createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
    };
  });

  return { users, total: users.length };
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
