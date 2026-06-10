import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import CreateTeamForm from "@/components/CreateTeamForm";
import { ROUTES } from "@/navigation";
import { createHubPath } from "@/lib/createHub";
import { invalidateMyHubQueries } from "@/lib/hubQueries";

export default function CreateTeamPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-background pt-4 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        <CreateTeamForm
          onSuccess={async () => {
            await invalidateMyHubQueries(queryClient);
            navigate(ROUTES.myHubTeams);
          }}
          onCancel={() => navigate(createHubPath("team"))}
        />
      </div>
    </div>
  );
}
