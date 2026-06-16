import { MAP_CATEGORY_OPTIONS, type MapCategoryFilter } from "@/lib/mapFilters";
import { cn } from "@/lib/utils";

type MapModeBarProps = {
  value: MapCategoryFilter;
  onChange: (v: MapCategoryFilter) => void;
  surfaceBg: string;
  surfaceBorder: string;
  activeBg: string;
  activeText: string;
  mutedText: string;
};

export function MapModeBar({
  value,
  onChange,
  surfaceBg,
  surfaceBorder,
  activeBg,
  activeText,
  mutedText,
}: MapModeBarProps) {
  return (
    <div
      className="pointer-events-auto flex gap-1.5 overflow-x-auto px-1 py-0.5 rounded-full backdrop-blur-xl max-w-[min(72vw,320px)]"
      style={{
        background: surfaceBg,
        border: surfaceBorder,
        scrollbarWidth: "none",
        boxShadow: "0 2px 14px rgba(0,0,0,0.1)",
      }}
      data-testid="map-mode-bar"
    >
      {MAP_CATEGORY_OPTIONS.filter((o) =>
        ["all", "events", "places", "teams", "players"].includes(o.value),
      ).map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95",
            )}
            style={{
              background: active ? activeBg : "transparent",
              color: active ? activeText : mutedText,
            }}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
