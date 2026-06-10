import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  testId,
}: Props) {
  return (
    <div
      className="rounded-2xl p-6 text-center flex flex-col items-center gap-3"
      style={{
        background: "var(--surna-elevated)",
        border: "1px dashed var(--surna-border)",
      }}
      data-testid={testId}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: "var(--surna-bg-highlight)" }}
      >
        <Icon className="w-6 h-6" style={{ color: "var(--surna-text)" }} />
      </div>
      <div>
        <h4
          className="text-sm font-semibold"
          style={{ color: "var(--surna-text)" }}
        >
          {title}
        </h4>
        {description && (
          <p
            className="text-xs mt-1 max-w-[260px] mx-auto"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {description}
          </p>
        )}
      </div>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <button
            className="text-xs font-semibold px-4 py-2 rounded-full"
            style={{
              background: "var(--surna-text)",
              color: "var(--surna-bg)",
            }}
            data-testid="empty-state-cta"
          >
            {ctaLabel}
          </button>
        </Link>
      )}
    </div>
  );
}
