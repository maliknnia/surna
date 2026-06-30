import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type CreateFlowStep = {
  id: number;
  label: string;
  icon?: LucideIcon;
};

type CreateFlowShellProps = {
  title: string;
  subtitle?: string;
  steps: CreateFlowStep[];
  currentStep: number;
  onBack: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** When true, footer sticks above safe area */
  stickyFooter?: boolean;
};

export function CreateFlowShell({
  title,
  subtitle,
  steps,
  currentStep,
  onBack,
  children,
  footer,
  stickyFooter = true,
}: CreateFlowShellProps) {
  const total = steps.length;
  const completionPercent = Math.round(((currentStep - 1) / total) * 100);
  const displayPercent = Math.min(100, completionPercent + (currentStep === total ? 15 : 8));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--surna-base, var(--background))" }}
    >
      <header
        className="sticky top-0 z-30"
        style={{
          background: "color-mix(in srgb, var(--surna-base) 88%, transparent)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center gap-2 px-4 h-14 max-w-lg mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ChevronLeft size={24} style={{ color: "var(--surna-text)" }} />
          </button>
          <div className="flex-1 min-w-0 text-center -ml-8">
            <p className="text-[17px] font-bold truncate" style={{ color: "var(--surna-text)" }}>
              {title}
            </p>
            {subtitle ? (
              <p className="text-[12px] truncate" style={{ color: "var(--surna-text-secondary)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-4 max-w-lg mx-auto">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--surna-elevated)" }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${displayPercent}%`,
                background: "var(--surna-text)",
              }}
            />
          </div>
          <div className="flex justify-center gap-1.5 pt-3">
            {steps.map((step) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    active ? "w-6" : "w-1.5",
                  )}
                  style={{
                    background: done || active ? "var(--surna-text)" : "var(--surna-border)",
                    opacity: !done && !active ? 0.45 : 1,
                  }}
                  aria-hidden
                />
              );
            })}
          </div>
          <p className="text-center text-[12px] font-medium mt-2" style={{ color: "var(--surna-text-secondary)" }}>
            Step {currentStep} of {total} · {steps[currentStep - 1]?.label}
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full pb-32">{children}</main>

      {footer ? (
        <div
          className={cn(stickyFooter && "fixed bottom-0 left-0 right-0 z-30")}
          style={{
            background: "var(--glass-bg, var(--background))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: stickyFooter ? "1px solid var(--surna-separator)" : undefined,
            paddingBottom: stickyFooter ? "env(safe-area-inset-bottom)" : undefined,
          }}
        >
          <div className="max-w-lg mx-auto p-4">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

type FlowFooterButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function FlowFooterButton({
  label,
  onClick,
  disabled,
  loading,
  variant = "primary",
}: FlowFooterButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-4 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
      style={{
        background: isPrimary ? "var(--surna-text)" : "transparent",
        color: isPrimary ? "var(--surna-base)" : "var(--surna-text)",
        border: isPrimary ? "none" : "1px solid var(--surna-separator)",
        boxShadow: isPrimary ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
      }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : null}
      {label}
    </button>
  );
}
