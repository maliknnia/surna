import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { EntityEmptyState, EntityListSkeleton, entityCardStyle } from "@/components/entity";
import { ROUTES } from "@/navigation";

type ProfileEventsPanelProps = {
  userId: string;
  isOwnProfile: boolean;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  location?: string | { name?: string; address?: string } | null;
  category?: string | null;
};

function locationLabel(loc: EventRow["location"]): string | null {
  if (!loc) return null;
  if (typeof loc === "string") return loc;
  return loc.address || loc.name || null;
}

export function ProfileEventsPanel({ userId, isOwnProfile }: ProfileEventsPanelProps) {
  const { data: apiEvents = [], isLoading } = useQuery<EventRow[]>({
    queryKey: ["/api/users", userId, "events-attended"],
    queryFn: getQueryFn({ on401: "returnNull" }) as () => Promise<EventRow[]>,
    enabled: !!userId,
  });

  if (isLoading) return <EntityListSkeleton rows={2} rowHeight={112} />;

  if (apiEvents.length === 0) {
    return (
      <EntityEmptyState
        icon={Calendar}
        title="No events yet"
        description={
          isOwnProfile
            ? "RSVP to events near you — they'll appear on your profile and calendar."
            : "This athlete hasn't attended any events yet."
        }
        actionLabel={isOwnProfile ? "Find events" : undefined}
        actionHref={isOwnProfile ? ROUTES.events : undefined}
        compact
      />
    );
  }

  return (
    <div className="space-y-3">
      {apiEvents.map((event) => {
        const loc = locationLabel(event.location);
        return (
          <Link key={event.id} href={ROUTES.event(event.id)}>
            <button
              type="button"
              className="w-full p-4 rounded-2xl text-left active:opacity-90"
              style={entityCardStyle}
              data-testid={`profile-event-${event.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold" style={{ color: "var(--surna-text)" }}>
                    {event.title}
                  </div>
                  {event.category ? (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: "var(--surna-base)", color: "var(--surna-text-secondary)" }}
                    >
                      {event.category}
                    </span>
                  ) : null}
                  <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(event.starts_at), "MMM d, yyyy · h:mm a")}
                  </div>
                  {loc ? (
                    <div className="flex items-center gap-1.5 mt-1 text-[12px]" style={{ color: "var(--surna-text-secondary)" }}>
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{loc}</span>
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 mt-1" style={{ color: "var(--surna-text-secondary)" }} />
              </div>
            </button>
          </Link>
        );
      })}
    </div>
  );
}
