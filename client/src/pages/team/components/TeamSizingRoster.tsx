import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Shirt, User } from "lucide-react";
import { ROUTES } from "@/navigation";
import { formatHeightCm, isGearProfileReadyForKit } from "@shared/gearProfile";
import { isDemoTeamId, normalizeDemoTeamId } from "@/lib/demoTeams";
import type { GearProfileSummary } from "@shared/gearProfile";

export type SizingRosterRow = {
  memberId: string;
  userId: string;
  role?: string | null;
  name: string;
  profileImageUrl?: string | null;
  kitReady: boolean;
  missingFields?: string[];
  gear: GearProfileSummary | null;
};

type SizingRosterResponse = {
  canManage: boolean;
  readyCount: number;
  totalCount: number;
  roster: SizingRosterRow[];
};

function demoSizingRoster(teamId: string): SizingRosterResponse {
  const sizes = ["S", "M", "L", "XL"] as const;
  const shoes = ["40", "41", "42", "43", "44"] as const;
  const roster: SizingRosterRow[] = Array.from({ length: 8 }, (_, i) => ({
    memberId: `${teamId}-m-${i}`,
    userId: `demo-user-${i}`,
    role: i === 0 ? "captain" : "member",
    name: `Player ${i + 1}`,
    kitReady: i !== 3 && i !== 6,
    missingFields: i === 3 ? ["shirt size", "shoe size"] : i === 6 ? ["height"] : undefined,
    gear:
      i === 3 || i === 6
        ? null
        : {
            heightCm: 170 + i * 2,
            shirtSize: sizes[i % sizes.length],
            shoeSizeEu: shoes[i % shoes.length],
            preferredJerseyNumber: i + 1,
          },
  }));
  return {
    canManage: true,
    readyCount: roster.filter((r) => r.kitReady).length,
    totalCount: roster.length,
    roster,
  };
}

export default function TeamSizingRoster({
  teamId,
  canManage = false,
  viewerUserId,
}: {
  teamId: string;
  canManage?: boolean;
  viewerUserId?: string;
}) {
  const normalizedId = normalizeDemoTeamId(teamId);

  const { data, isLoading } = useQuery<SizingRosterResponse>({
    queryKey: ["/api/teams", normalizedId, "sizing-roster"],
    queryFn: async () => {
      if (isDemoTeamId(normalizedId)) return demoSizingRoster(normalizedId);
      const res = await fetch(`/api/teams/${normalizedId}/sizing-roster`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sizing roster");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card animate-pulse h-24 mb-4" />
    );
  }

  if (!data) return null;

  const showFullTable = data.canManage || canManage;
  const viewerRow = viewerUserId
    ? data.roster.find((r) => r.userId === viewerUserId)
    : undefined;
  const viewerNeedsKit = viewerRow && !isGearProfileReadyForKit(viewerRow.gear);

  return (
    <div className="glass-card mb-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shirt size={16} className="text-muted-foreground" />
            <h3 className="text-[14px] font-bold text-foreground">Kit & sizing</h3>
          </div>
          <p className="text-[12px] text-muted-foreground">
            {data.readyCount}/{data.totalCount} players kit-ready for team orders
          </p>
        </div>
        {viewerNeedsKit ? (
          <Link href={ROUTES.profileEdit}>
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground">
              Add my sizes
            </span>
          </Link>
        ) : null}
      </div>

      {viewerNeedsKit && !showFullTable ? (
        <p className="text-[12px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <AlertCircle size={14} />
          Add shirt & shoe size so your captain can order team kit for you.
        </p>
      ) : null}

      {showFullTable ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] min-w-[480px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-1 font-semibold">Player</th>
                <th className="text-left py-2 px-1 font-semibold">Shirt</th>
                <th className="text-left py-2 px-1 font-semibold">Shoe</th>
                <th className="text-left py-2 px-1 font-semibold">Height</th>
                <th className="text-left py-2 px-1 font-semibold">#</th>
                <th className="text-left py-2 px-1 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.roster.map((row) => (
                <tr key={row.memberId} className="border-b border-border/50 last:border-0">
                  <td className="py-2 px-1 font-medium text-foreground truncate max-w-[100px]">{row.name}</td>
                  <td className="py-2 px-1 text-foreground">{row.gear?.shirtSize ?? "—"}</td>
                  <td className="py-2 px-1 text-foreground">{row.gear?.shoeSizeEu ? `EU ${row.gear.shoeSizeEu}` : "—"}</td>
                  <td className="py-2 px-1 text-muted-foreground">{formatHeightCm(row.gear?.heightCm)}</td>
                  <td className="py-2 px-1 text-muted-foreground">{row.gear?.preferredJerseyNumber ?? "—"}</td>
                  <td className="py-2 px-1">
                    {row.kitReady ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={12} /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                        <AlertCircle size={12} /> Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewerRow?.gear ? (
        <div className="rounded-xl p-3 bg-muted/30 border border-border text-[12px] space-y-1">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <User size={14} /> Your sizing
          </p>
          <p className="text-muted-foreground">
            Shirt {viewerRow.gear.shirtSize ?? "—"} · Shoe EU {viewerRow.gear.shoeSizeEu ?? "—"} ·{" "}
            {formatHeightCm(viewerRow.gear.heightCm)}
          </p>
        </div>
      ) : null}

      {showFullTable && data.readyCount < data.totalCount ? (
        <p className="text-[11px] text-muted-foreground">
          Team bulk ordering from the marketplace is coming next — this roster feeds straight into it.
        </p>
      ) : null}
    </div>
  );
}
