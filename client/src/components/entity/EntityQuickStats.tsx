import type { LucideIcon } from "lucide-react";

export type EntityQuickStatItem = {
  icon: LucideIcon;
  value: string | number;
  label: string;
  gold?: boolean;
  onClick?: () => void;
  testId?: string;
};

type EntityQuickStatsProps = {
  title?: string;
  items: EntityQuickStatItem[];
};

export function EntityQuickStats({ title = "Quick Stats", items }: EntityQuickStatsProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-5" aria-label={title}>
      <h3 className="text-[15px] font-semibold mb-2.5" style={{ color: "var(--surna-text)" }}>
        {title}
      </h3>
      <div className={items.length >= 3 ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-2 gap-3"}>
        {items.map((item) => {
          const Icon = item.icon;
          const Wrapper = item.onClick ? "button" : "div";
          return (
            <Wrapper
              key={item.label}
              type={item.onClick ? "button" : undefined}
              onClick={item.onClick}
              className="rounded-xl border p-4 text-left active:opacity-80 transition-opacity"
              style={{ borderColor: "var(--surna-border)", background: "var(--surna-elevated)" }}
              data-testid={item.testId}
            >
              <Icon className="w-5 h-5 mb-2" style={{ color: "var(--surna-text-secondary)" }} strokeWidth={1.75} />
              <div
                className="text-[28px] font-bold leading-none tabular-nums"
                style={{ color: item.gold ? "var(--surna-gold, #f5c518)" : "var(--surna-text)" }}
              >
                {item.value}
              </div>
              <div className="text-[13px] mt-1" style={{ color: "var(--surna-text-secondary)" }}>
                {item.label}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
