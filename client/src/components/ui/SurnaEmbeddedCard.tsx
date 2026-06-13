import { cn } from "@/lib/utils";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export const surnaEmbeddedSurfaceStyle: CSSProperties = {
  background: "var(--surna-elevated)",
  border: "0.5px solid var(--surna-border)",
};

export const surnaEmbeddedInsetStyle: CSSProperties = {
  background: "var(--surna-surface)",
  border: "0.5px solid var(--surna-border)",
};

export function SurnaEmbeddedSurface({
  className,
  style,
  inset,
  ...props
}: HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn("rounded-2xl overflow-hidden", className)}
      style={{ ...(inset ? surnaEmbeddedInsetStyle : surnaEmbeddedSurfaceStyle), ...style }}
      {...props}
    />
  );
}

export function SurnaEmbeddedInnerSection({
  className,
  children,
  last,
}: {
  className?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn("p-4", !last && "border-b", className)}
      style={!last ? { borderColor: "var(--surna-border)" } : undefined}
    >
      {children}
    </div>
  );
}

export function SurnaFullscreenOverlay({
  children,
  scrollable,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md",
        scrollable && "overflow-y-auto",
      )}
      style={{ background: "color-mix(in srgb, var(--surna-base) 75%, transparent)" }}
    >
      {scrollable ? (
        <div className="min-h-screen flex items-center justify-center p-4 w-full">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

export function SurnaEmbeddedPanel({
  className,
  children,
  maxWidth = "max-w-lg",
}: {
  className?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <SurnaEmbeddedSurface className={cn("w-full shadow-none", maxWidth, className)}>
      {children}
    </SurnaEmbeddedSurface>
  );
}

export function SurnaEmbeddedHeader({
  title,
  subtitle,
  center,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("p-6 border-b", center && "text-center", className)}
      style={{ borderColor: "var(--surna-border)" }}
    >
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <h2 className="text-xl font-bold" style={{ color: "var(--surna-text)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-2" style={{ color: "var(--surna-text-secondary)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function SurnaEmbeddedBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

export function SurnaEmbeddedOption({
  icon,
  title,
  description,
  loading,
  disabled,
  onClick,
  selected,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl p-5 text-left transition-all active:scale-[0.98] disabled:opacity-60",
        selected && "ring-2 ring-[var(--surna-text-muted)]",
      )}
      style={surnaEmbeddedInsetStyle}
    >
      <div style={{ color: "var(--surna-text)" }}>{icon}</div>
      <p className="font-semibold mt-3" style={{ color: "var(--surna-text)" }}>
        {title}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--surna-text-secondary)" }}>
        {description}
      </p>
      {loading && <Loader2 className="h-4 w-4 animate-spin mt-3" style={{ color: "var(--surna-text-muted)" }} />}
    </button>
  );
}

export function SurnaEmbeddedSectionTitle({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--surna-text)" }}>
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
