import { Lock } from "lucide-react";

export type AvatarStackPerson = {
  id: string;
  avatarUrl?: string;
  name?: string;
  isPrivate?: boolean;
};

const CIRCLE_FILL = "#ffffff";

type AvatarStackProps = {
  people: AvatarStackPerson[];
  /** Max faces shown before a +N chip (not forced — fewer people = fewer circles) */
  max?: number;
  size?: number;
  overlap?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function AvatarStack({
  people,
  max = 4,
  size = 28,
  overlap = 10,
  className = "",
  onClick,
}: AvatarStackProps) {
  const total = people.length;
  if (total === 0) return null;

  const showCount = Math.min(total, max);
  const visible = people.slice(0, showCount);
  const extra = total - showCount;
  const plusSize = Math.max(18, Math.round(size * 0.7));
  const step = size - overlap;

  const width =
    showCount * size -
    (showCount - 1) * overlap +
    (extra > 0 ? plusSize - overlap : 0);

  return (
    <div
      className={className}
      style={{ position: "relative", width, height: size, flexShrink: 0 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `${total} people` : undefined}
    >
      {visible.map((person, index) => (
        <div
          key={person.id}
          style={{
            position: "absolute",
            left: index * step,
            width: size,
            height: size,
            borderRadius: "50%",
            overflow: "hidden",
            background: CIRCLE_FILL,
            zIndex: showCount - index,
          }}
        >
          {person.isPrivate ? (
            <div className="w-full h-full flex items-center justify-center" style={{ background: CIRCLE_FILL }}>
              <Lock size={size * 0.36} style={{ color: "#8e8e93" }} />
            </div>
          ) : person.avatarUrl ? (
            <img
              src={person.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-bold"
              style={{
                background: CIRCLE_FILL,
                color: "#8e8e93",
                fontSize: Math.max(9, size * 0.34),
              }}
            >
              {(person.name || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{
            position: "absolute",
            left: showCount * step,
            width: plusSize,
            height: plusSize,
            top: (size - plusSize) / 2,
            borderRadius: "50%",
            background: CIRCLE_FILL,
            color: "#8e8e93",
            fontSize: Math.max(9, plusSize * 0.38),
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 0,
            lineHeight: 1,
          }}
          aria-hidden
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
