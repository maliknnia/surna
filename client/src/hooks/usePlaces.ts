import { useQuery } from "@tanstack/react-query";
import type { Place } from "@shared/schema";
import { demoPlaceToApiRow, getDemoPlace, isDemoPlaceId, normalizeDemoPlaceId } from "@/lib/demoPlaces";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export function usePlace(id?: string) {
  const normalizedId = id ? normalizeDemoPlaceId(id) : undefined;

  return useQuery<Place & { isDemo?: boolean }>({
    queryKey: ["place", normalizedId],
    queryFn: async () => {
      if (!normalizedId) throw new Error("Missing place id");
      if (isDemoPlaceId(normalizedId)) {
        const demo = getDemoPlace(normalizedId);
        if (!demo) throw new Error("Place not found");
        return demoPlaceToApiRow(demo);
      }
      return getJSON(`/api/places/${normalizedId}`);
    },
    enabled: !!normalizedId,
    retry: (failureCount, _error) => {
      if (normalizedId && isDemoPlaceId(normalizedId)) return false;
      return failureCount < 2;
    },
  });
}
