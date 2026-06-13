import { useEffect, useMemo, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Mail, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import SurnaLogo from "@/components/SurnaLogo";
import SignupPathChooser from "@/components/SignupPathChooser";
import { apiOrigin, devQuickLoginUrl, googleLoginUrl } from "@/lib/loginUrls";

type Mode = "google" | "email" | "phone";
type AuthFlow = "signin" | "signup" | "path";

type LoginScreenProps = {
  compact?: boolean;
  nextPath?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  defaultAuthFlow?: AuthFlow;
};

export default function LoginScreen({
  compact = false,
  nextPath = "/",
  title = "Welcome to SURNA",
  subtitle = "Sign in to connect with athletes, teams, and events near you.",
  className,
  defaultAuthFlow = "signin",
}: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("google");
  const [authFlow, setAuthFlow] = useState<AuthFlow>(defaultAuthFlow);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "code">("number");
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(true);
  const [devQuickLogin, setDevQuickLogin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${apiOrigin()}/api/auth/providers`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const google = data.google !== false;
        const dev = data.devQuickLogin === true;
        setGoogleAvailable(google);
        setDevQuickLogin(dev);
        if (!google && mode === "google") {
          setMode(dev ? "phone" : "email");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { id: "google" as const, label: "Google", icon: FcGoogle },
      { id: "email" as const, label: "Email", icon: Mail },
      { id: "phone" as const, label: "Phone", icon: Phone },
    ],
    [],
  );

  const finishLogin = () => {
    window.location.href = nextPath.startsWith("/") ? nextPath : "/";
  };

  const handleGoogle = () => {
    if (!googleAvailable) {
      setError("Google sign-in is not set up on this server. Use phone, email, or dev sign-in.");
      return;
    }
    window.location.href = googleLoginUrl(nextPath);
  };

  const handleDevQuickLogin = () => {
    window.location.href = devQuickLoginUrl(nextPath);
  };

  const handleEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      if (authFlow === "signup") {
        const res = await fetch(`${apiOrigin()}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, firstName, lastName, next: nextPath }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.message || "Could not create account");
          return;
        }
        setAuthFlow("path");
        return;
      }

      const res = await fetch(`${apiOrigin()}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, next: nextPath }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not sign in");
        return;
      }
      const redirect = typeof data.redirect === "string" ? data.redirect : nextPath;
      window.location.href = redirect.startsWith("/") ? redirect : "/";
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneRequest = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiOrigin()}/api/auth/sign-in/phone/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not send code");
        return;
      }
      setPhoneStep("code");
      setDevCodeHint(typeof data.devCode === "string" ? data.devCode : null);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiOrigin()}/api/auth/sign-in/phone/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Invalid code");
        return;
      }
      finishLogin();
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  };

  if (authFlow === "path") {
    return (
      <SignupPathChooser
        onComplete={(profileType) => {
          if (profileType === "normal") {
            window.location.href = nextPath.startsWith("/") ? nextPath : "/";
          } else {
            window.location.href = "/profile/edit";
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto",
        compact ? "px-0" : "px-4",
        className,
      )}
      data-testid="login-page"
    >
      {!compact && (
        <div className="flex justify-center mb-8">
          <SurnaLogo className="h-9 w-auto" showText />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center">
          <h1 className="text-xl font-bold text-foreground">
            {authFlow === "signup" ? "Create your SURNA account" : title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {authFlow === "signup"
              ? "Enter your details, then choose Quick Start or a Professional Profile."
              : subtitle}
          </p>
        </div>

        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setError(null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-colors",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {tab.id === "google" ? <Icon className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          {mode === "google" && (
            <>
              <Button
                type="button"
                data-testid="button-login-google"
                onClick={handleGoogle}
                disabled={!googleAvailable}
                className="w-full h-11 bg-white text-black hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
              >
                <FcGoogle className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
              <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                {googleAvailable
                  ? "Sign in with your Google account."
                  : "Google is not configured here. Try Phone or Email, or use quick dev sign-in below."}
              </p>
            </>
          )}

          {mode === "email" && (
            <>
              {authFlow === "signup" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              )}
              <Input
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-login-email"
              />
              <Input
                type="password"
                autoComplete={authFlow === "signup" ? "new-password" : "current-password"}
                placeholder={authFlow === "signup" ? "Create password (min 8 characters)" : "Password (min 8 characters)"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
              />
              <Button
                type="button"
                data-testid="button-login-email"
                disabled={loading || !email || password.length < 8}
                onClick={handleEmail}
                className="w-full h-11"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : authFlow === "signup" ? "Create account" : "Continue with email"}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-muted-foreground underline"
                onClick={() => {
                  setAuthFlow(authFlow === "signup" ? "signin" : "signup");
                  setError(null);
                }}
              >
                {authFlow === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </>
          )}

          {mode === "phone" && (
            <>
              {phoneStep === "number" ? (
                <>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="input-login-phone"
                  />
                  <Button
                    type="button"
                    data-testid="button-login-phone-send"
                    disabled={loading || phone.replace(/\D/g, "").length < 8}
                    onClick={handlePhoneRequest}
                    className="w-full h-11"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}
                  </Button>
                  {devQuickLogin && (
                    <p className="text-[11px] text-center text-muted-foreground">
                      Local dev: after sending, use code <strong className="text-foreground">123456</strong> unless shown otherwise.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground text-center">
                    Code sent to {phone}
                    {devCodeHint ? (
                      <>
                        {" "}
                        · Dev code: <strong className="text-foreground">{devCodeHint}</strong>
                      </>
                    ) : null}
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    data-testid="input-login-phone-code"
                  />
                  <Button
                    type="button"
                    data-testid="button-login-phone-verify"
                    disabled={loading || code.trim().length < 4}
                    onClick={handlePhoneVerify}
                    className="w-full h-11"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground underline"
                    onClick={() => {
                      setPhoneStep("number");
                      setCode("");
                      setDevCodeHint(null);
                    }}
                  >
                    Use a different number
                  </button>
                </>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center" role="alert">
              {error}
            </p>
          )}

          {devQuickLogin && (
            <Button
              type="button"
              variant="outline"
              data-testid="button-login-dev"
              onClick={handleDevQuickLogin}
              className="w-full h-11 border-dashed"
            >
              Quick dev sign-in
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
