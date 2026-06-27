import { formatEntityCount } from "./entityStyles";

export type EntityStat = {
  value: number | string;
  label: string;
  testId?: string;
};

type EntityStatRowProps = {
  stats: EntityStat[];
  onStatClick?: (label: string) => void;
};

export function EntityStatRow({ stats, onStatClick }: EntityStatRowProps) {
  return (
    <div className="flex justify-around text-center mb-4 px-1">
      {stats.map((stat) => (
        <button
          key={stat.label}
          type="button"
          onClick={() => onStatClick?.(stat.label)}
          disabled={!onStatClick}
          className="min-w-0 flex-1 px-1 active:opacity-60 transition-opacity disabled:cursor-default"
          data-testid={stat.testId ?? `entity-stat-${stat.label}`}
        >
          <span
            className="block text-[17px] font-semibold leading-none tabular-nums"
            style={{ color: "var(--surna-text)" }}
          >
            {typeof stat.value === "number" ? formatEntityCount(stat.value) : stat.value}
          </span>
          <span
            className="block text-[12px] mt-1 capitalize"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {stat.label}
          </span>
        </button>
      ))}
    </div>
  );
}
