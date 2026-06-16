import { X } from "lucide-react";
import {
  MAP_CATEGORY_OPTIONS,
  MAP_DISTANCE_OPTIONS,
  MAP_SPORT_CHIP_OPTIONS,
  MAP_TIME_OPTIONS,
  type MapCategoryFilter,
} from "@/lib/mapFilters";
import { cn } from "@/lib/utils";

type MapFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  filterType: MapCategoryFilter;
  onFilterType: (v: MapCategoryFilter) => void;
  timeFilter: string;
  onTimeFilter: (v: string) => void;
  sportFilter: string;
  onSportFilter: (v: string) => void;
  distanceFilter: string;
  onDistanceFilter: (v: string) => void;
  resultCount: number;
  onReset: () => void;
  activeCount: number;
  theme: {
    sheetBg: string;
    sheetBackdrop: string;
    sheetHandle: string;
    sheetLabel: string;
    sheetReset: string;
    chipBg: string;
    tileActiveBg: string;
    tileBg: string;
    tileActiveBorder: string;
    tileBorder: string;
    tileActiveText: string;
    tileText: string;
    textPrimary: string;
    iconMuted: string;
    ctaBg: string;
    ctaText: string;
  };
};

function pillStyle(active: boolean, theme: MapFilterSheetProps["theme"]) {
  return {
    background: active ? theme.tileActiveBg : theme.tileBg,
    border: active ? theme.tileActiveBorder : theme.tileBorder,
    color: active ? theme.tileActiveText : theme.tileText,
  };
}

export function MapFilterSheet({
  open,
  onClose,
  filterType,
  onFilterType,
  timeFilter,
  onTimeFilter,
  sportFilter,
  onSportFilter,
  distanceFilter,
  onDistanceFilter,
  resultCount,
  onReset,
  activeCount,
  theme,
}: MapFilterSheetProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[1002]" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{ background: theme.sheetBackdrop, backdropFilter: "blur(4px)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden"
        style={{
          borderRadius: "24px 24px 0 0",
          background: theme.sheetBg,
          maxHeight: "72vh",
          animation: "mapSheetUp 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-[5px] rounded-full" style={{ background: theme.sheetHandle }} />
        </div>

        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="text-[18px] font-bold" style={{ color: theme.textPrimary }}>
            Map filters
          </h3>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="text-[13px] font-semibold"
                style={{ color: theme.sheetReset }}
              >
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: theme.chipBg }}
              aria-label="Close filters"
            >
              <X size={16} style={{ color: theme.iconMuted }} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: "calc(72vh - 76px)" }}>
          <section className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2.5"
              style={{ color: theme.sheetLabel }}
            >
              Show
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {MAP_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFilterType(opt.value)}
                  className={cn(
                    "shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all active:scale-95",
                  )}
                  style={pillStyle(filterType === opt.value, theme)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2.5"
              style={{ color: theme.sheetLabel }}
            >
              When
            </p>
            <div className="flex gap-2">
              {MAP_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onTimeFilter(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                  style={pillStyle(timeFilter === opt.value, theme)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2.5"
              style={{ color: theme.sheetLabel }}
            >
              Sport
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MAP_SPORT_CHIP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSportFilter(opt.value)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                  style={pillStyle(sportFilter === opt.value, theme)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.08em] mb-2.5"
              style={{ color: theme.sheetLabel }}
            >
              Distance
            </p>
            <div className="flex gap-2">
              {MAP_DISTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onDistanceFilter(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                  style={pillStyle(distanceFilter === opt.value, theme)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.97] mt-2"
            style={{ background: theme.ctaBg, color: theme.ctaText }}
          >
            Show {resultCount} {resultCount === 1 ? "place" : "places"}
          </button>
        </div>
      </div>
    </div>
  );
}
