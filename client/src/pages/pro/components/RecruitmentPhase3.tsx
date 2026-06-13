import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, Euro, Eye, FileText, BadgeCheck, Star, X,
} from "lucide-react";
import { Card, Button, Tag, EmptyState } from "./primitives";
import { useProTeam } from "./ProTeamContext";
import { apiRequest } from "@/lib/queryClient";
import { formatMarketValue } from "../lib/playerMarketValue";

export type MarketPlayer = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  sport?: string | null;
  position?: string | null;
  skillLevel?: string | null;
  location?: string | null;
  age?: number | null;
  gamesPlayed?: number;
  winRate?: number;
  marketValueEur: number;
  scoutRatings?: {
    overall: number;
    technical: number;
    physical: number;
    tactical: number;
    reportCount: number;
  } | null;
  currentTeamId?: string | null;
};

function PlayerCard({
  player,
  onOffer,
  onWatch,
  onReport,
  watched,
}: {
  player: MarketPlayer;
  onOffer?: () => void;
  onWatch?: () => void;
  onReport?: () => void;
  watched?: boolean;
}) {
  const name = player.displayName || player.username || player.id;
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid var(--pro-border)",
        background: "var(--pro-surface)",
      }}
    >
      <div className="pro-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{name}</div>
          <div className="pro-text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            {[player.position, player.skillLevel, player.age != null ? `Age ${player.age}` : null, player.location]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--pro-text-muted)", fontWeight: 600 }}>Market value</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--pro-text)" }}>
            {formatMarketValue(player.marketValueEur)}
          </div>
        </div>
      </div>
      <div className="pro-row" style={{ gap: 12, marginTop: 8, fontSize: 11, color: "var(--pro-text-muted)" }}>
        <span>{player.gamesPlayed ?? 0} games</span>
        <span>{player.winRate ?? 0}% win rate</span>
        {player.scoutRatings && (
          <span className="pro-row" style={{ gap: 4 }}>
            <Star size={11} /> Scout {player.scoutRatings.overall}/10 ({player.scoutRatings.reportCount})
          </span>
        )}
      </div>
      <div className="pro-row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {onOffer && (
          <Button size="sm" variant="primary" leadingIcon={<Euro size={12} />} onClick={onOffer}>
            Make offer
          </Button>
        )}
        {onWatch && (
          <Button size="sm" variant="secondary" leadingIcon={<Eye size={12} />} onClick={onWatch} disabled={watched}>
            {watched ? "Watching" : "Watch player"}
          </Button>
        )}
        {onReport && (
          <Button size="sm" variant="ghost" leadingIcon={<FileText size={12} />} onClick={onReport}>
            Scout report
          </Button>
        )}
        <Button size="sm" variant="ghost" href={`/person/${player.id}`}>Profile</Button>
      </div>
    </div>
  );
}

