import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type CreateSectionProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/** Consistent step content block for create wizards. */
export function CreateSection({ icon: Icon, title, description, children, className }: CreateSectionProps) {
  return (
    <section className={cn("space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>
      <div className="space-y-1">
        {Icon ? (
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
          >
            <Icon size={22} strokeWidth={2.25} />
          </div>
        ) : null}
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--surna-text)" }}>
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-relaxed" style={{ color: "var(--surna-text-secondary)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function CreateFieldGroup({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
          {label}
          {required ? <span className="text-destructive ml-0.5">*</span> : null}
        </label>
        {hint ? (
          <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-muted)" }}>
            {hint}
          </p>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive font-medium">{error}</p> : null}
    </div>
  );
}

export function createInputClass(hasError?: boolean) {
  return cn(
    "w-full h-12 px-4 rounded-xl text-sm font-medium transition-all outline-none",
    "border bg-[var(--surna-elevated)] focus:ring-2 focus:ring-[var(--surna-text)]/15",
    hasError ? "border-destructive" : "border-[var(--surna-separator)]",
  );
}
