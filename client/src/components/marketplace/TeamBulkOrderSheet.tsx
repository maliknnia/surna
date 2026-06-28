import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AlertCircle, CheckCircle2, ShoppingCart, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ROUTES } from "@/navigation";
import type { TeamBulkLine, TeamBulkPreview } from "@shared/teamBulkOrder";

type ManagedTeam = { id: string; name: string; myRole?: string };

const STATUS_LABEL: Record<TeamBulkLine["status"], string> = {
  ready: "Ready",
  missing_size: "No size on profile",
  no_variant: "Size not sold",
  out_of_stock: "Out of stock",
};

export default function TeamBulkOrderSheet({
  open,
  onClose,
  productId,
  productTitle,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [teamId, setTeamId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: managedTeams } = useQuery<ManagedTeam[]>({
    queryKey: ["/api/teams/me/managed"],
    queryFn: async () => {
      const res = await fetch("/api/teams/me/managed", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (managedTeams?.length && !teamId) {
      setTeamId(managedTeams[0].id);
    }
  }, [open, managedTeams, teamId]);

  const { data: preview, isLoading: previewLoading } = useQuery<TeamBulkPreview>({
    queryKey: ["/api/marketplace/team-orders/preview", productId, teamId],
    queryFn: async () => {
      const params = new URLSearchParams({ productId, teamId });
      const res = await fetch(`/api/marketplace/team-orders/preview?${params}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to load preview");
      }
      return res.json();
    },
    enabled: open && !!teamId,
  });

  useEffect(() => {
    if (!preview) return;
    setSelectedIds(new Set(preview.lines.filter((l) => l.status === "ready").map((l) => l.userId)));
  }, [preview?.teamId, preview?.productId, preview?.lines.length]);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/marketplace/team-orders/add-to-cart", {
        productId,
        teamId,
        memberUserIds: Array.from(selectedIds),
      });
      return res.json() as Promise<{ addedCount: number; skippedCount: number }>;
    },
    onSuccess: (data: { addedCount: number; skippedCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/cart"] });
      toast({
        title: "Team order added to cart",
        description: `${data.addedCount} player line(s) added${data.skippedCount ? ` · ${data.skippedCount} skipped` : ""}.`,
      });
      onClose();
      setLocation("/marketplace/cart");
    },
    onError: (err: Error) => {
      toast({
        title: "Could not add team order",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!open) return null;

  const readySelected = preview?.lines.filter((l) => selectedIds.has(l.userId) && l.status === "ready").length ?? 0;

  const toggleLine = (userId: string, status: TeamBulkLine["status"]) => {
    if (status !== "ready") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-background border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-primary" />
              <h2 className="text-[16px] font-bold text-foreground">Order for team</h2>
            </div>
            <p className="text-[12px] text-muted-foreground line-clamp-2">{productTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted/40" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {!managedTeams?.length ? (
            <p className="text-[13px] text-muted-foreground">
              You need to captain or co-captain a team to use bulk ordering.
            </p>
          ) : (
            <>
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground">Team</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px]"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  {managedTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {previewLoading ? (
                <div className="h-32 rounded-xl bg-muted/30 animate-pulse" />
              ) : preview ? (
                <>
                  <p className="text-[12px] text-muted-foreground">
                    {preview.readyCount}/{preview.totalCount} players matched to a size — sizes come from each player&apos;s kit profile.
                  </p>

                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="text-left p-2 w-8" />
                          <th className="text-left p-2">Player</th>
                          <th className="text-left p-2">Size</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.lines.map((line) => {
                          const checked = selectedIds.has(line.userId);
                          const isReady = line.status === "ready";
                          return (
                            <tr key={line.userId} className="border-t border-border/60">
                              <td className="p-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!isReady}
                                  onChange={() => toggleLine(line.userId, line.status)}
                                />
                              </td>
                              <td className="p-2 font-medium text-foreground">{line.name}</td>
                              <td className="p-2 text-muted-foreground">
                                {line.variantLabel ?? line.sizeLabel ?? "—"}
                                {line.jerseyNumber != null ? ` #${line.jerseyNumber}` : ""}
                              </td>
                              <td className="p-2">
                                {isReady ? (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-600">
                                    <CheckCircle2 size={12} /> {STATUS_LABEL[line.status]}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                                    <AlertCircle size={12} /> {STATUS_LABEL[line.status]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {preview.readyCount < preview.totalCount ? (
                    <p className="text-[11px] text-muted-foreground">
                      Missing sizes? Ask players to fill{" "}
                      <Link href={ROUTES.profileEdit} className="underline">Kit & sizing</Link> on their profile.
                    </p>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full text-[14px] font-semibold border border-border"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!teamId || readySelected === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
            className="flex-1 py-3 rounded-full text-[14px] font-bold bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            {addMutation.isPending ? "Adding…" : `Add ${readySelected} to cart`}
          </button>
        </div>
      </div>
    </div>
  );
}
