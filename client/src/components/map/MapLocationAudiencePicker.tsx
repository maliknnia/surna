import { cn } from "@/lib/utils";
import {
  LOCATION_AUDIENCE_LABELS,
  type LocationAudience,
} from "@shared/locationSharing";
import { EyeOff, Users, Heart, Globe, UserCheck } from "lucide-react";

const AUDIENCE_OPTIONS: {
  id: LocationAudience;
  icon: typeof Users;
  short: string;
}[] = [
  { id: "ghost", icon: EyeOff, short: "Off" },
  { id: "friends", icon: Users, short: "Friends" },
  { id: "family", icon: Heart, short: "Family" },
  { id: "followers", icon: UserCheck, short: "Followers" },
  { id: "public", icon: Globe, short: "Public" },
];

interface MapLocationAudiencePickerProps {
  activeAudience: LocationAudience;
  onSelect: (audience: LocationAudience) => void;
  isDark?: boolean;
}

export function MapLocationAudiencePicker({
  activeAudience,
  onSelect,
  isDark = true,
}: MapLocationAudiencePickerProps) {
  const tileBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const tileActiveBg = isDark ? "rgba(29,185,84,0.2)" : "rgba(29,185,84,0.15)";
  const tileBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const tileActiveBorder = "1px solid rgba(29,185,84,0.5)";
  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";

  return (
    <div className="mb-3">
      <p className="text-[12px] font-bold mb-1" style={{ color: textPrimary }}>
        Who can see your location
      </p>
      <p className="text-[11px] mb-2.5 leading-snug" style={{ color: textMuted }}>
        {LOCATION_AUDIENCE_LABELS[activeAudience]?.description}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5" role="radiogroup" aria-label="Location visibility">
        {AUDIENCE_OPTIONS.map(({ id, icon: Icon, short }) => {
          const selected = activeAudience === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(id)}
              className={cn(
                "flex flex-col items-center gap-1.5 shrink-0 px-3 py-2.5 rounded-xl transition-all active:scale-95 min-w-[72px]",
              )}
              style={{
                background: selected ? tileActiveBg : tileBg,
                border: selected ? tileActiveBorder : tileBorder,
              }}
              data-testid={`map-location-audience-${id}`}
            >
              <Icon size={18} style={{ color: selected ? "#1DB954" : textMuted }} />
              <span
                className="text-[10px] font-semibold whitespace-nowrap"
                style={{ color: selected ? textPrimary : textMuted }}
              >
                {short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
