import { Navigation, Users } from "lucide-react";
import {
  EVENT_FORMAT_META,
  normalizeEventFormat,
  parseEventLineup,
  type EventFormat,
  type EventLineup,
} from "@shared/eventFormats";

type EventFormatHeroProps = {
  format?: string | null;
  lineup?: EventLineup | unknown | null;
  title?: string;
  accentColor?: string;
  className?: string;
};

export default function EventFormatHero({
  format,
  lineup: lineupRaw,
  title = "",
  accentColor = "#6366f1",
  className = "",
}: EventFormatHeroProps) {
  const resolved = normalizeEventFormat(format);
  if (resolved === "open") return null;

  const lineup = typeof lineupRaw === "object" && lineupRaw !== null && !Array.isArray(lineupRaw)
    ? (lineupRaw as EventLineup)
    : parseEventLineup(lineupRaw);
  const meta = EVENT_FORMAT_META[resolved as EventFormat];

  if (resolved === "versus") {
    const sides = lineup?.sides ?? [];
    const left = sides[0];
    const right = sides[1];
    if (!left?.label && !right?.label) return null;

    return (
      <div className={`w-full max-w-sm mx-auto mb-4 ${className}`}>
        <p
          className="text-[10px] font-bold uppercase tracking-widest text-center mb-3"
          style={{ color: accentColor }}
        >
          {meta.label}
        </p>
        <div
          className="rounded-2xl p-4 border backdrop-blur-sm"
          style={{
            borderColor: `${accentColor}30`,
            background: `linear-gradient(135deg, ${accentColor}12, transparent)`,
          }}
        >
          <div className="flex items-stretch gap-3">
            <SideBlock label={left?.label ?? "TBD"} meta={left?.meta} accentColor={accentColor} align="right" />
            <div className="flex flex-col items-center justify-center shrink-0 px-1">
              <span
                className="text-[11px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg"
                style={{ background: accentColor, color: "#fff" }}
              >
                VS
              </span>
            </div>
            <SideBlock label={right?.label ?? "TBD"} meta={right?.meta} accentColor={accentColor} align="left" />
          </div>
        </div>
      </div>
    );
  }

  if (resolved === "lineup") {
    const headliner = lineup?.headliner?.trim() || title.trim();
    const acts = lineup?.acts ?? [];
    if (!headliner && acts.length === 0) return null;

    return (
      <div className={`w-full max-w-sm mx-auto mb-4 ${className}`}>
        <p
          className="text-[10px] font-bold uppercase tracking-widest text-center mb-3"
          style={{ color: accentColor }}
        >
          {meta.label}
        </p>
        <div
          className="rounded-2xl p-5 border text-center backdrop-blur-sm"
          style={{
            borderColor: `${accentColor}30`,
            background: `linear-gradient(180deg, ${accentColor}14, transparent)`,
          }}
        >
          {headliner ? (
            <p className="text-[22px] font-extrabold leading-tight text-foreground">{headliner}</p>
          ) : null}
          {acts.length > 0 ? (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Also on the bill
              </p>
              {acts.map((act, i) => (
                <p key={i} className="text-[13px] font-medium text-muted-foreground">
                  {act.name}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (resolved === "route") {
    const km = lineup?.route?.distanceKm;
    return (
      <div className={`w-full max-w-sm mx-auto mb-4 ${className}`}>
        <div
          className="rounded-2xl px-4 py-3 border flex items-center justify-center gap-3 backdrop-blur-sm"
          style={{
            borderColor: `${accentColor}30`,
            background: `${accentColor}10`,
          }}
        >
          <Navigation size={18} style={{ color: accentColor }} />
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
              {meta.label}
            </p>
            <p className="text-[13px] font-semibold text-foreground">
              {km ? `${km} km` : "GPS route event"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function SideBlock({
  label,
  meta,
  accentColor,
  align,
}: {
  label: string;
  meta?: { weightClass?: string; subtitle?: string };
  accentColor: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex-1 min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <p className="text-[15px] font-extrabold leading-snug text-foreground truncate">{label}</p>
      {meta?.weightClass ? (
        <p className="text-[11px] font-medium mt-0.5 text-muted-foreground">{meta.weightClass}</p>
      ) : null}
      {meta?.subtitle ? (
        <p className="text-[10px] mt-0.5 text-muted-foreground">{meta.subtitle}</p>
      ) : null}
      <div
        className={`mt-2 h-0.5 rounded-full ${align === "right" ? "ml-auto" : "mr-auto"}`}
        style={{ width: "40%", background: accentColor, opacity: 0.5 }}
      />
    </div>
  );
}

export function FormatPickerIcon({ format }: { format: EventFormat }) {
  if (format === "open") return <Users size={18} />;
  if (format === "route") return <Navigation size={18} />;
  return null;
}
