import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  SectionHeader,
  EmptyState,
  UpgradePromptCard,
  MyHubEventCard,
  EditEventSheet,
  type MyHubEvent,
} from "@/features/my-hub/components";
import { HubSubpageHeader } from "@/components/create/HubSubpageHeader";
import { createHubPath } from "@/lib/createHub";

interface EventsResponse {
  upcoming: MyHubEvent[];
  past: MyHubEvent[];
  drafts: MyHubEvent[];
  cancelled: MyHubEvent[];
}

export default function MyHubEventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<MyHubEvent | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<EventsResponse>({
    queryKey: ["/api/events/me/organized"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      // Reuse the canonical event update endpoint to soft-cancel.
      await apiRequest("PATCH", `/api/events/${id}`, { status: "cancelled" });
    },
    onSuccess: () => {
      toast({ title: "Event cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/events/me/organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't cancel event",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (ev: MyHubEvent) => {
    setEditing(ev);
    setEditOpen(true);
  };

  const handleCancel = (ev: MyHubEvent) => {
    const ok = window.confirm(`Cancel "${ev.title}"? This can't be undone.`);
    if (!ok) return;
    cancelMutation.mutate(ev.id);
  };

  const handleShare = async (ev: MyHubEvent) => {
    const url = `${window.location.origin}/events/${ev.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: ev.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Event link copied to clipboard" });
    } catch {
      // User cancelled share — no-op
    }
  };

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const drafts = data?.drafts ?? [];
  const cancelled = data?.cancelled ?? [];
  const totalCount = upcoming.length + past.length + drafts.length + cancelled.length;
  const showEmpty = !isLoading && !isError && totalCount === 0;

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-events-page"
    >
      <HubSubpageHeader title="My Events" createType="event" testId="my-hub-events-title" />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3" data-testid="events-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: 180,
                  background: "var(--surna-elevated)",
                  border: "1px solid var(--surna-border)",
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div
            className="rounded-2xl p-4 text-center text-sm"
            style={{
              background: "var(--surna-elevated)",
              border: "1px solid var(--surna-border)",
              color: "var(--surna-text-secondary)",
            }}
            data-testid="events-error"
          >
            Couldn't load your events. Please try again.
          </div>
        )}

        {/* Empty */}
        {showEmpty && (
          <EmptyState
            icon={CalendarPlus}
            title="You haven't created any events yet"
            description="Set up a kickaround, training session or tournament — it takes under a minute."
            ctaLabel="Create one"
            ctaHref={createHubPath("event")}
            testId="events-empty-state"
          />
        )}

        {/* Sections */}
        {!isLoading && !isError && totalCount > 0 && (
          <>
            {upcoming.length > 0 && (
              <section>
                <SectionHeader
                  title="Upcoming"
                  subtitle={`${upcoming.length} event${upcoming.length === 1 ? "" : "s"} coming up`}
                />
                <div className="space-y-3">
                  {upcoming.map((ev) => (
                    <MyHubEventCard
                      key={ev.id}
                      ev={ev}
                      variant="upcoming"
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </section>
            )}

            {drafts.length > 0 && (
              <section>
                <SectionHeader title="Drafts" />
                <div className="space-y-3">
                  {drafts.map((ev) => (
                    <MyHubEventCard
                      key={ev.id}
                      ev={ev}
                      variant="drafts"
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <SectionHeader title="Past" />
                <div className="space-y-3">
                  {past.map((ev) => (
                    <MyHubEventCard
                      key={ev.id}
                      ev={ev}
                      variant="past"
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section>
                <SectionHeader title="Cancelled" />
                <div className="space-y-3">
                  {cancelled.map((ev) => (
                    <MyHubEventCard
                      key={ev.id}
                      ev={ev}
                      variant="cancelled"
                      onEdit={handleEdit}
                      onCancel={handleCancel}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <UpgradePromptCard
          title="Run events like a pro"
          description="Recurring leagues, attendee analytics, bulk messaging and promoted events live in SURNA Pro."
        />

        <div className="h-4" />
      </div>

      <EditEventSheet
        event={editing}
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}
