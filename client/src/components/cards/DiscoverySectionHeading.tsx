import type { ReactNode } from "react";

export function DiscoverySectionHeading({
  children,
  count,
  className = "",
}: {
  children: ReactNode;
  count?: number;
  className?: string;
}) {
  return (
    <h2 className={`discovery-section-heading ${className}`.trim()}>
      <span>{children}</span>
      {count !== undefined && count > 0 ? (
        <span className="discovery-section-heading__count">{count}</span>
      ) : null}
    </h2>
  );
}

export const DISCOVERY_SECTION_LABELS = {
  events: {
    forYou: "For you",
    nearYou: "Near you",
    live: "Happening now",
    today: "Today",
    tomorrow: "Tomorrow",
    thisWeek: "This week",
    later: "Coming up",
  },
  teams: ["For you", "Near you", "New on SURNA", "Trending"],
  venues: ["Near you", "Worth exploring", "Popular venues", "More to discover"],
} as const;
