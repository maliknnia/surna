import { useMemo } from "react";
import LoginScreen from "@/components/auth/LoginScreen";

export default function Login() {
  const nextPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    return next && next.startsWith("/") ? next : "/";
  }, []);

  const error = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "google_unavailable") {
      return "Google sign-in is not available here. Use Phone (code 123456 in dev), Email if you have an account, or Quick dev sign-in below.";
    }
    if (err === "google_failed") return "Google sign-in failed. Try phone, email, or quick dev sign-in.";
    if (err === "google_no_email") return "Your Google account did not share an email address.";
    return null;
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-10">
      <div className="w-full">
        {error && (
          <p className="max-w-md mx-auto mb-4 px-4 text-sm text-amber-600 dark:text-amber-400 text-center">
            {error}
          </p>
        )}
        <LoginScreen nextPath={nextPath} />
      </div>
    </div>
  );
}
