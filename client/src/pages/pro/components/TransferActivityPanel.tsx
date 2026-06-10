import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, Button, Tag, SectionHeader, EmptyState } from "./primitives";
import { apiRequest } from "@/lib/queryClient";
import { formatMarketValue } from "../lib/playerMarketValue";

type TransferRow = {
  id: string;
  playerName?: string;
  offeringTeamName?: string;
  targetTeamName?: string;
  amountEur: number;
  status: string;
};

export default function TransferActivityPanel({ teamId }: { teamId: string | null }) {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ incoming: TransferRow[]; outgoing: TransferRow[] }>({
    queryKey: ["/api/pro/transfers", teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const r = await fetch(`/api/pro/transfers?teamId=${teamId}`, { credentials: "include" });
      if (!r.ok) return { incoming: [], outgoing: [] };
      return r.json();
    },
    retry: false,
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const res = await apiRequest("PATCH", `/api/pro/transfers/${id}`, { status });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/transfers", teamId] }),
  });

  if (!teamId) return null;

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  return (
    <Card padded={false}>
      <div style={{ padding: "16px 18px 8px" }}>
        <SectionHeader
          title="Transfer activity"
          subtitle="Incoming offers for your players and bids you have made"
        />
      </div>
      {isLoading ? (
        <div className="animate-pulse" style={{ height: 120, margin: 16, borderRadius: 8, background: "var(--pro-surface-2)" }} />
      ) : incoming.length === 0 && outgoing.length === 0 ? (
        <EmptyState icon={<ArrowDownLeft size={18} />} title="No transfer activity" description="Make offers from Recruitment → Player market." />
      ) : (
        <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {incoming.length > 0 && (
            <div>
              <div className="pro-row" style={{ gap: 6, marginBottom: 8, fontWeight: 700, fontSize: 12 }}>
                <ArrowDownLeft size={14} /> Incoming
              </div>
              {incoming.map((t) => (
                <TransferRowCard
                  key={t.id}
                  row={t}
                  showActions
                  onAccept={() => respond.mutate({ id: t.id, status: "accepted" })}
                  onReject={() => respond.mutate({ id: t.id, status: "rejected" })}
                  busy={respond.isPending}
                />
              ))}
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <div className="pro-row" style={{ gap: 6, marginBottom: 8, fontWeight: 700, fontSize: 12 }}>
                <ArrowUpRight size={14} /> Outgoing
              </div>
              {outgoing.map((t) => (
                <TransferRowCard key={t.id} row={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TransferRowCard({
  row,
  showActions,
  onAccept,
  onReject,
  busy,
}: {
  row: TransferRow;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  const statusTone =
    row.status === "accepted" ? "success" : row.status === "rejected" ? "danger" : "active";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        border: "1px solid var(--pro-border)",
        marginBottom: 8,
        background: "var(--pro-surface)",
      }}
    >
      <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>{row.playerName || "Player"}</span>
        <Tag tone={statusTone}>{row.status}</Tag>
      </div>
      <div className="pro-text-muted" style={{ fontSize: 12 }}>
        {row.offeringTeamName} → {row.targetTeamName} · <strong>{formatMarketValue(row.amountEur)}</strong>
      </div>
      {showActions && row.status === "pending" && (
        <div className="pro-row" style={{ gap: 8, marginTop: 10 }}>
          <Button size="sm" variant="primary" disabled={busy} onClick={onAccept}>
            Accept
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
