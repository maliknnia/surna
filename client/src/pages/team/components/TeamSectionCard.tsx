import type { LucideIcon } from "lucide-react";
import { entityCardStyle } from "@/components/entity";
import { useTeamPageAccent } from "../TeamPageTheme";
import { cn } from "@/lib/utils";

export function TeamSectionCard({
  title,
  children,
  className,
  action,
  testId,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className={cn("rounded-2xl p-4", className)} style={entityCardStyle} data-testid={testId}>
      {title ? (
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3
            className="text-[13px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {title}
          </h3>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function TeamDetailRow({
  icon: Icon,
  label,
  value,
  accentColor,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  accentColor?: string;
}) {
  const themeAccent = useTeamPageAccent();
  const accent = accentColor ?? themeAccent;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}22` }}
      >
        <Icon size={17} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div
          className="text-[11px] uppercase tracking-wider"
          style={{ color: "var(--surna-text-muted)" }}
        >
          {label}
        </div>
        <div
          className="text-[14px] font-medium truncate"
          style={{ color: "var(--surna-text)" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export function TeamAccentButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const accent = useTeamPageAccent();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-[0.96] transition-transform",
        className,
      )}
      style={{
        background: `${accent}18`,
        color: accent,
        border: `1px solid ${accent}33`,
      }}
    >
      {children}
    </button>
  );
}
