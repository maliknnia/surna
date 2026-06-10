import React from "react";
import { useAuth } from "@/hooks/useAuth";
import LoginScreen from "@/components/auth/LoginScreen";

export default function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const nextPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 rounded-full mx-auto mb-4 border-2 border-muted border-t-foreground" />
          <p className="text-token-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
        <LoginScreen
          compact
          nextPath={nextPath}
          title="Sign in to continue"
          subtitle="Use Google, your email, or phone number."
        />
      </div>
    );
  }

  return <Component />;
}