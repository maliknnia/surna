import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { withOwnerProfileAvatar } from "@/lib/ownerAvatar";
import type { User } from "@shared/schema";

/** Don't block the whole app if auth check hangs (common on slow phone tunnels). */
const AUTH_BOOT_TIMEOUT_MS = 12_000;

function isPhoneOnlyEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  return email.endsWith("@phone.surna.local");
}

export function useAuth() {
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setBootTimedOut(true), AUTH_BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, []);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const resolvedUser = withOwnerProfileAvatar(user) ?? undefined;
  const isEmailVerified =
    !resolvedUser?.email ||
    isPhoneOnlyEmail(resolvedUser.email) ||
    Boolean(resolvedUser.emailVerified);

  const authStillBooting = isLoading && !bootTimedOut;

  return {
    user: authStillBooting ? undefined : resolvedUser,
    isLoading: authStillBooting,
    isAuthenticated: !!resolvedUser,
    isEmailVerified,
    needsEmailVerification: !!resolvedUser && !isEmailVerified,
  };
}
