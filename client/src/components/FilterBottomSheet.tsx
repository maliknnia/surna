import { useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X, Search } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBottomSheetProps {
  filters: FilterOption[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  activeCount?: number;
}

export default function FilterBottomSheet({
  filters,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeCount = 0,
}: FilterBottomSheetProps) {
  const [open, setOpen] = useState(false);

  const nonDefaultCount = activeCount || filters.filter(f => f.value !== f.options[0]?.value).length;

  return (
    <>
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform relative"
        onClick={() => setOpen(true)}
        aria-label="Filters"
        style={{ background: 'var(--surna-elevated, rgba(255,255,255,0.08))' }}
      >
        <SlidersHorizontal size={16} style={{ color: 'var(--surna-text, #fff)' }} />
        {nonDefaultCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-foreground text-[9px] font-bold flex items-center justify-center bg-surna-ios-red">
            {nonDefaultCount}
          </span>
        )}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
        <div className="fixed inset-0 z-[210]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ animation: 'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'var(--surna-elevated, #121212)', borderRadius: '20px 20px 0 0', border: '1px solid var(--surna-border, rgba(255,255,255,0.08))' }}>
              <div className="flex justify-center pt-2 pb-1" onClick={() => setOpen(false)}>
                <div className="w-9 h-[5px] rounded-[3px]" style={{ background: 'rgba(255,255,255,0.2)' }} />
              </div>

              <div className="px-5 pt-2 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold" style={{ color: 'var(--surna-text, #fff)' }}>Filters</h3>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--surna-surface, rgba(255,255,255,0.06))' }}
                  >
                    <X size={16} style={{ color: 'var(--surna-text, #fff)' }} />
                  </button>
                </div>

                {onSearchChange && (
                  <div className="relative mb-5">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--surna-text-muted, rgba(255,255,255,0.3))' }} />
                    <input
                      type="text"
                      value={searchValue || ""}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-[14px] focus:outline-none"
                      style={{ background: 'var(--surna-surface, rgba(255,255,255,0.06))', color: 'var(--surna-text, #fff)' }}
                    />
                  </div>
                )}

                <div className="space-y-5">
                  {filters.map((filter) => (
                    <div key={filter.key}>
                      <label className="text-[11px] font-bold uppercase tracking-wider mb-2.5 block" style={{ color: 'var(--surna-text-muted, rgba(255,255,255,0.35))' }}>
                        {filter.label}
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {filter.options.map((opt) => {
                          const isActive = filter.value === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => filter.onChange(opt.value)}
                              className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95"
                              style={isActive
                                ? { background: 'var(--surna-text, #fff)', color: 'var(--surna-base, #000)' }
                                : { background: 'var(--surna-surface, rgba(255,255,255,0.06))', color: 'var(--surna-text-secondary, rgba(255,255,255,0.5))' }
                              }
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="w-full mt-6 py-3.5 rounded-full text-[14px] font-bold transition-all active:scale-[0.98]"
                  style={{ background: 'var(--surna-text, #fff)', color: 'var(--surna-base, #000)' }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
