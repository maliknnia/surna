import { useState } from "react";
import { Phone, Video, BellOff, Search, ChevronRight } from "lucide-react";

interface ConversationSettingsProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  avatarUrl?: string;
  disappearingEnabled: boolean;
  onToggleDisappearing: (enabled: boolean) => void;
}

export default function ConversationSettings({
  open,
  onClose,
  displayName,
  avatarUrl,
  disappearingEnabled,
  onToggleDisappearing,
}: ConversationSettingsProps) {
  const [privacyEnabled, setPrivacyEnabled] = useState(false);
  if (!open) return null;

  const actionIcons = [
    { icon: Phone, label: "Voice" },
    { icon: Video, label: "Video" },
    { icon: BellOff, label: "Mute" },
    { icon: Search, label: "Search" },
  ];

  const row = (label: string, trailing?: any, danger?: boolean) => (
    <button
      key={label}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 2px",
        border: "none",
        background: "transparent",
        color: danger ? "#ff453a" : "white",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      {trailing || <ChevronRight size={16} color="rgba(255,255,255,0.4)" />}
    </button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", background: "#121212", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "12px 16px 24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: 44, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.22)", margin: "0 auto 12px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
            alt={displayName}
            style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 8 }}
          />
          <div style={{ color: "white", fontWeight: 700 }}>{displayName}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          {actionIcons.map((a) => (
            <button key={a.label} style={{ border: "none", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 6px", color: "white" }}>
              <a.icon size={18} />
              <div style={{ fontSize: 11, marginTop: 4 }}>{a.label}</div>
            </button>
          ))}
        </div>

        {row("Theme")}
        {row(
          "Disappearing messages (24h)",
          <input
            type="checkbox"
            checked={disappearingEnabled}
            onChange={(e) => onToggleDisappearing(e.target.checked)}
          />
        )}
        {row("Nicknames")}
        {row(
          "Privacy settings",
          <input type="checkbox" checked={privacyEnabled} onChange={(e) => setPrivacyEnabled(e.target.checked)} />
        )}
        {row("Block user", undefined, true)}
        {row("Report", undefined, true)}
      </div>
    </div>
  );
}
