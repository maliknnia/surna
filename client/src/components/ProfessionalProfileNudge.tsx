import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    <div
      className="mx-4 mt-3 rounded-2xl p-4 flex gap-3 items-start"
      style={{
        background: "linear-gradient(135deg, var(--surna-elevated) 0%, var(--surna-bg-highlight) 100%)",
        border: "1px solid var(--surna-border)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
          Complete your professional profile
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--surna-text-secondary)" }}>
          {nudge.message}
        </p>
        <Link href="/profile/edit">
          <button
            type="button"
            className="text-xs font-bold px-3 py-1.5 rounded-full mt-2"
            style={{ background: "var(--surna-text)", color: "var(--surna-bg)" }}
          >
            Add sport details
          </button>
        </Link>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="shrink-0 p-1 rounded-full transition-colors"
        style={{ color: "var(--surna-text-muted)" }}
        onClick={() => dismiss.mutate(nudge.milestone)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
