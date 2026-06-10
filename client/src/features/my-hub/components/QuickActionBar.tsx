import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

export interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface Props {
  actions: QuickAction[];
}

export function QuickActionBar({ actions }: Props) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${Math.min(actions.length, 4)}, minmax(0, 1fr))`,
      }}
      data-testid="quick-action-bar"
    >
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.key} href={a.href}>
            <button
              className="w-full rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]"
              style={{
                background: "var(--surna-elevated)",
                border: "1px solid var(--surna-border)",
              }}
              data-testid={`quick-action-${a.key}`}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: "var(--surna-text)" }}
              />
              <span
                className="text-[11px] font-medium text-center leading-tight"
                style={{ color: "var(--surna-text-secondary)" }}
              >
                {a.label}
              </span>
            </button>
          </Link>
        );
      })}
    </div>
  );
}
