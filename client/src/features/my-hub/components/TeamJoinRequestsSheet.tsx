import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX, Inbox } from "lucide-react";
import type { MyHubTeam } from "./MyHubTeamCard";

interface JoinRequest {
  id: string;
  userId: string;
  message?: string | null;
  status: string;
  createdAt: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamJoinRequestsSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<JoinRequest[]>({
    queryKey: ["/api/teams", team?.id, "join-requests"],
    enabled: open && !!team?.id,
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const res = await apiRequest("PUT", `/api/teams/join-requests/${id}`, { decision });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title: vars.decision === "approved" ? "Request approved" : "Request declined",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", team?.id, "join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/me/managed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-hub/summary"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't update request",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const requests = Array.isArray(data) ? data : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[85vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="team-join-requests-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Join requests
            {team ? ` · ${team.name}` : ""}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4 pb-4">
          {isLoading && (
            <div className="space-y-2" data-testid="join-requests-loading">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl animate-pulse"
                  style={{
                    height: 72,
                    background: "var(--surna-bg-highlight)",
                  }}
                />
              ))}
            </div>
          )}
          {isError && (
            <div
              className="rounded-xl p-3 text-sm text-center"
              style={{
                background: "var(--surna-bg-highlight)",
                color: "var(--surna-text-secondary)",
              }}
            >
              Couldn't load join requests.
            </div>
          )}
          {!isLoading && !isError && requests.length === 0 && (
            <div
              className="flex flex-col items-center gap-2 py-8 text-center"
              style={{ color: "var(--surna-text-secondary)" }}
              data-testid="join-requests-empty"
            >
              <Inbox className="w-8 h-8" />
              <p className="text-sm">No pending requests</p>
            </div>
          )}
          {requests.map((r) => {
            const displayName =
              [r.firstName, r.lastName].filter(Boolean).join(" ") ||
              r.username ||
              "Member";
            return (
              <div
                key={r.id}
                className="rounded-xl p-3 flex items-start gap-3"
                style={{
                  background: "var(--surna-bg-highlight)",
                  border: "1px solid var(--surna-border)",
                }}
                data-testid={`join-request-${r.id}`}
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold"
                  style={{
                    background: "var(--surna-elevated)",
                    color: "var(--surna-text)",
                  }}
                >
                  {r.profileImageUrl ? (
                    <img src={r.profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                    {displayName}
                  </p>
                  {r.message && (
                    <p
                      className="text-xs mt-0.5 line-clamp-2"
                      style={{ color: "var(--surna-text-secondary)" }}
                    >
                      {r.message}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => decideMutation.mutate({ id: r.id, decision: "approved" })}
                      disabled={decideMutation.isPending}
                      data-testid={`approve-request-${r.id}`}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3"
                      onClick={() => decideMutation.mutate({ id: r.id, decision: "rejected" })}
                      disabled={decideMutation.isPending}
                      data-testid={`reject-request-${r.id}`}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
