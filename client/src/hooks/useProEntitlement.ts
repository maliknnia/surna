import { useQuery } from "@tanstack/react-query";

export type ProEntitlementResponse = {
  plan: string;
  active: boolean;
  openAccess?: boolean;
  maxTeams?: number;
  features?: Record<string, unknown>;
};

export function isProEntitlementActive(data?: ProEntitlementResponse | null): boolean {
  if (!data) return false;
  return !!(data.active || data.openAccess);
}

export function useProEntitlement() {
  return useQuery<ProEntitlementResponse & { unauthorized?: boolean }>({
    queryKey: ["/api/pro/user/entitlement"],
    queryFn: async () => {
      const r = await fetch("/api/pro/user/entitlement", { credentials: "include" });
      if (r.status === 401) {
        return {
          plan: "free",
          active: false,
          unauthorized: true,
        };
      }
      if (!r.ok) throw new Error(await r.text());
      const json = await r.json();
      return {
        ...json,
        active: !!(json.active || json.openAccess),
      };
    },
    staleTime: 60_000,
    retry: 1,
  });
}

export async function activateProSubscription(sessionId: string): Promise<ProEntitlementResponse> {
  const r = await fetch("/api/pro/user/entitlement/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ sessionId }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || "Could not activate Pro");
  }
  return r.json();
}

export function invalidateProEntitlement(queryClient: { invalidateQueries: (opts: { queryKey: string[] }) => void }) {
  queryClient.invalidateQueries({ queryKey: ["/api/pro/user/entitlement"] });
}
