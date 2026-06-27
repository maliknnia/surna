import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";

export interface SummaryChip {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  emphasis?: boolean;
  href?: string;
}

interface Props {
  chips: SummaryChip[];
  loading?: boolean;
}

function ChipInner({ chip }: { chip: SummaryChip }) {
  const Icon = chip.icon;
  return (
    <>
      <Icon
        className="w-4 h-4"
        style={{
          color: chip.emphasis ? "var(--surna-text)" : "var(--surna-text-secondary)",
        }}
      />
      <div>
        <div className="text-xl font-bold leading-none" style={{ color: "var(--surna-text)" }}>
          {chip.value}
        </div>
        <div
          className="text-[10px] uppercase tracking-wide mt-1"
          style={{ color: "var(--surna-text-secondary)" }}
        >
          {chip.label}
        </div>
      </div>
    </>
  );
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
            style={{ width: 110, height: 86, background: "var(--surna-elevated)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" data-testid="my-hub-chip-row">
      {chips.map((chip) => {
        const className = "flex-shrink-0 rounded-2xl p-3 flex flex-col justify-between active:opacity-90 transition-opacity";
        const style = {
          width: 110,
          height: 86,
          background: "var(--surna-elevated)",
          border: "1px solid var(--surna-border)",
        };

        if (chip.href) {
          return (
            <Link
              key={chip.key}
              href={chip.href}
              className={className}
              style={style}
              data-testid={`chip-${chip.key}`}
            >
              <ChipInner chip={chip} />
            </Link>
          );
        }

        return (
          <div key={chip.key} className={className} style={style} data-testid={`chip-${chip.key}`}>
            <ChipInner chip={chip} />
          </div>
        );
      })}
    </div>
  );
}
