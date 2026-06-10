import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserMinus, UserPlus, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type FamilyMember = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
  displayName?: string | null;
};

type FollowingUser = FamilyMember;

interface FamilyCircleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FamilyCircleSheet({ open, onOpenChange }: FamilyCircleSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: family = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/presence/family"],
    enabled: open,
  });

  const { data: following = [] } = useQuery<FollowingUser[]>({
    queryKey: ["/api/users", user?.id, "following"],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.id}/following`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const familyIds = new Set(family.map((m) => m.id));

  const addMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("POST", "/api/presence/family", { memberId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presence/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presence/me"] });
      toast({ title: "Added to family", description: "They can see you when family sharing is on." });
    },
    onError: () => {
      toast({ title: "Could not add", variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/presence/family/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presence/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/presence/me"] });
    },
  });

  const q = search.trim().toLowerCase();
  const suggestions = following.filter((u) => {
    if (familyIds.has(u.id)) return false;
    if (!q) return true;
    const name = [u.firstName, u.lastName, u.username, u.displayName].filter(Boolean).join(" ").toLowerCase();
    return name.includes(q);
  });

  const label = (u: FamilyMember) =>
    u.displayName ||
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    u.username ||
    "User";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Family list</SheetTitle>
          <SheetDescription>
            People here can see your location when you choose Family sharing. Friends must be on SURNA.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : family.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No one in your family list yet. Add people you trust below.
            </p>
          ) : (
            <ul className="space-y-2">
              {family.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profileImageUrl || undefined} />
                    <AvatarFallback>{label(member).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium truncate">{label(member)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove from family"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(member.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Add from people you follow
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-9"
              />
            </div>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {suggestions.length === 0 ? (
                <li className="text-xs text-muted-foreground py-2 text-center">
                  {following.length === 0
                    ? "Follow people first, then add them to family."
                    : "No matches."}
                </li>
              ) : (
                suggestions.slice(0, 20).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.profileImageUrl || undefined} />
                      <AvatarFallback>{label(u).charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">{label(u)}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={addMutation.isPending}
                      onClick={() => addMutation.mutate(u.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
