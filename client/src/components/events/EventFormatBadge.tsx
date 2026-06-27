import {
  EVENT_FORMAT_META,
  normalizeEventFormat,
  type EventFormat,
} from "@shared/eventFormats";

type EventFormatBadgeProps = {
  format?: string | null;
  accentColor?: string;
  className?: string;
};

export default function EventFormatBadge({
  format,
  accentColor = "var(--surna-accent, #6366f1)",
  className = "",
}: EventFormatBadgeProps) {
  const resolved = normalizeEventFormat(format);
  if (resolved === "open") return null;

  const meta = EVENT_FORMAT_META[resolved as EventFormat];

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{
        background: `${accentColor}18`,
        color: accentColor,
        border: `1px solid ${accentColor}35`,
      }}
    >
      {meta.shortLabel}
    </span>
  );
}
