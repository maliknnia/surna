import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "./StatusPill";

interface Props {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  count?: number;
  badgeCount?: number;
  badgeTone?: "default" | "alert";
  testId?: string;
}

export function EntityCard({
  href,
  icon: Icon,
  title,
  description,
  count,
  badgeCount = 0,
  badgeTone = "default",
  testId,
}: Props) {
  return (
    <Link href={href}>
      <button
        className="w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.99]"
        style={{
          background: "var(--surna-elevated)",
          border: "1px solid var(--surna-border)",
        }}
        data-testid={testId}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "var(--surna-text)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: "var(--surna-text)" }}
            >
              {title}
            </h3>
            <StatusPill count={badgeCount} tone={badgeTone} />
          </div>
          {description && (
            <p
              className="text-xs mt-0.5 line-clamp-1"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {typeof count === "number" && (
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              {count}
            </span>
          )}
          <ChevronRight
            className="w-4 h-4"
            style={{ color: "var(--surna-text-muted)" }}
          />
        </div>
      </button>
    </Link>
  );
}
