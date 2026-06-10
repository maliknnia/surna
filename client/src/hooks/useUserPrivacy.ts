import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mergeUserPrivacy, type UserPrivacySettings } from "@shared/userPrivacy";
import { apiRequest } from "@/lib/queryClient";

const QUERY_KEY = ["/api/user/privacy"];

export function useUserPrivacy(enabled = true) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery<UserPrivacySettings>({
    queryKey: QUERY_KEY,
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/user/privacy", { credentials: "include" });
      if (!res.ok) return mergeUserPrivacy(null);
      return mergeUserPrivacy(await res.json());
    },
    staleTime: 30_000,
  });

  const settings = data ?? mergeUserPrivacy(null);

  const patch = useCallback(
    async (partial: Partial<UserPrivacySettings>) => {
      const next = mergeUserPrivacy({ ...settings, ...partial });
      queryClient.setQueryData(QUERY_KEY, next);
      await apiRequest("PATCH", "/api/user/privacy", partial);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setSavedFlash(true);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
    },
    [queryClient, settings],
  );

  return { settings, isLoading, patch, savedFlash };
}
