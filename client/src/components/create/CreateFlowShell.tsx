import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
        className="sticky top-0 z-30 border-b"
        style={{
          background: "var(--glass-bg, var(--background))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "var(--surna-separator, var(--border))",
        }}
      >
        <div className="flex items-center gap-2 px-4 h-12 max-w-lg mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full active:scale-95 transition-transform"
            aria-label="Go back"
          >
            <ChevronLeft size={22} style={{ color: "var(--surna-text)" }} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--surna-text)" }}>
              {title}
            </p>
            {subtitle ? (
              <p className="text-[11px] truncate" style={{ color: "var(--surna-text-secondary)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <span
            className="text-xs font-semibold tabular-nums shrink-0"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            {currentStep}/{total}
          </span>
        </div>

        <div className="px-4 pb-3 max-w-lg mx-auto space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span style={{ color: "var(--surna-text-secondary)" }}>
              Step {currentStep}: {steps[currentStep - 1]?.label}
            </span>
            <span style={{ color: "var(--surna-text)" }}>{displayPercent}%</span>
          </div>
          <Progress value={displayPercent} className="h-1.5" />
          <div className="flex justify-between gap-1 pt-1">
            {steps.map((step) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                      done && "opacity-100",
                      !done && !active && "opacity-40",
                    )}
                    style={{
                      background: done || active ? "var(--surna-text)" : "var(--surna-elevated)",
                      color: done || active ? "var(--surna-base)" : "var(--surna-text-secondary)",
                      border: active ? "2px solid var(--surna-text)" : "1px solid var(--surna-separator)",
                      boxShadow: active ? "0 4px 14px rgba(0,0,0,0.12)" : undefined,
                    }}
                  >
                    {done ? <Check size={14} /> : Icon ? <Icon size={14} /> : step.id}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-medium text-center truncate w-full",
                      active ? "opacity-100" : "opacity-50",
                    )}
                    style={{ color: "var(--surna-text)" }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full pb-32">{children}</main>

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
      className="w-full py-3.5 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
      style={{
        background: isPrimary ? "var(--surna-text)" : "var(--surna-elevated)",
        color: isPrimary ? "var(--surna-base)" : "var(--surna-text)",
        border: isPrimary ? "none" : "1px solid var(--surna-separator)",
      }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : null}
      {label}
    </button>
  );
}
