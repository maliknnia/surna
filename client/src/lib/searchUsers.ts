/** Authenticated user search — uses GET /api/search (not /api/users/search). */
export async function searchUsers<T = Record<string, unknown>>(query: string, limit = 20): Promise<T[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(q)}&type=users&limit=${limit}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return (data.users ?? []) as T[];
}
