import { EntityHighlightsRow } from "@/components/highlights/EntityHighlightsRow";

export function EventHighlights({ eventId, eventTitle }: { eventId: string; eventTitle?: string }) {
  return (
    <EntityHighlightsRow
      queryKey={["/api/events", eventId, "highlights"]}
      enabled={!!eventId}
      contextLabel={eventTitle ? `${eventTitle} highlights` : "Event highlights"}
      size="event"
    />
  );
}
