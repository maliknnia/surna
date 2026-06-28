import { EntityHighlightsRow } from "@/components/highlights/EntityHighlightsRow";

export function PlaceHighlights({ placeId, placeName }: { placeId: string; placeName?: string }) {
  return (
    <EntityHighlightsRow
      queryKey={["/api/places", placeId, "highlights"]}
      enabled={!!placeId}
      contextLabel={placeName ? `${placeName} highlights` : "Venue highlights"}
      size="place"
      paddingX="px-5"
      className="place-highlights-row"
    />
  );
}
