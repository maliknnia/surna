import { useMemo, useState, useEffect } from "react";
import { Search, X, Clock, MapPin as MapPinIcon, Trash2 } from "lucide-react";
import type { MapPin } from "@/components/map/InteractiveMap";
import {
  clearMapRecents,
  loadMapRecents,
  type MapRecentEntry,
} from "@/lib/mapSearchRecents";

type MapSearchSheetProps = {
  open: boolean;
  onClose: () => void;
  pins: MapPin[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectPin: (pin: MapPin) => void;
  onSelectRecent: (entry: MapRecentEntry) => void;
  theme: {
    sheetBg: string;
    sheetBackdrop: string;
    sheetHandle: string;
    textPrimary: string;
    iconMuted: string;
    chipBg: string;
    tileBg: string;
    tileBorder: string;
    tileText: string;
  };
};

function matchesQuery(pin: MapPin, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    pin.title.toLowerCase().includes(needle) ||
    (pin.subtitle || "").toLowerCase().includes(needle) ||
    String(pin.data?.sport || "").toLowerCase().includes(needle)
  );
}

export function MapSearchSheet({
  open,
  onClose,
  pins,
  searchQuery,
  onSearchChange,
  onSelectPin,
  onSelectRecent,
  theme,
}: MapSearchSheetProps) {
  const [recents, setRecents] = useState<MapRecentEntry[]>([]);

  useEffect(() => {
    if (open) setRecents(loadMapRecents());
  }, [open]);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return pins.filter((p) => matchesQuery(p, searchQuery.trim())).slice(0, 20);
  }, [pins, searchQuery]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[1002]" onClick={onClose}>
      <div
        className="absolute inset-0"
        style={{ background: theme.sheetBackdrop, backdropFilter: "blur(4px)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 overflow-hidden flex flex-col"
        style={{
          borderRadius: "20px 20px 0 0",
          background: theme.sheetBg,
          maxHeight: "min(72vh, 560px)",
          animation: "mapSheetUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: theme.sheetHandle }} />
        </div>

        <div className="px-4 pb-3 flex items-center gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: theme.chipBg, border: theme.tileBorder }}
          >
            <Search size={16} style={{ color: theme.iconMuted, flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search places, events, teams…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: theme.textPrimary }}
              autoFocus
            />
            {searchQuery && (
              <button type="button" onClick={() => onSearchChange("")} aria-label="Clear">
                <X size={14} style={{ color: theme.iconMuted }} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: theme.chipBg }}
            aria-label="Close search"
          >
            <X size={16} style={{ color: theme.iconMuted }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: "thin" }}>
          {searchQuery.trim() ? (
            results.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: theme.iconMuted }}>
                No matches on the map right now.
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map((pin) => (
                  <li key={`${pin.type}-${pin.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPin(pin);
                        onClose();
                      }}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[0.99] transition-transform"
                      style={{ background: theme.tileBg, border: theme.tileBorder }}
                    >
                      <MapPinIcon size={16} className="mt-0.5 shrink-0" style={{ color: theme.iconMuted }} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>
                          {pin.title}
                        </p>
                        <p className="text-xs truncate" style={{ color: theme.iconMuted }}>
                          {pin.subtitle || pin.type}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"
                  style={{ color: theme.iconMuted }}
                >
                  <Clock size={12} />
                  Recent
                </p>
                {recents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearMapRecents();
                      setRecents([]);
                    }}
                    className="text-[11px] font-semibold flex items-center gap-1"
                    style={{ color: theme.iconMuted }}
                  >
                    <Trash2 size={12} />
                    Clear
                  </button>
                )}
              </div>
              {recents.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: theme.iconMuted }}>
                  Places you open from the map show up here.
                </p>
              ) : (
                <ul className="space-y-1">
                  {recents.map((entry) => (
                    <li key={`${entry.type}-${entry.id}-${entry.visitedAt}`}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecent(entry);
                          onClose();
                        }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left active:scale-[0.99]"
                        style={{ background: theme.tileBg, border: theme.tileBorder }}
                      >
                        <Clock size={14} className="mt-1 shrink-0" style={{ color: theme.iconMuted }} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>
                            {entry.title}
                          </p>
                          <p className="text-xs truncate capitalize" style={{ color: theme.iconMuted }}>
                            {entry.subtitle || entry.type}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
