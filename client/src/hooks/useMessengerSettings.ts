import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type MessengerSettings = {
  user_id: string;
  allow_message_requests: boolean;
  call_permission: "everyone" | "following" | "none";
  read_receipts: boolean;
};

export function useMessengerSettings(enabled = true) {
  return useQuery<MessengerSettings>({
    queryKey: ["/api/messenger/settings/me"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/messenger/settings/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load messenger settings");
      return res.json();
    },
  });
}

export function useUpdateMessengerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<MessengerSettings, "allow_message_requests" | "call_permission" | "read_receipts">>) => {
      const res = await apiRequest("PATCH", "/api/messenger/settings/me", patch);
      return res.json() as Promise<MessengerSettings>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/messenger/settings/me"] });
    },
  });
}
