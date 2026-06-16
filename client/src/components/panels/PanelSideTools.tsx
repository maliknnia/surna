import { useEffect, type Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { getPanelTheme } from "@/lib/panelTheme";

export interface PanelToolsStyle {
  isDark: boolean;
  btnBg: string;
  btnActiveBg: string;
  btnActiveColor: string;
  btnColor: string;
  inputBg: string;
  textPrimary: string;
  textSecondary: string;
  sheetBg: string;
  borderColor: string;
}

export function panelToolsStyle(isDark: boolean): PanelToolsStyle {
  const t = getPanelTheme();
  return {
    isDark,
    btnBg: t.chipBg,
    btnActiveBg: t.chipActiveBg,
    btnActiveColor: t.chipActiveText,
    btnColor: t.textPrimary,
    inputBg: t.inputBg,
    textPrimary: t.textPrimary,
    textSecondary: t.textSecondary,
    sheetBg: t.sheetBg,
    borderColor: t.border,
  };
}

const iconBtnClass =
  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform";

/** Search + filter icon buttons for the panel header row */
export function PanelHeaderToolButtons({
  style: s,
  searchOpen,
  filterOpen,
  filterActive = false,
  showSearch = true,
  onToggleSearch,
  onToggleFilter,
}: {
  style: PanelToolsStyle;
  searchOpen: boolean;
  filterOpen: boolean;
  filterActive?: boolean;
  showSearch?: boolean;
  onToggleSearch: () => void;
  onToggleFilter: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {showSearch ? (
      <button
        type="button"
        onClick={onToggleSearch}
        className={iconBtnClass}
        style={{
          background: searchOpen ? s.btnActiveBg : s.btnBg,
          color: searchOpen ? s.btnActiveColor : s.btnColor,
        }}
        aria-label="Search"
      >
        <Search size={17} strokeWidth={2.25} />
      </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleFilter}
        className={`${iconBtnClass} relative`}
        style={{
          background: filterOpen || filterActive ? s.btnActiveBg : s.btnBg,
          color: filterOpen || filterActive ? s.btnActiveColor : s.btnColor,
        }}
        aria-label="Filter"
      >
        <SlidersHorizontal size={17} strokeWidth={2.25} />
        {filterActive && !filterOpen ? (
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-surna-ios-red"
          />
        ) : null}
      </button>
    </div>
  );
}

/** Inline search field below the panel header */
export function PanelInlineSearch({
  style: s,
  searchQuery,
  onSearchChange,
  placeholder = "Search…",
}: {
  style: PanelToolsStyle;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="px-4 pb-2.5" style={{ borderBottom: `1px solid ${s.borderColor}` }}>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: s.textSecondary }}
        />
        <input
          type="text"
          autoFocus
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-9 pr-9 rounded-xl border-none text-sm focus:outline-none"
          style={{ background: s.inputBg, color: s.textPrimary }}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: s.btnBg }}
          >
            <X size={14} style={{ color: s.textSecondary }} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Bottom sheet filter panel (portal) */
export function PanelFilterSheet({
  style: s,
  open,
  onClose,
  title = "Filters",
  children,
}: {
  style: PanelToolsStyle;
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[280] bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="fixed left-0 right-0 bottom-0 z-[281] flex flex-col max-h-[min(78vh,520px)]"
        style={{
          background: s.sheetBg,
          borderRadius: "20px 20px 0 0",
          borderTop: `1px solid ${s.borderColor}`,
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: s.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }}
          />
        </div>
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: s.borderColor }}
        >
          <p className="text-base font-bold" style={{ color: s.textPrimary }}>
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={iconBtnClass}
            style={{ background: s.inputBg, color: s.textPrimary }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">{children}</div>
        <div className="px-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-full text-sm font-bold active:scale-[0.98]"
            style={{ background: s.btnActiveBg, color: s.btnActiveColor }}
          >
            Done
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

/** Toggle helpers for search vs filter */
export function usePanelToolToggles(
  setSearchOpen: Dispatch<SetStateAction<boolean>>,
  setFilterOpen: Dispatch<SetStateAction<boolean>>,
  searchOpen: boolean,
  filterOpen: boolean,
) {
  const onToggleSearch = () => {
    setSearchOpen((v) => !v);
    if (!searchOpen) setFilterOpen(false);
  };
  const onToggleFilter = () => {
    setFilterOpen((v) => !v);
    if (!filterOpen) setSearchOpen(false);
  };
  return { onToggleSearch, onToggleFilter };
}

/** Close search/filter UI when user swipes away from this tab */
export function usePanelToolsLifecycle(
  panelActive: boolean,
  setSearchOpen: Dispatch<SetStateAction<boolean>>,
  setFilterOpen: Dispatch<SetStateAction<boolean>>,
) {
  useEffect(() => {
    if (!panelActive) {
      setSearchOpen(false);
      setFilterOpen(false);
    }
  }, [panelActive, setSearchOpen, setFilterOpen]);
}