function OfferModal({
  player,
  offeringTeamId,
  onClose,
}: {
  player: MarketPlayer;
  offeringTeamId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amountEur, setAmountEur] = useState(Math.round(player.marketValueEur * 1.1));
  const [roleOffered, setRoleOffered] = useState(player.position || "Player");
  const [message, setMessage] = useState("");
  const [contractMonths, setContractMonths] = useState(12);

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pro/transfers", {
        offeringTeamId,
        targetPlayerUserId: player.id,
        targetTeamId: player.currentTeamId || undefined,
        amountEur,
        roleOffered,
        message,
        contractMonths,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/transfers"] });
      onClose();
    },
  });

  return (
    <ModalShell title={`Offer for ${player.displayName || player.username}`} onClose={onClose}>
      <label className="pro-col" style={{ gap: 4, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Amount (€)</span>
        <input type="number" min={0} value={amountEur} onChange={(e) => setAmountEur(Number(e.target.value))} style={{ padding: 8, borderRadius: 8 }} />
      </label>
      <label className="pro-col" style={{ gap: 4, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Role offered</span>
        <input value={roleOffered} onChange={(e) => setRoleOffered(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
      </label>
      <label className="pro-col" style={{ gap: 4, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Contract (months)</span>
        <input type="number" min={1} max={60} value={contractMonths} onChange={(e) => setContractMonths(Number(e.target.value))} style={{ padding: 8, borderRadius: 8 }} />
      </label>
      <label className="pro-col" style={{ gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Message to player & club</span>
        <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
      </label>
      <Button variant="primary" fullWidth disabled={submit.isPending} onClick={() => submit.mutate()}>
        Submit official offer
      </Button>
    </ModalShell>
  );
}

function ReportModal({
  player,
  teamId,
  onClose,
}: {
  player: MarketPlayer;
  teamId: string | null;
  onClose: () => void;
}) {
  const [overall, setOverall] = useState(7);
  const [technical, setTechnical] = useState(7);
  const [physical, setPhysical] = useState(7);
  const [tactical, setTactical] = useState(7);
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/pro/scout-reports", {
        playerUserId: player.id,
        overallRating: overall,
        technicalRating: technical,
        physicalRating: physical,
        tacticalRating: tactical,
        notes,
        sharedTeamIds: teamId ? [teamId] : [],
      });
    },
    onSuccess: onClose,
  });

  return (
    <ModalShell title="Scout report" onClose={onClose}>
      <p className="pro-text-muted" style={{ fontSize: 13, marginTop: 0 }}>{player.displayName || player.username}</p>
      {(["overall", "technical", "physical", "tactical"] as const).map((key) => {
        const val = { overall, technical, physical, tactical }[key];
        const set = { overall: setOverall, technical: setTechnical, physical: setPhysical, tactical: setTactical }[key];
        return (
          <label key={key} className="pro-col" style={{ gap: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{key}</span>
            <input type="range" min={1} max={10} value={val} onChange={(e) => set(Number(e.target.value))} />
            <span style={{ fontSize: 11 }}>{val}/10</span>
          </label>
        );
      })}
      <textarea rows={4} placeholder="Notes for clubs…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
      <Button variant="primary" fullWidth disabled={submit.isPending} onClick={() => submit.mutate()}>
        Save report
      </Button>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <Card style={{ maxWidth: 400, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </Card>
    </div>
  );
}

export function PlayerMarketTab() {
  const { teamId } = useProTeam();
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [location, setLocation] = useState("");
  const [offerPlayer, setOfferPlayer] = useState<MarketPlayer | null>(null);

  const { data: players = [], isFetching, refetch } = useQuery<MarketPlayer[]>({
    queryKey: ["/api/pro/recruitment/players", sport, position, skillLevel, location],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sport) params.set("sport", sport);
      if (position) params.set("position", position);
      if (skillLevel) params.set("skillLevel", skillLevel);
      if (location) params.set("location", location);
      const r = await fetch(`/api/pro/recruitment/players?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const loadPlayerForOffer = async (p: MarketPlayer) => {
    const r = await fetch(`/api/pro/players/${p.id}/market`, { credentials: "include" });
    if (r.ok) {
      const full = await r.json();
      setOfferPlayer(full);
    } else {
      setOfferPlayer(p);
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Player market</h3>
        <p className="pro-text-muted" style={{ fontSize: 13 }}>
          Values from games, win rate, skill level and activity. Base €500 × win rate + €100 per 10 games × skill factor.
        </p>
        <div className="pro-row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <input placeholder="Sport" value={sport} onChange={(e) => setSport(e.target.value)} style={{ padding: 8, borderRadius: 8, minWidth: 100 }} />
          <input placeholder="Position" value={position} onChange={(e) => setPosition(e.target.value)} style={{ padding: 8, borderRadius: 8, minWidth: 100 }} />
          <input placeholder="Skill level" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} style={{ padding: 8, borderRadius: 8, minWidth: 100 }} />
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: 8, borderRadius: 8, minWidth: 100 }} />
          <Button variant="primary" leadingIcon={<Search size={14} />} onClick={() => refetch()} disabled={isFetching}>
            Search
          </Button>
        </div>
      </Card>
      <div className="pro-col" style={{ gap: 10 }}>
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            onOffer={teamId ? () => loadPlayerForOffer(p) : undefined}
          />
        ))}
        {players.length === 0 && !isFetching && (
          <EmptyState icon={<Euro size={20} />} title="Search the market" description="Find players and submit official transfer offers." />
        )}
      </div>
      {offerPlayer && teamId && (
        <OfferModal player={offerPlayer} offeringTeamId={teamId} onClose={() => setOfferPlayer(null)} />
      )}
    </>
  );
}

export function ScoutViewTab() {
  const { teamId } = useProTeam();
  const qc = useQueryClient();
  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [location, setLocation] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [reportPlayer, setReportPlayer] = useState<MarketPlayer | null>(null);

  const { data: scoutProfile } = useQuery({
    queryKey: ["/api/pro/scout/profile"],
    queryFn: async () => {
      const r = await fetch("/api/pro/scout/profile", { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const registerScout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pro/scout/profile", {
        bio: "Independent scout on SURNA",
        regions: location || "Global",
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/scout/profile"] }),
  });

  const { data: players = [], refetch, isFetching } = useQuery<MarketPlayer[]>({
    queryKey: ["/api/pro/recruitment/players", "scout", sport, position, skillLevel, location, ageMin, ageMax],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sport) params.set("sport", sport);
      if (position) params.set("position", position);
      if (skillLevel) params.set("skillLevel", skillLevel);
      if (location) params.set("location", location);
      if (ageMin) params.set("ageMin", ageMin);
      if (ageMax) params.set("ageMax", ageMax);
      const r = await fetch(`/api/pro/recruitment/players?${params}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const { data: watchlist = [] } = useQuery<MarketPlayer[]>({
    queryKey: ["/api/pro/scout/watchlist"],
    queryFn: async () => {
      const r = await fetch("/api/pro/scout/watchlist", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const watchIds = new Set(watchlist.map((w) => w.id));

  const watch = useMutation({
    mutationFn: async (playerUserId: string) => {
      await apiRequest("POST", "/api/pro/scout/watchlist", { playerUserId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/scout/watchlist"] }),
  });

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div className="pro-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Scout network</h3>
            <p className="pro-text-muted" style={{ fontSize: 13 }}>
              Filter SURNA players by sport, position, age and location. Watch players and file reports for clubs.
            </p>
          </div>
          {scoutProfile?.verified ? (
            <Tag tone="success"><BadgeCheck size={12} /> Verified scout</Tag>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => registerScout.mutate()} disabled={registerScout.isPending}>
              Register as scout
            </Button>
          )}
        </div>
        <div className="pro-row" style={{ flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <input placeholder="Sport" value={sport} onChange={(e) => setSport(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
          <input placeholder="Position" value={position} onChange={(e) => setPosition(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
          <input placeholder="Skill" value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
          <input placeholder="Location / radius" value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: 8, borderRadius: 8 }} />
          <input placeholder="Age min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} style={{ padding: 8, borderRadius: 8, width: 72 }} />
          <input placeholder="Age max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} style={{ padding: 8, borderRadius: 8, width: 72 }} />
          <Button variant="primary" onClick={() => refetch()} disabled={isFetching}>Search</Button>
        </div>
      </Card>
      <div className="pro-col" style={{ gap: 10 }}>
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            watched={watchIds.has(p.id)}
            onWatch={() => watch.mutate(p.id)}
            onReport={() => setReportPlayer(p)}
          />
        ))}
      </div>
      {reportPlayer && (
        <ReportModal player={reportPlayer} teamId={teamId} onClose={() => setReportPlayer(null)} />
      )}
    </>
  );
}

export function ScoutWatchlistTab() {
  const { data: watchlist = [], isLoading } = useQuery<MarketPlayer[]>({
    queryKey: ["/api/pro/scout/watchlist"],
    queryFn: async () => {
      const r = await fetch("/api/pro/scout/watchlist", { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  if (isLoading) return <div className="animate-pulse h-32 rounded" style={{ background: "var(--pro-surface-2)" }} />;

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Watchlist ({watchlist.length})</h3>
      {watchlist.length === 0 ? (
        <EmptyState icon={<Eye size={18} />} title="No watched players" description="Use Scout view to add players to your watchlist." />
      ) : (
        <div className="pro-col" style={{ gap: 10 }}>
          {watchlist.map((p) => (
            <PlayerCard key={p.id} player={p} watched />
          ))}
        </div>
      )}
    </Card>
  );
}
