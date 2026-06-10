import type { CSSProperties } from "react";
import { X } from "lucide-react";
import {
  FILTER_CATEGORIES,
  type FilterCategory,
} from "./constants";
import { getFiltersForCategory } from "./filterEngine";
import { CAMERA_MUTED, CAMERA_TEXT, EDITOR_UI } from "./cameraTheme";

type Props = {
  open: boolean;
  filterCategory: FilterCategory;
  filterId: string;
  onCategoryChange: (category: FilterCategory) => void;
  onFilterChange: (id: string) => void;
  onClose: () => void;
};

export default function FilterPickerSheet({
  open,
  filterCategory,
  filterId,
  onCategoryChange,
  onFilterChange,
  onClose,
}: Props) {
  if (!open) return null;

  const filters = getFiltersForCategory(filterCategory);
  const activeName = filters.find((f) => f.id === filterId)?.name ?? "Normal";

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 24,
          background: "rgba(0, 0, 0, 0.35)",
          border: "none",
          cursor: "pointer",
        }}
      />
      <div
        className="surna-camera-sheet-up"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 25,
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          background: EDITOR_UI.sheetBg,
          borderTop: EDITOR_UI.sheetBorder,
          borderRadius: "20px 20px 0 0",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: CAMERA_TEXT }}>Filters</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: CAMERA_MUTED }}>{activeName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Done" style={closeBtn}>
            <X size={20} color={CAMERA_TEXT} strokeWidth={2} />
          </button>
        </div>

        <div
          className="surna-camera-no-scrollbar"
          style={{
            display: "flex",
            gap: 8,
            padding: "0 16px 12px",
            overflowX: "auto",
          }}
        >
          {FILTER_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onCategoryChange(c.id);
                const first = getFiltersForCategory(c.id)[0];
                if (first) onFilterChange(first.id);
              }}
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: 999,
                border: filterCategory === c.id ? "none" : EDITOR_UI.chipBorder,
                fontSize: 13,
                fontWeight: 600,
                background: filterCategory === c.id ? "#FFFFFF" : EDITOR_UI.chipBg,
                color: filterCategory === c.id ? "#000000" : CAMERA_MUTED,
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div
          className="surna-camera-no-scrollbar"
          style={{
            display: "flex",
            gap: 12,
            padding: "4px 16px 8px",
            overflowX: "auto",
          }}
        >
          {filters.map((f) => {
            const selected = filterId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: f.previewGradient,
                    border: selected ? EDITOR_UI.swatchRing : EDITOR_UI.swatchRingIdle,
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: selected ? 600 : 400,
                    color: selected ? CAMERA_TEXT : CAMERA_MUTED,
                    maxWidth: 64,
                    textAlign: "center",
                  }}
                >
                  {f.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

const closeBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  border: "none",
  background: EDITOR_UI.chipBg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
