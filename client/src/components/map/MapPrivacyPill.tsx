import { EyeOff, Users, Globe } from "lucide-react";
import type { MapLocationAudience } from "@shared/mapSettings";

type PrivacyMode = "ghost" | "friends" | "everyone";

function resolveMode(ghostMode: boolean, audience: MapLocationAudience): PrivacyMode {
  if (ghostMode || audience === "nobody") return "ghost";
  if (audience === "everyone") return "everyone";
  return "friends";
}

const MODES: { id: PrivacyMode; label: string; icon: typeof EyeOff }[] = [
  { id: "ghost", label: "Ghost", icon: EyeOff },
  { id: "friends", label: "Friends", icon: Users },
  { id: "everyone", label: "Everyone", icon: Globe },
];

type MapPrivacyPillProps = {
  ghostMode: boolean;
  locationAudience: MapLocationAudience;
  onChange: (patch: { ghostMode: boolean; locationAudience: MapLocationAudience }) => void;
  surfaceBg: string;
  surfaceBorder: string;
  textPrimary: string;
};

export function MapPrivacyPill({
  ghostMode,
  locationAudience,
  onChange,
  surfaceBg,
  surfaceBorder,
  textPrimary,
}: MapPrivacyPillProps) {
  const current = resolveMode(ghostMode, locationAudience);
  const idx = MODES.findIndex((m) => m.id === current);
  const active = MODES[idx >= 0 ? idx : 0];
  const Icon = active.icon;

  const cycle = () => {
    const next = MODES[(idx + 1) % MODES.length];
    if (next.id === "ghost") {
      onChange({ ghostMode: true, locationAudience: "nobody" });
    } else if (next.id === "friends") {
      onChange({ ghostMode: false, locationAudience: "friends" });
    } else {
      onChange({ ghostMode: false, locationAudience: "everyone" });
    }
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform backdrop-blur-xl"
      style={{
        background: surfaceBg,
        border: surfaceBorder,
        color: textPrimary,
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      }}
      data-testid="map-privacy-pill"
      aria-label={`Location sharing: ${active.label}. Tap to change.`}
    >
      <Icon size={14} strokeWidth={2.25} />
      {active.label}
    </button>
  );
}
