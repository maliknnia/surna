import { useEffect, useState } from "react";

const COOKIE_CONSENT_KEY = "surna_cookie_consent_v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 2000,
        background: "#12121a",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      }}
      data-testid="cookie-consent-banner"
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "rgba(255,255,255,0.85)" }}>
        We use cookies to improve your SURNA experience, keep you signed in, and understand app usage.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={decline}
          style={{
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: 999,
            background: "transparent",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            fontSize: 12,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            border: "none",
            borderRadius: 999,
            background: "#ffffff",
            color: "#12121a",
            fontWeight: 700,
            fontSize: 12,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
