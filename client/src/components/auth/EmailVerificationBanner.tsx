import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiOrigin } from "@/lib/loginUrls";
import { cn } from "@/lib/utils";

function isPhoneOnlyEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return true;
  return email.endsWith("@phone.surna.local");
}

export function EmailVerificationBanner({ className }: { className?: string }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const needsVerification =
    isAuthenticated &&
    user &&
    !user.emailVerified &&
    !isPhoneOnlyEmail(user.email) &&
    Boolean(user.email?.trim());

  const verifyMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const res = await fetch(`${apiOrigin()}/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Verification failed");
      return data;
    },
    onSuccess: () => {
      setError(null);
      setCode("");
      setExpanded(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiOrigin()}/api/auth/email/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Could not resend code");
      return data as { devCode?: string; message?: string };
    },
    onSuccess: (data) => {
      setError(null);
      if (data.devCode) setDevHint(data.devCode);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!needsVerification || dismissed) return null;

  return (
    <div
      className={cn(
        "sticky top-0 z-[60] border-b px-4 py-3",
        className,
      )}
      style={{
        background: "var(--surna-surface)",
        borderColor: "var(--surna-border)",
        color: "var(--surna-text)",
      }}
      role="status"
    >
      <div className="max-w-lg mx-auto flex items-start gap-3">
        <Mail className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--surna-ios-purple, #803FE1)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug">Verify your email to unlock SURNA</p>
          <p className="text-[12px] mt-0.5 opacity-70">
            Post, join games, and message others after you confirm{" "}
            <span className="font-medium">{user?.email}</span>.
          </p>

          {expanded ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full h-10 px-3 rounded-xl text-[15px] tracking-[0.3em] text-center border-none focus:outline-none"
                style={{ background: "var(--surna-elevated)", color: "var(--surna-text)" }}
              />
              {devHint && (
                <p className="text-[11px] opacity-60">Dev code: {devHint}</p>
              )}
              {error && <p className="text-[12px] text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={code.length !== 6 || verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate(code)}
                  className="flex-1 h-9 rounded-full text-[12px] font-bold active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Verify"
                  )}
                </button>
                <button
                  type="button"
                  disabled={resendMutation.isPending}
                  onClick={() => resendMutation.mutate()}
                  className="px-4 h-9 rounded-full text-[12px] font-semibold active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--surna-elevated)", color: "var(--surna-text-secondary)" }}
                >
                  {resendMutation.isPending ? "…" : "Resend"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                if (!devHint) resendMutation.mutate();
              }}
              className="mt-2 text-[12px] font-semibold underline underline-offset-2 active:opacity-70"
              style={{ color: "var(--surna-ios-purple, #803FE1)" }}
            >
              Enter verification code
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full shrink-0 active:opacity-70"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4 opacity-50" />
        </button>
      </div>
    </div>
  );
}

export default EmailVerificationBanner;
