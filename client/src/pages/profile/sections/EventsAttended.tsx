import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { getQueryFn } from '@/lib/queryClient';

interface AttendedEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: any;
  category?: string | null;
}

interface EventsAttendedProps {
  userId: string;
}

function locationLabel(loc: any): string | null {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return loc.address || loc.name || null;
}

export default function EventsAttended({ userId }: EventsAttendedProps) {
  const { data: events = [], isLoading } = useQuery<AttendedEvent[]>({
    queryKey: ['/api/users', userId, 'events-attended'],
    queryFn: getQueryFn({ on401: 'returnNull' }) as any,
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-3xl mx-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted/40 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No events attended yet</p>
        <p className="text-muted-foreground/60 text-sm mt-2">Past events you went to will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {events.map((event) => {
        const loc = locationLabel(event.location);
        return (
          <div
            key={event.id}
            className="p-5 rounded-2xl border border-border bg-background"
            data-testid={`attended-event-${event.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">{event.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide bg-muted text-muted-foreground">
                    Attended
                  </span>
                  {event.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide bg-muted text-muted-foreground">
                      {event.category}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} />
                    <span className="text-sm">{format(new Date(event.starts_at), 'PPP · p')}</span>
                  </div>
                  {loc && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={14} />
                      <span className="text-sm">{loc}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={() => (window.location.href = `/events/${event.id}`)}
                variant="outline"
                size="sm"
                data-testid={`button-view-attended-${event.id}`}
              >
                View
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
