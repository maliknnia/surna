import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { entityBtnClass, entityBtnSurface } from "./entityStyles";
import { cn } from "@/lib/utils";

type EntityEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EntityEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact = false,
}: EntityEmptyStateProps) {
  const py = compact ? "py-10" : "py-16";

  const actionButton =
    actionLabel && onAction ? (
      <button type="button" onClick={onAction} className={cn(entityBtnClass, "max-w-xs mx-auto mt-4 px-6")} style={entityBtnSurface}>
        {actionLabel}
      </button>
    ) : actionLabel && actionHref ? (
      <Link href={actionHref}>
        <button type="button" className={cn(entityBtnClass, "max-w-xs mx-auto mt-4 px-6")} style={entityBtnSurface}>
          {actionLabel}
        </button>
      </Link>
    ) : null;

  return (
    <div className={cn("text-center px-6", py)}>
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "var(--surna-elevated)", border: "1px solid var(--surna-border)" }}
      >
        <Icon className="w-7 h-7" style={{ color: "var(--surna-text-secondary)" }} strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold" style={{ color: "var(--surna-text)" }}>
        {title}
      </p>
      {description ? (
        <p className="text-[13px] mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
          {description}
        </p>
      ) : null}
      {actionButton}
    </div>
  );
}
