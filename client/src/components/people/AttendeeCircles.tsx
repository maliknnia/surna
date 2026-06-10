import type { CSSProperties } from "react";
import {
  attendeeCircleShell,
  attendeeInitialsStyle,
  attendeeOverflowStyle,
  ATTENDEE_CAPTION_ON_PHOTO,
  ATTENDEE_EMPTY_ON_PHOTO,
} from "@/components/people/attendeeCirclePalette";

export type AttendeeCirclePerson = {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  initials?: string;
};

const SIZE = 28;
const OVERLAP = 14;
const STEP = SIZE - OVERLAP;

const inter = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "Inter, sans-serif",
  ...extra,
});

function attendeeCaption(firstName: string, others: number): string {
  if (others <= 0) return `${firstName} is going`;
  if (others === 1) return `${firstName} and 1 other are going`;
  return `${firstName} and ${others} others are going`;
}

type AttendeeCirclesProps = {
  attendees: AttendeeCirclePerson[];
  totalCount: number;
  className?: string;
  compact?: boolean;
  onPhoto?: boolean;
};

export function AttendeeCircles({
  attendees,
  totalCount,
  className = "",
  compact = false,
  onPhoto = false,
}: AttendeeCirclesProps) {
  const captionColor = onPhoto ? ATTENDEE_CAPTION_ON_PHOTO : "var(--surna-text-muted)";

  if (totalCount <= 0) {
    return (
      <p
        className={className}
        style={inter({
          fontSize: 11,
          fontStyle: "italic",
          color: onPhoto ? ATTENDEE_EMPTY_ON_PHOTO : "var(--surna-text-muted)",
        })}
      >
        Be the first to join
      </p>
    );
  }

  const visible = attendees.slice(0, 4);
  const remaining = Math.max(0, totalCount - visible.length);
  const width = visible.length * STEP + (remaining > 0 ? STEP : 0) + (visible.length ? SIZE - STEP : 0);

  const first = visible[0]?.name?.split(" ")[0] || "Someone";
  const others = totalCount - 1;
  const overflowKey = visible.map((p) => p.id).join("-") || "overflow";

  return (
    <div className={className}>
      <div style={{ position: "relative", width: Math.max(width, SIZE), height: SIZE }}>
        {visible.map((person, index) => (
          <div
            key={person.id}
            style={{
              position: "absolute",
              left: index * STEP,
              width: SIZE,
              height: SIZE,
              borderRadius: "50%",
              overflow: "hidden",
              zIndex: index + 1,
              ...attendeeCircleShell(person.id, index),
            }}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={inter({
                fontWeight: 700,
                fontSize: 11,
                ...attendeeInitialsStyle(person.id, index),
              })}
            >
              {(person.initials || person.name?.charAt(0) || "?").slice(0, 2).toUpperCase()}
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div
            style={{
              position: "absolute",
              left: visible.length * STEP,
              width: SIZE,
              height: SIZE,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: visible.length + 1,
              ...attendeeOverflowStyle(overflowKey, visible.length),
            }}
            aria-hidden
          >
            <span style={inter({ fontWeight: 700, fontSize: 10, letterSpacing: "-0.02em" })}>
              +{remaining}
            </span>
          </div>
        )}
      </div>
      {!compact && (
        <p className="mt-1.5" style={inter({ fontWeight: 400, fontSize: 11, color: captionColor })}>
          {attendeeCaption(first, others)}
        </p>
      )}
    </div>
  );
}

export type AttendeeEntityType = "event" | "instant" | "game" | "challenge" | "team";

export function attendeeEntityPath(type: AttendeeEntityType, id: string): string {
  return `/api/attendees/${type}/${encodeURIComponent(id)}?limit=4`;
}
