import type { LucideIcon } from "lucide-react";

export interface SummaryChip {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  emphasis?: boolean;
}

interface Props {
  chips: SummaryChip[];
  loading?: boolean;
}

export function SummaryChipRow({ chips, loading }: Props) {
  if (loading) {
    return (
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
        data-testid="my-hub-chip-row-loading"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl animate-pulse"
            style={{
              width: 110,
              height: 86,
              background: "var(--surna-elevated)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
      data-testid="my-hub-chip-row"
    >
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <div
            key={chip.key}
            className="flex-shrink-0 rounded-2xl p-3 flex flex-col justify-between"
            style={{
              width: 110,
              height: 86,
              background: "var(--surna-elevated)",
              border: "1px solid var(--surna-border)",
            }}
            data-testid={`chip-${chip.key}`}
          >
            <Icon
              className="w-4 h-4"
              style={{
                color: chip.emphasis
                  ? "var(--surna-text)"
                  : "var(--surna-text-secondary)",
              }}
            />
            <div>
              <div
                className="text-xl font-bold leading-none"
                style={{ color: "var(--surna-text)" }}
              >
                {chip.value}
              </div>
              <div
                className="text-[10px] uppercase tracking-wide mt-1"
                style={{ color: "var(--surna-text-secondary)" }}
              >
                {chip.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
