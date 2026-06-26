import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { searchUsers } from "@/lib/searchUsers";
import { invitePlayerToTeam } from "@/lib/teamJoin";
import type { MyHubTeam } from "./MyHubTeamCard";

interface UserRow {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageUrl?: string;
}

interface Props {
  team: MyHubTeam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamInvitePlayerSheet({ team, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<UserRow | null>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["/api/search", "users", "team-invite", query],
    queryFn: () => searchUsers<UserRow>(query),
    enabled: open && query.trim().length >= 2,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!team || !selected) throw new Error("Pick someone to invite");
      await invitePlayerToTeam(team.id, selected.id, message.trim() || undefined);
    },
    onSuccess: () => {
      toast({ title: "Invite sent", description: `${displayName(selected)} will get a notification` });
      setQuery("");
      setMessage("");
      setSelected(null);
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't send invite",
        description: err.message ?? "Try again",
        variant: "destructive",
      });
    },
  });

  const displayName = (u: UserRow | null) =>
    u
      ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Athlete"
      : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-[var(--surna-border)] max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--surna-elevated)" }}
        data-testid="team-invite-player-sheet"
      >
        <SheetHeader>
          <SheetTitle style={{ color: "var(--surna-text)" }}>
            Invite a player
            {team ? ` · ${team.name}` : ""}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 pb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--surna-text-muted)" }}
            />
            <Input
              placeholder="Search by name or username"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              className="pl-9 rounded-xl"
              data-testid="team-invite-search"
            />
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--surna-text-muted)" }} />
            </div>
          )}

          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: "var(--surna-text-secondary)" }}>
              No users found
            </p>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.map((u) => {
              const name = displayName(u);
              const active = selected?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelected(u)}
                  className="w-full flex items-center gap-3 rounded-xl p-2.5 text-left border transition-colors"
                  style={{
                    borderColor: active ? "var(--surna-border)" : "transparent",
                    background: active ? "var(--surna-bg-highlight)" : "transparent",
                  }}
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={u.profileImageUrl || undefined} />
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--surna-text)" }}>
                      {name}
                    </p>
                    {u.username && (
                      <p className="text-xs truncate" style={{ color: "var(--surna-text-muted)" }}>
                        @{u.username}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <>
              <Textarea
                rows={2}
                placeholder="Optional note with your invite"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="rounded-xl"
              />
              <Button
                className="w-full rounded-2xl gap-2"
                disabled={inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
                data-testid="team-invite-send"
              >
                <UserPlus className="w-4 h-4" />
                {inviteMutation.isPending ? "Sending…" : `Invite ${displayName(selected)}`}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
