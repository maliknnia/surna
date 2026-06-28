import { EntityHighlightsRow } from "@/components/highlights/EntityHighlightsRow";

export default function TeamHighlights({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName?: string;
}) {
  return (
    <EntityHighlightsRow
      queryKey={["/api/teams", teamId, "highlights"]}
      enabled={!!teamId}
      contextLabel={teamName ? `${teamName} highlights` : "Highlights"}
      size="team"
      paddingX="px-5"
      className="team-highlights-row"
    />
  );
}
