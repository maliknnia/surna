// client/src/components/events/EventDetails.tsx
import { useEvent, useRSVP } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Calendar } from "lucide-react";

export default function EventDetails({ id }: { id: string }) {
  const { data: ev, status } = useEvent(id);
  const rsvp = useRSVP(id);

  if (status === "pending") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-8 bg-token-text/20 rounded mb-4"></div>
            <div className="h-4 bg-token-text/20 rounded mb-4 w-1/2"></div>
            <div className="h-20 bg-token-text/20 rounded mb-6"></div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-token-text/20 rounded"></div>
              <div className="h-10 w-24 bg-token-text/20 rounded"></div>
              <div className="h-10 w-24 bg-token-text/20 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-xl font-semibold mb-2">Event not found</h3>
            <p className="text-token-text-secondary">The event you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold text-token-text mb-4">{ev.title}</CardTitle>
              
              {/* Event metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-token-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-token-text" />
                  <div>
                    <p className="font-medium">{formatDate(ev.starts_at)}</p>
                    <p className="text-sm">{formatTime(ev.starts_at)} - {formatTime(ev.ends_at)}</p>
                  </div>
                </div>
                
                {ev.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-token-text" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm">{ev.location}</p>
                    </div>
                  </div>
                )}
                
                {ev.capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-token-text" />
                    <div>
                      <p className="font-medium">Capacity</p>
                      <p className="text-sm">{ev.capacity} participants</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-token-text"></div>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <Badge variant="outline" className="text-xs">
                      {ev.visibility === 'public' ? 'Public Event' : 
                       ev.visibility === 'private' ? 'Private Event' : 'Unlisted Event'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Description */}
          {ev.description && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">About this event</h3>
              <p className="text-token-text-secondary leading-relaxed whitespace-pre-wrap">{ev.description}</p>
            </div>
          )}

          {/* RSVP Actions */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Join this event</h3>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => rsvp.mutate({ status: "going", issueTicket: true })}
                disabled={rsvp.isPending}
                size="lg"
                className="bg-transparent border border-border hover:bg-background text-token-text"
                data-testid={`event-details-going-${ev.id}`}
              >
                {rsvp.isPending ? "Processing..." : "I'm going! 🎉"}
              </Button>
              <Button
                onClick={() => rsvp.mutate({ status: "interested" })}
                disabled={rsvp.isPending}
                size="lg"
                variant="outline"
                className="/30 text-token-text hover:bg-transparent border border-border"
                data-testid={`event-details-interested-${ev.id}`}
              >
                {rsvp.isPending ? "Processing..." : "Interested 👀"}
              </Button>
              <Button
                onClick={() => rsvp.mutate({ status: "not_going" })}
                disabled={rsvp.isPending}
                size="lg"
                variant="outline"
                className="/30 text-token-text hover:bg-transparent border border-border"
                data-testid={`event-details-not-going-${ev.id}`}
              >
                {rsvp.isPending ? "Processing..." : "Can't attend"}
              </Button>
            </div>
            
            {rsvp.isError && (
              <p className="text-token-text text-sm mt-2">
                Failed to update RSVP. Please try again.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}