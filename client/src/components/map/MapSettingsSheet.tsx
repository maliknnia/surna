import { cn } from "@/lib/utils";
import {
  MAP_AUDIENCE_LABELS,
  MAP_LOCATION_AUDIENCES,
  MAP_SPORT_FILTERS,
  type MapLayerKey,
  type MapLocationAudience,
  type MapSettings,
  type SavedMapPlace,
} from "@shared/mapSettings";
import { X, Trash2, Star } from "lucide-react";

const LAYER_LABELS: Record<MapLayerKey, string> = {
  events: "Events",
  instant: "Instant Games",
  teams: "Teams",
  coaches: "Coaches",
  players: "Players",
  places: "Venues and Places",
  challenges: "Challenges",
};

interface MapSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: MapSettings;
  onChange: (patch: Partial<MapSettings>) => void;
  onReset: () => void;
  isDark?: boolean;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  textPrimary,
  textMuted,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: textPrimary }}>
          {label}
        </p>
        {description && (
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: textMuted }}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative shrink-0 w-11 h-6 rounded-full transition-colors",
          checked ? "bg-[#1DB954]" : "bg-[#535353]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2 mt-5 first:mt-0"
      style={{ color }}
    >
      {children}
    </p>
  );
}

export function MapSettingsSheet({
  open,
  onClose,
  settings,
  onChange,
  onReset,
  isDark = true,
}: MapSettingsSheetProps) {
  if (!open) return null;

  const textPrimary = isDark ? "#ffffff" : "#111111";
  const textMuted = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const sheetLabel = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  const tileBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const tileBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
  const tileActiveBg = isDark ? "rgba(29,185,84,0.18)" : "rgba(29,185,84,0.12)";
  const tileActiveBorder = "1px solid rgba(29,185,84,0.45)";

  const toggleSport = (sportId: string) => {
    const has = settings.selectedSports.includes(sportId as any);
    const next = has
      ? settings.selectedSports.filter((s) => s !== sportId)
      : [...settings.selectedSports, sportId as any];
    onChange({ selectedSports: next.length ? next : [] });
  };

  const deleteSaved = (id: string) => {
    onChange({
      savedPlaces: settings.savedPlaces.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="absolute inset-0 z-[1003]" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{ background: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden flex flex-col"
        style={{
          borderRadius: "24px 24px 0 0",
          background: isDark ? "#121212" : "#ffffff",
          maxHeight: "88vh",
          animation: "mapSheetUp 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-[5px] rounded-full" style={{ background: isDark ? "#535353" : "#ccc" }} />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between shrink-0">
          <h3 className="text-[18px] font-bold" style={{ color: textPrimary }}>
            Map Settings
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: tileBg }}
            aria-label="Close settings"
          >
            <X size={16} style={{ color: textMuted }} />
          </button>
        </div>

        <div className="px-5 pb-6 overflow-y-auto flex-1">
          {/* Ghost Mode */}
          <div
            className="rounded-2xl p-4 mb-4 transition-colors"
            style={{
              background: settings.ghostMode ? "#2a2a2a" : tileBg,
              border: tileBorder,
            }}
          >
            <ToggleRow
              label="Ghost Mode"
              description="You are invisible to everyone on the map"
              checked={settings.ghostMode}
              onChange={(ghostMode) => onChange({ ghostMode })}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
          </div>

          <SectionTitle color={sheetLabel}>Who can see my location</SectionTitle>
          <div className="space-y-2">
            {MAP_LOCATION_AUDIENCES.map((aud) => {
              const meta = MAP_AUDIENCE_LABELS[aud];
              const selected = settings.locationAudience === aud && !settings.ghostMode;
              return (
                <button
                  key={aud}
                  type="button"
                  onClick={() => onChange({ locationAudience: aud, ghostMode: false })}
                  className="w-full text-left p-3 rounded-xl transition-all active:scale-[0.99]"
                  style={{
                    background: selected ? tileActiveBg : tileBg,
                    border: selected ? tileActiveBorder : tileBorder,
                  }}
                >
                  <p className="text-[14px] font-semibold" style={{ color: textPrimary }}>
                    {meta.title}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: textMuted }}>
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>

          <SectionTitle color={sheetLabel}>Location privacy</SectionTitle>
          <div className="rounded-xl px-3" style={{ background: tileBg, border: tileBorder }}>
            <ToggleRow
              label="Blur my exact position for privacy"
              description="Show your pin within ~500 m of your real location"
              checked={settings.blurLocation}
              onChange={(blurLocation) => onChange({ blurLocation })}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
            <div className="border-t border-white/5" />
            <ToggleRow
              label="Show when I am active on the map"
              description="Green dot on your pin when online"
              checked={settings.showActiveStatus}
              onChange={(showActiveStatus) => onChange({ showActiveStatus })}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
          </div>

          <SectionTitle color={sheetLabel}>Show on map</SectionTitle>
          <div className="rounded-xl px-3 divide-y divide-white/5" style={{ background: tileBg, border: tileBorder }}>
            {(Object.keys(LAYER_LABELS) as MapLayerKey[]).map((key) => (
              <ToggleRow
                key={key}
                label={LAYER_LABELS[key]}
                description={
                  key === "players"
                    ? "Only visible if you share your location"
                    : undefined
                }
                checked={settings.layers[key]}
                onChange={(on) =>
                  onChange({ layers: { ...settings.layers, [key]: on } })
                }
                textPrimary={textPrimary}
                textMuted={textMuted}
              />
            ))}
          </div>

          <SectionTitle color={sheetLabel}>Radius</SectionTitle>
          <div className="rounded-xl p-4" style={{ background: tileBg, border: tileBorder }}>
            <p className="text-[14px] font-semibold mb-3" style={{ color: textPrimary }}>
              Show activity within {settings.radiusKm} km
            </p>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={settings.radiusKm}
              onChange={(e) => onChange({ radiusKm: parseInt(e.target.value, 10) })}
              className="w-full accent-[#1DB954]"
            />
            <div className="flex justify-between text-[11px] mt-1" style={{ color: textMuted }}>
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          <SectionTitle color={sheetLabel}>Sports</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {MAP_SPORT_FILTERS.map((sport) => {
              const active = settings.selectedSports.includes(sport.id);
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => toggleSport(sport.id)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? tileActiveBg : tileBg,
                    border: active ? tileActiveBorder : tileBorder,
                    color: active ? textPrimary : textMuted,
                  }}
                >
                  {sport.label}
                </button>
              );
            })}
          </div>

          <SectionTitle color={sheetLabel}>Find friends</SectionTitle>
          <button
            type="button"
            onClick={() => onChange({ findTeammates: !settings.findTeammates })}
            className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98]"
            style={{
              background: settings.findTeammates ? "rgba(147,51,234,0.25)" : tileBg,
              border: settings.findTeammates ? "1px solid rgba(147,51,234,0.5)" : tileBorder,
              color: textPrimary,
            }}
          >
            Find my teammates on map
          </button>

          <SectionTitle color={sheetLabel}>My saved places</SectionTitle>
          {settings.savedPlaces.length === 0 ? (
            <p className="text-[12px]" style={{ color: textMuted }}>
              Long-press anywhere on the map to save a location.
            </p>
          ) : (
            <ul className="space-y-2">
              {settings.savedPlaces.map((place: SavedMapPlace) => (
                <li
                  key={place.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: tileBg, border: tileBorder }}
                >
                  <Star size={16} className="text-[#FFD60A] shrink-0" fill="#FFD60A" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: textPrimary }}>
                      {place.label}
                    </p>
                    <p className="text-[11px]" style={{ color: textMuted }}>
                      {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSaved(place.id)}
                    className="p-2 rounded-lg"
                    aria-label={`Delete ${place.label}`}
                  >
                    <Trash2 size={14} style={{ color: textMuted }} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <SectionTitle color={sheetLabel}>Map style</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(["dark", "standard"] as const).map((style) => {
              const active = settings.mapStyle === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ mapStyle: style })}
                  className="py-3 rounded-xl text-[13px] font-semibold capitalize transition-all active:scale-95"
                  style={{
                    background: active ? tileActiveBg : tileBg,
                    border: active ? tileActiveBorder : tileBorder,
                    color: active ? textPrimary : textMuted,
                  }}
                >
                  {style === "dark" ? "Dark map" : "Standard map"}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="w-full mt-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.98]"
            style={{ background: tileBg, border: tileBorder, color: textMuted }}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
