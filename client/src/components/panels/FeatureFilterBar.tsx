/** Feature-specific filter chips for panel filter sheets (search uses PanelInlineSearch). */

import { getPanelTheme } from "@/lib/panelTheme";

export interface FilterChip {
  key: string;
  label: string;
  emoji?: string;
}

export interface FilterChipGroup {
  id: string;
  label?: string;
  chips: FilterChip[];
  value: string;
  onChange: (key: string) => void;
}

interface FeatureFilterChipsProps {
  isDark: boolean;
  chips?: FilterChip[];
  chipValue?: string;
  onChipChange?: (key: string) => void;
  chipGroups?: FilterChipGroup[];
  /** Wrap chips in a flex grid (sheet) vs horizontal scroll rows */
  layout?: "scroll" | "wrap";
}

export function FeatureFilterChips({
  isDark,
  chips,
  chipValue,
  onChipChange,
  chipGroups,
  layout = "wrap",
}: FeatureFilterChipsProps) {
  const t = getPanelTheme(isDark);
  const chipActiveBg = t.chipActiveBg;
  const chipActiveText = t.chipActiveText;
  const chipBg = t.chipBg;
  const chipText = t.chipText;
  const labelColor = t.textMuted;

  const renderChip = (chip: FilterChip, activeKey: string, onSelect: (key: string) => void) => {
    const isActive = activeKey === chip.key;
    return (
      <button
        key={chip.key}
        type="button"
        onClick={() => onSelect(chip.key)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-transform"
        style={{
          background: isActive ? chipActiveBg : chipBg,
          color: isActive ? chipActiveText : chipText,
          border: `1px solid ${isActive ? "transparent" : t.border}`,
          boxShadow: !isDark && !isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
        }}
      >
        {chip.emoji && <span className="text-sm leading-none">{chip.emoji}</span>}
        <span>{chip.label}</span>
      </button>
    );
  };

  const renderChipRow = (
    items: FilterChip[],
    activeKey: string,
    onSelect: (key: string) => void,
  ) =>
    layout === "scroll" ? (
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {items.map((chip) => renderChip(chip, activeKey, onSelect))}
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">{items.map((chip) => renderChip(chip, activeKey, onSelect))}</div>
    );

  const groups: FilterChipGroup[] =
    chipGroups ??
    (chips && chipValue !== undefined && onChipChange
      ? [{ id: "main", chips, value: chipValue, onChange: onChipChange }]
      : []);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          {group.label && (
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: labelColor }}
            >
              {group.label}
            </p>
          )}
          {renderChipRow(group.chips, group.value, group.onChange)}
        </div>
      ))}
    </div>
  );
}
