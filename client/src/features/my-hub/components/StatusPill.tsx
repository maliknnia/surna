interface Props {
  count?: number;
  tone?: "default" | "alert";
  label?: string;
}

/**
 * Small monochrome pill used across My Hub. Supports two modes:
 *   - Count mode: <StatusPill count={3} label="new" /> → "3 new"
 *     (renders nothing when count <= 0).
 *   - Label-only mode: <StatusPill label="Cancelled" /> → "Cancelled"
 *     Used to badge entity status (e.g. event lifecycle on EntityCard).
 */
export function StatusPill({ count, tone = "default", label }: Props) {
  const hasCount = typeof count === "number";
  if (hasCount && (count as number) <= 0) return null;
  const isAlert = tone === "alert";
  const text = hasCount
    ? label
      ? `${count} ${label}`
      : String(count)
    : label ?? "";
  if (!text) return null;
  return (
    <span
      className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center justify-center min-w-[22px]"
      style={{
        background: isAlert ? "var(--surna-text)" : "var(--surna-bg-highlight)",
        color: isAlert ? "var(--surna-bg)" : "var(--surna-text)",
      }}
      data-testid="status-pill"
    >
      {text}
    </span>
  );
}
