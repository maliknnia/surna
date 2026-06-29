import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Shirt } from "lucide-react";
import { ROUTES } from "@/navigation";
import { EntityListSkeleton } from "@/components/entity";
import { isDemoTeamId, normalizeDemoTeamId } from "@/lib/demoTeams";
import { TeamSectionCard } from "./TeamSectionCard";

type SizingRosterResponse = {
  canManage: boolean;
  readyCount?: number;
  totalCount?: number;
  viewerNeedsKit?: boolean;
  roster?: Array<{
    memberId: string;
    userId: string;
    role?: string | null;
    name: string;
    kitReady: boolean;
    gear: {
      heightCm?: number;
      shirtSize?: string;
      shoeSizeEu?: string;
      preferredJerseyNumber?: number;
    } | null;
  }>;
};

function demoSizingRoster(canManage: boolean): SizingRosterResponse {
  if (!canManage) {
    return { canManage: false, viewerNeedsKit: true, roster: [] };
  }
  const sizes = ["S", "M", "L", "XL"] as const;
  const shoes = ["40", "41", "42", "43", "44"] as const;
  const roster = Array.from({ length: 8 }, (_, i) => ({
    memberId: `demo-m-${i}`,
    userId: `demo-user-${i}`,
    role: i === 0 ? "captain" : "member",
    name: `Player ${i + 1}`,
    kitReady: i !== 3 && i !== 6,
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

/** Kit sizing — captains/managers only. Teammates get a private add-sizes CTA. */
export default function TeamSizingRoster({
  teamId,
  canManage = false,
  isMember = false,
}: {
  teamId: string;
  canManage?: boolean;
  isMember?: boolean;
}) {
  const normalizedId = normalizeDemoTeamId(teamId);
  const showBlock = canManage || isMember;
  if (!showBlock) return null;

  const { data, isLoading } = useQuery<SizingRosterResponse>({
    queryKey: ["/api/teams", normalizedId, "sizing-roster"],
    queryFn: async () => {
      if (isDemoTeamId(normalizedId)) return demoSizingRoster(canManage);
      const res = await fetch(`/api/teams/${normalizedId}/sizing-roster`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load sizing roster");
      return res.json();
    },
    enabled: showBlock,
  });

  if (isLoading) return <EntityListSkeleton rows={1} rowHeight={72} />;

  if (!data) return null;

  const managerView = canManage || data.canManage;

  if (managerView) {
    const roster = data.roster ?? [];
    const readyCount = data.readyCount ?? roster.filter((r) => r.kitReady).length;
    const totalCount = data.totalCount ?? roster.length;

    return (
      <TeamSectionCard
        title="Kit & sizing"
        action={
          <span className="text-[11px] font-semibold" style={{ color: "var(--surna-text-secondary)" }}>
            {readyCount}/{totalCount} ready
          </span>
        }
      >
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[11px] min-w-[480px]">
            <thead>
              <tr style={{ color: "var(--surna-text-muted)", borderBottom: "1px solid var(--surna-border)" }}>
                <th className="text-left py-2 px-1 font-semibold">Player</th>
                <th className="text-left py-2 px-1 font-semibold">Shirt</th>
                <th className="text-left py-2 px-1 font-semibold">Shoe</th>
                <th className="text-left py-2 px-1 font-semibold">Height</th>
                <th className="text-left py-2 px-1 font-semibold">#</th>
                <th className="text-left py-2 px-1 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <tr key={row.memberId} style={{ borderBottom: "1px solid var(--surna-border)" }}>
                  <td className="py-2 px-1 font-medium truncate max-w-[100px]" style={{ color: "var(--surna-text)" }}>
                    {row.name}
                  </td>
                  <td className="py-2 px-1" style={{ color: "var(--surna-text)" }}>
                    {row.gear?.shirtSize ?? "—"}
                  </td>
                  <td className="py-2 px-1" style={{ color: "var(--surna-text)" }}>
                    {row.gear?.shoeSizeEu ? `EU ${row.gear.shoeSizeEu}` : "—"}
                  </td>
                  <td className="py-2 px-1" style={{ color: "var(--surna-text-secondary)" }}>
                    {row.gear?.heightCm ? `${row.gear.heightCm} cm` : "—"}
                  </td>
                  <td className="py-2 px-1" style={{ color: "var(--surna-text-secondary)" }}>
                    {row.gear?.preferredJerseyNumber ?? "—"}
                  </td>
                  <td className="py-2 px-1">
                    {row.kitReady ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-500">
                        <CheckCircle2 size={12} /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        <AlertCircle size={12} /> Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TeamSectionCard>
    );
  }

  if (data.viewerNeedsKit) {
    return (
      <TeamSectionCard>
        <div className="flex items-start gap-2">
          <Shirt size={16} className="shrink-0 mt-0.5" style={{ color: "var(--surna-text-secondary)" }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--surna-text)" }}>
              Add your kit sizes
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--surna-text-secondary)" }}>
              Shirt & shoe size so your captain can order team kit.
            </p>
            <Link href={ROUTES.profileEdit} className="inline-block mt-2">
              <span
                className="text-[11px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
              >
                Add my sizes
              </span>
            </Link>
          </div>
        </div>
      </TeamSectionCard>
    );
  }

  return null;
}
