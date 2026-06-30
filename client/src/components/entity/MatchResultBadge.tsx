import { cn } from "@/lib/utils";

type ResultKind = "win" | "loss" | "draw";

const CONFIG: Record<ResultKind, { label: string; dot: string }> = {
  win: { label: "Win", dot: "#30D158" },
  loss: { label: "Loss", dot: "#FF453A" },
  draw: { label: "Draw", dot: "#8E8E93" },
};

export function MatchResultBadge({
  result,
  compact = false,
  className,
}: {
  result: ResultKind | "W" | "L" | "D";
  compact?: boolean;
  className?: string;
}) {
  const kind: ResultKind =
    result === "W" || result === "win"
      ? "win"
      : result === "L" || result === "loss"
        ? "loss"
        : "draw";
  const { label, dot } = CONFIG[kind];
  const text = compact ? (kind === "win" ? "W" : kind === "loss" ? "L" : "D") : label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]",
        className,
      )}
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
        color: "var(--surna-text)",
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{ width: compact ? 5 : 6, height: compact ? 5 : 6, background: dot }}
        aria-hidden
      />
      {text}
    </span>
  );
}
