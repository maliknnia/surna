import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { Link } from "wouter";

type Nudge = {
  milestone: string;
  message: string;
  triggeredAt: string;
};

export default function ProfessionalProfileNudge() {
  const queryClient = useQueryClient();

  const { data } = useQuery<{ nudges: Nudge[] }>({
    queryKey: ["/api/profile/nudges"],
    queryFn: async () => {
      const res = await fetch("/api/profile/nudges", { credentials: "include" });
      if (!res.ok) return { nudges: [] };
      return res.json();
    },
    refetchInterval: 60000,
  });

  const dismiss = useMutation({
    mutationFn: async (milestone: string) => {
      await fetch(`/api/profile/nudges/${milestone}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/nudges"] });
    },
  });

  const nudge = data?.nudges?.[0];
  if (!nudge) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-border bg-card p-4 flex gap-3 items-start shadow-sm">
      <Sparkles className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Complete your professional profile</p>
        <p className="text-xs text-muted-foreground mt-1">{nudge.message}</p>
        <Link href="/profile/edit">
          <Button size="sm" className="mt-2 h-8" variant="secondary">
            Add sport details
          </Button>
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => dismiss.mutate(nudge.milestone)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
