import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { withOwnerProfileAvatar } from "@/lib/ownerAvatar";
import type { User } from "@shared/schema";

function isPhoneOnlyEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  return email.endsWith("@phone.surna.local");
}

export function useAuth() {
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

  return {
    user: resolvedUser,
    isLoading,
    isAuthenticated: !!resolvedUser,
    isEmailVerified,
    needsEmailVerification: !!resolvedUser && !isEmailVerified,
  };
}
