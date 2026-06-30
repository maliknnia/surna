import { useState, useMemo, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Plus, Calendar, MapPin, Users, Zap, Share2, Loader2,
  Check, X, Settings, Shield, ClipboardList, ChevronRight,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PageShell, Card, Button, Tag, Tabs, EmptyState } from "./components/primitives";
import { useProTeam } from "./components/ProTeamContext";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import {
  TOURNAMENT_SPORTS,
  getSportTournamentProfile,
  DEFAULT_TOURNAMENT_SETTINGS,
  type TournamentSettings,
} from "@shared/tournamentSport";

const stripePk = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePk ? loadStripe(stripePk) : null;

type TournamentFormat = "league" | "knockout" | "group_knockout";

type Registration = {
  id: string;
  teamId: string;
  teamName: string;
  status: string;
  teamGoals?: string;
  notes?: string;
  contactEmail?: string;
  registeredAt?: string;
};

type Tournament = {
  id: string;
  name: string;
  sport: string;
  format: TournamentFormat;
  maxTeams: number;
  entryFeeEur: number;
  prizeDescription: string;
  description?: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  organizerUserId?: string;
  winnerTeamId?: string | null;
  winnerTeamName?: string | null;
  spotsRemaining?: number;
  pendingCount?: number;
  registrations?: Registration[];
  approvedRegistrations?: Registration[];
  fixtures?: Fixture[];
  standings?: Standing[];
  settings?: TournamentSettings;
  teamId?: string | null;
  hostingTeamName?: string;
  access?: TournamentAccess;
  staff?: StaffMember[];
};

type StaffRole = "owner" | "admin" | "operations" | "scorekeeper";

type TournamentAccess = {
  role: StaffRole;
  canSettings: boolean;
  canApprove: boolean;
  canFixtures: boolean;
  canScore: boolean;
  canManageStaff: boolean;
};

type StaffMember = {
  id: string;
  userId: string;
  role: StaffRole;
  displayName: string;
  hasPro: boolean;
};

type CoManagerCandidate = {
  userId: string;
  displayName: string;
  role: string;
  hasPro: boolean;
  isCaptain: boolean;
};

type Fixture = {
  id: string;
  round: number;
  groupName: string | null;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isFinal: boolean;
};

type Standing = {
  teamId: string;
  teamName: string;
  played: number;
  points: number;
  gf: number;
  ga: number;
};

type Tab = "create" | "mine" | "matchday" | "teams" | "standings" | "settings" | "staff";
type CreateStep = 0 | 1 | 2 | 3;
type EligibleTeam = { id: string; name: string; sport: string; members: number; isCaptain: boolean };

const TEAM_COUNTS = [4, 8, 16, 32] as const;

const CREATE_STEPS = ["Basics", "Rules", "Team access", "Launch"] as const;
const MANAGE_STEPS: { key: Tab; label: string }[] = [
  { key: "teams", label: "Teams" },
  { key: "matchday", label: "Fixtures" },
  { key: "standings", label: "Results" },
  { key: "staff", label: "Staff" },
  { key: "settings", label: "Rules" },
];

function staffRoleLabel(role: StaffRole) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "operations") return "Operations";
  return "Scorekeeper";
}

function StepBar({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="pro-row" style={{ gap: 0, marginBottom: 20, flexWrap: "wrap" }}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="pro-row" style={{ alignItems: "center", flex: i < steps.length - 1 ? 1 : undefined, minWidth: 0 }}>
            <div className="pro-col" style={{ alignItems: "center", gap: 4, minWidth: 72 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  background: active ? "#803FE1" : done ? "rgba(128,63,225,0.25)" : "var(--pro-surface-2)",
                  color: active || done ? "#fff" : "var(--pro-text-muted)",
                  border: active ? "2px solid #803FE1" : "1px solid var(--pro-border)",
                }}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#803FE1" : "var(--pro-text-muted)", textAlign: "center" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: "0 8px 14px", background: done ? "#803FE1" : "var(--pro-border)", minWidth: 16 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatLabel(f: TournamentFormat) {
  if (f === "league") return "League";
  if (f === "knockout") return "Knockout";
  return "Group + knockout";
}

function statusTag(status: string) {
  if (status === "approved" || status === "paid") return <Tag tone="success">Approved</Tag>;
  if (status === "pending") return <Tag tone="active">Pending review</Tag>;
  if (status === "rejected") return <Tag tone="danger">Rejected</Tag>;
  return <Tag tone="muted">{status}</Tag>;
}

function RegisterPaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr("");
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      setErr(error.message || "Payment failed");
      setBusy(false);
      return;
    }
    if (paymentIntent?.id) onSuccess(paymentIntent.id);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <PaymentElement />
      {err && <p style={{ color: "#ef4444", fontSize: 12 }}>{err}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Processing…" : "Pay & register"}</Button>
      </div>
    </form>
  );
}

function WinnerCelebration({ winnerName, standings, onClose }: { winnerName: string; standings: Standing[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <Card style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
        <h2 style={{ margin: 0, fontSize: 22 }}>Champions!</h2>
        <p style={{ fontSize: 18, fontWeight: 800, margin: "12px 0", color: "var(--pro-text)" }}>{winnerName}</p>
        {standings.length > 0 && (
          <ol style={{ margin: "16px 0 0", paddingLeft: 18, fontSize: 13, textAlign: "left", color: "var(--pro-text-muted)" }}>
            {standings.slice(0, 5).map((s, i) => (
              <li key={s.teamId}>{i + 1}. {s.teamName} — {s.points} pts</li>
            ))}
          </ol>
        )}
        <Button variant="primary" fullWidth style={{ marginTop: 20 }} onClick={onClose}>Done</Button>
      </Card>
    </div>
  );
}

function BracketView({ fixtures }: { fixtures: Fixture[] }) {
  const byRound = useMemo(() => {
    const map = new Map<number, Fixture[]>();
    for (const f of fixtures) {
      if (!map.has(f.round)) map.set(f.round, []);
      map.get(f.round)!.push(f);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  if (!fixtures.length) return null;

  return (
    <div className="pro-col" style={{ gap: 16 }}>
      {byRound.map(([round, items]) => (
        <div key={round}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--pro-text-muted)", marginBottom: 8 }}>
            Round {round}{items.some((f) => f.isFinal) ? " · Final" : ""}
          </p>
          <div className="pro-col" style={{ gap: 8 }}>
            {items.map((f) => (
              <div key={f.id} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--pro-border)", fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{f.homeTeamName}</span>
                {" "}
                <span style={{ color: "#803FE1", fontWeight: 800 }}>
                  {f.homeScore ?? "–"} : {f.awayScore ?? "–"}
                </span>
                {" "}
                <span style={{ fontWeight: 700 }}>{f.awayTeamName}</span>
                {f.groupName && <span style={{ marginLeft: 8 }}><Tag tone="muted">Group {f.groupName}</Tag></span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProTournament() {
  const { isTeamMode } = useProWorkspaceContext();
  if (!isTeamMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Tournaments"
        description="Run brackets and fixtures from Team Pro — one workspace per squad."
      />
    );
  }
  return <ProTeamTournament />;
}

function ProTeamTournament() {
  const [, params] = useRoute("/pro/tournament/:id");
  const tournamentId = params?.id;
  const qc = useQueryClient();
  const { teamId: activeTeamId, activeTeam, teams } = useProTeam();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>(tournamentId ? "teams" : "create");
  const [createStep, setCreateStep] = useState<CreateStep>(0);
  const [createError, setCreateError] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [celebration, setCelebration] = useState<{ name: string; standings: Standing[] } | null>(null);
  const [scoreDraft, setScoreDraft] = useState<Record<string, { home: number; away: number }>>({});
  const [staffPick, setStaffPick] = useState("");
  const [staffRole, setStaffRole] = useState<Exclude<StaffRole, "owner">>("operations");

  const [form, setForm] = useState({
    name: "",
    sport: "Soccer",
    format: "knockout" as TournamentFormat,
    maxTeams: 8 as (typeof TEAM_COUNTS)[number],
    entryFeeEur: 0,
    prizeDescription: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    teamId: "" as string,
    coManagers: [] as Array<{ userId: string; role: Exclude<StaffRole, "owner">; displayName: string }>,
    settings: { ...DEFAULT_TOURNAMENT_SETTINGS },
  });

  const sportProfile = useMemo(() => getSportTournamentProfile(form.sport), [form.sport]);

  useEffect(() => {
    const p = getSportTournamentProfile(form.sport);
    setForm((f) => ({
      ...f,
      format: p.defaultFormat,
      maxTeams: (p.typicalTeamCounts.includes(f.maxTeams) ? f.maxTeams : p.typicalTeamCounts[0]) as typeof f.maxTeams,
      settings: {
        ...f.settings,
        requirements: f.settings.requirements.trim() ? f.settings.requirements : p.kitRequirements.join("\n"),
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sport switch only
  }, [form.sport]);

  useEffect(() => {
    if (activeTeamId && !form.teamId) {
      setForm((f) => ({ ...f, teamId: activeTeamId, sport: activeTeam?.sport || f.sport }));
    }
  }, [activeTeamId, activeTeam?.sport, form.teamId]);

  const hostingTeamId = form.teamId || activeTeamId || "";

  const { data: coManagerCandidates = [] } = useQuery<CoManagerCandidate[]>({
    queryKey: ["/api/pro/tournaments/co-managers", hostingTeamId],
    enabled: !!hostingTeamId && tab === "create" && createStep >= 2,
    queryFn: async () => {
      const r = await fetch(`/api/pro/tournaments/co-managers/${hostingTeamId}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const { data: mine = [], isLoading: listLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/pro/tournaments", "mine"],
    queryFn: async () => {
      const r = await fetch("/api/pro/tournaments?mine=1", { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const { data: detail, isLoading: detailLoading, isError: detailError } = useQuery<Tournament>({
    queryKey: ["/api/pro/tournaments", tournamentId, "manage"],
    enabled: !!tournamentId,
    queryFn: async () => {
      const r = await fetch(`/api/pro/tournaments/${tournamentId}/manage`, { credentials: "include" });
      if (!r.ok) {
        const text = await r.text();
        let msg = text;
        try {
          msg = JSON.parse(text).error || text;
        } catch {
          /* raw text */
        }
        throw new Error(msg);
      }
      return r.json();
    },
  });

  useEffect(() => {
    setDescDraft(detail?.description || "");
  }, [detail?.description]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setCreateError("");
      const payload = {
        name: form.name,
        sport: form.sport,
        format: form.format,
        maxTeams: form.maxTeams,
        entryFeeEur: form.entryFeeEur,
        prizeDescription: form.prizeDescription,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location,
        settings: form.settings,
        teamId: form.teamId || undefined,
        coManagers: form.coManagers,
      };
      const res = await apiRequest("POST", "/api/pro/tournaments", payload);
      return res.json() as Promise<Tournament>;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["/api/pro/tournaments"] });
      window.location.href = `/pro/tournament/${row.id}`;
    },
    onError: (err: Error) => {
      setCreateError(err.message || "Could not create tournament");
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (patch: Partial<TournamentSettings> & { description?: string }) => {
      const res = await apiRequest("PATCH", `/api/pro/tournaments/${tournamentId}/settings`, patch);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] }),
  });

  const approveMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${tournamentId}/registrations/${regId}/approve`, {});
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (regId: string) => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${tournamentId}/registrations/${regId}/reject`, {});
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (regId: string) => {
      await apiRequest("DELETE", `/api/pro/tournaments/${tournamentId}/registrations/${regId}`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${tournamentId}/generate-fixtures`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] });
      setTab("matchday");
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async ({ fixtureId, homeScore, awayScore }: { fixtureId: string; homeScore: number; awayScore: number }) => {
      const res = await apiRequest("PATCH", `/api/pro/tournaments/${tournamentId}/fixtures/${fixtureId}/score`, { homeScore, awayScore });
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] });
      if (data?.celebration?.winnerTeamName) {
        setCelebration({ name: data.celebration.winnerTeamName, standings: data.celebration.standings || data.standings || [] });
      }
    },
  });

  const addStaffMutation = useMutation({
    mutationFn: async (body: { userId: string; role: Exclude<StaffRole, "owner">; displayName: string }) => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${tournamentId}/staff`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] });
      setStaffPick("");
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      await apiRequest("DELETE", `/api/pro/tournaments/${tournamentId}/staff/${staffId}`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", tournamentId, "manage"] }),
  });

  const access = detail?.access;
  const canApprove = access?.canApprove === true;
  const canFixtures = access?.canFixtures === true;
  const canScore = access?.canScore === true;
  const canSettings = access?.canSettings === true;
  const canManageStaff = access?.canManageStaff === true;

  const { data: manageCoManagers = [] } = useQuery<CoManagerCandidate[]>({
    queryKey: ["/api/pro/tournaments/co-managers", detail?.teamId],
    enabled: !!detail?.teamId && tab === "staff" && canManageStaff,
    queryFn: async () => {
      const r = await fetch(`/api/pro/tournaments/co-managers/${detail!.teamId}`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json();
    },
  });

  const approvedCount = detail?.approvedRegistrations?.length ?? detail?.registrations?.filter((r) => r.status === "approved" || r.status === "paid").length ?? 0;
  const pendingRegs = detail?.registrations?.filter((r) => r.status === "pending") ?? [];
  const approvedRegs = detail?.approvedRegistrations ?? detail?.registrations?.filter((r) => r.status === "approved" || r.status === "paid") ?? [];

  const displayFixtures = detail?.fixtures ?? [];

  if (tournamentId && detailLoading) {
    return (
      <PageShell title="Tournament" subtitle="Loading…">
        <div className="animate-pulse h-64 rounded" style={{ background: "var(--pro-surface-2)" }} />
      </PageShell>
    );
  }

  if (tournamentId && detailError) {
    return (
      <PageShell title="Tournament" subtitle="Unable to open">
        <EmptyState
          icon={<Shield size={20} />}
          title="Cannot manage this tournament"
          description="You may not have access, or it may not exist. Co-managers need an active Pro subscription and a staff role assigned by the organizer."
          action={<Button href="/pro/tournament" variant="primary">Back to tournaments</Button>}
        />
      </PageShell>
    );
  }

  if (tournamentId && detail) {
    const settings = detail.settings ?? DEFAULT_TOURNAMENT_SETTINGS;
    const tProfile = getSportTournamentProfile(detail.sport);

    return (
      <PageShell
        title={detail.name}
        subtitle={`${formatLabel(detail.format)} · ${detail.sport} · €${detail.entryFeeEur} entry · ${tProfile.rosterHint}${detail.hostingTeamName ? ` · Hosted by ${detail.hostingTeamName}` : ""}`}
        actions={
          <>
            <Button href={`/tournament/${detail.id}`} variant="secondary" leadingIcon={<Share2 size={14} />}>Registration page</Button>
            <Button href="/pro/tournament" variant="ghost">All tournaments</Button>
          </>
        }
      >
        {celebration && <WinnerCelebration winnerName={celebration.name} standings={celebration.standings} onClose={() => setCelebration(null)} />}

        {access && (
          <div style={{ marginBottom: 12 }}>
            <Tag tone="active">Your role: {staffRoleLabel(access.role)}</Tag>
          </div>
        )}

        <StepBar steps={MANAGE_STEPS.map((s) => s.label)} current={Math.max(0, MANAGE_STEPS.findIndex((s) => s.key === tab))} />

        <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
          <Card><div className="pro-text-muted" style={{ fontSize: 11 }}>Approved teams</div><div style={{ fontWeight: 800, fontSize: 20 }}>{approvedCount}/{detail.maxTeams}</div></Card>
          <Card><div className="pro-text-muted" style={{ fontSize: 11 }}>Pending review</div><div style={{ fontWeight: 800, fontSize: 20, color: pendingRegs.length ? "#803FE1" : undefined }}>{pendingRegs.length}</div></Card>
          <Card><div className="pro-text-muted" style={{ fontSize: 11 }}>Fixtures</div><div style={{ fontWeight: 800, fontSize: 20 }}>{detail.fixtures?.length ?? 0}</div></Card>
          <Card><div className="pro-text-muted" style={{ fontSize: 11 }}>Status</div><Tag tone={detail.status === "completed" ? "success" : "active"}>{detail.status}</Tag></Card>
        </div>

        <div className="pro-row" style={{ gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {canFixtures && (
            <Button variant="primary" leadingIcon={<Zap size={14} />} disabled={generateMutation.isPending || approvedCount < 2 || detail.status === "completed"} onClick={() => generateMutation.mutate()}>
              Generate fixtures
            </Button>
          )}
          {pendingRegs.length > 0 && canApprove && (
            <Button variant="secondary" onClick={() => setTab("teams")}>{pendingRegs.length} pending — review</Button>
          )}
        </div>

        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "teams", label: "Teams", icon: <Users size={13} />, count: detail.registrations?.length },
            { key: "matchday", label: "Match day", icon: <Calendar size={13} /> },
            { key: "standings", label: "Standings / Bracket", icon: <Trophy size={13} /> },
            { key: "staff", label: "Staff", icon: <Shield size={13} />, count: detail.staff?.length },
            { key: "settings", label: "Rules & settings", icon: <Settings size={13} /> },
          ]}
        />

        {tab === "teams" && (
          <div className="pro-col" style={{ gap: 16 }}>
            {pendingRegs.length > 0 && canApprove && (
              <Card>
                <h3 style={{ marginTop: 0 }}><Shield size={14} style={{ display: "inline", marginRight: 6 }} />Pending applications ({pendingRegs.length})</h3>
                <div className="pro-col" style={{ gap: 10 }}>
                  {pendingRegs.map((r) => (
                    <div key={r.id} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--pro-border)" }}>
                      <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800 }}>{r.teamName}</span>
                        {statusTag(r.status)}
                      </div>
                      {r.teamGoals && <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Goals:</strong> {r.teamGoals}</p>}
                      {r.notes && <p style={{ fontSize: 13, margin: "0 0 6px" }}><strong>Notes:</strong> {r.notes}</p>}
                      {r.contactEmail && <p className="pro-text-muted" style={{ fontSize: 12 }}>{r.contactEmail}</p>}
                      <div className="pro-row" style={{ gap: 8, marginTop: 10 }}>
                        <Button size="sm" variant="primary" leadingIcon={<Check size={12} />} disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(r.id)}>Approve</Button>
                        <Button size="sm" variant="ghost" leadingIcon={<X size={12} />} disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate(r.id)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card padded={false}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
                <h3 style={{ margin: 0 }}>Approved teams ({approvedRegs.length})</h3>
              </div>
              {approvedRegs.length === 0 ? (
                <EmptyState icon={<Users size={18} />} title="No approved teams yet" description="Share the registration link. Teams matching your sport can apply." action={<Button href={`/tournament/${detail.id}`} variant="primary">Open registration page</Button>} />
              ) : (
                <table className="pro-table">
                  <thead><tr><th>Team</th><th>Goals / notes</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {approvedRegs.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.teamName}</td>
                        <td className="pro-text-muted" style={{ fontSize: 12, maxWidth: 240 }}>{r.teamGoals || r.notes || "—"}</td>
                        <td>{statusTag(r.status)}</td>
                        <td>{canApprove && <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate(r.id)}>Remove</Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}

        {tab === "matchday" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Live scores</h3>
            {!canScore ? (
              <p className="pro-text-muted" style={{ fontSize: 13 }}>Your role cannot update scores. Ask an admin or operations lead.</p>
            ) : displayFixtures.length === 0 ? (
              <EmptyState icon={<Calendar size={18} />} title="No fixtures yet" description="Approve at least 2 teams, then generate fixtures." />
            ) : (
              <div className="pro-col" style={{ gap: 12 }}>
                {displayFixtures.map((f) => {
                  const draft = scoreDraft[f.id] ?? { home: f.homeScore ?? 0, away: f.awayScore ?? 0 };
                  return (
                    <div key={f.id} style={{ padding: 12, borderRadius: 10, border: "1px solid var(--pro-border)" }}>
                      <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                        <Tag tone="muted">Round {f.round}{f.groupName ? ` · Group ${f.groupName}` : ""}{f.isFinal ? " · Final" : ""}</Tag>
                        <span className="pro-text-muted" style={{ fontSize: 11 }}>{new Date(f.scheduledAt).toLocaleString()}</span>
                      </div>
                      <div className="pro-row" style={{ alignItems: "center", gap: 10 }}>
                        <span style={{ flex: 1, fontWeight: 700 }}>{f.homeTeamName}</span>
                        <input type="number" min={0} value={draft.home} onChange={(e) => setScoreDraft((p) => ({ ...p, [f.id]: { ...draft, home: parseInt(e.target.value, 10) || 0 } }))} style={{ width: 48, textAlign: "center", borderRadius: 8, padding: 6 }} />
                        <span>–</span>
                        <input type="number" min={0} value={draft.away} onChange={(e) => setScoreDraft((p) => ({ ...p, [f.id]: { ...draft, away: parseInt(e.target.value, 10) || 0 } }))} style={{ width: 48, textAlign: "center", borderRadius: 8, padding: 6 }} />
                        <span style={{ flex: 1, fontWeight: 700, textAlign: "right" }}>{f.awayTeamName}</span>
                      </div>
                      <Button size="sm" variant="primary" style={{ marginTop: 10 }} disabled={scoreMutation.isPending} onClick={() => scoreMutation.mutate({ fixtureId: f.id, homeScore: draft.home, awayScore: draft.away })}>Update score</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {tab === "standings" && (
          <div className="pro-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16 }}>
            <Card padded={false}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}><h3 style={{ margin: 0 }}>Standings</h3></div>
              <table className="pro-table">
                <thead><tr><th>#</th><th>Team</th><th>P</th><th>Pts</th><th>GF</th><th>GA</th></tr></thead>
                <tbody>
                  {(detail.standings ?? []).map((s, i) => (
                    <tr key={s.teamId}><td>{i + 1}</td><td style={{ fontWeight: 700 }}>{s.teamName}</td><td>{s.played}</td><td>{s.points}</td><td>{s.gf}</td><td>{s.ga}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <h3 style={{ marginTop: 0 }}>Bracket</h3>
              <BracketView fixtures={displayFixtures} />
            </Card>
          </div>
        )}

        {tab === "staff" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Tournament staff</h3>
            <p className="pro-text-muted" style={{ fontSize: 13, marginTop: 0 }}>
              Pro subscribers on your hosting team can co-manage registrations, fixtures, and scores. Each person gets a role with clear permissions.
            </p>
            {(detail.staff ?? []).length === 0 ? (
              <EmptyState icon={<Shield size={18} />} title="No staff yet" description="Add co-managers from your Pro team." />
            ) : (
              <table className="pro-table" style={{ marginBottom: 16 }}>
                <thead><tr><th>Name</th><th>Role</th><th>Pro</th><th></th></tr></thead>
                <tbody>
                  {(detail.staff ?? []).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 700 }}>{s.displayName}</td>
                      <td>{staffRoleLabel(s.role)}</td>
                      <td>{s.hasPro ? <Tag tone="success">Pro</Tag> : <Tag tone="danger">No Pro</Tag>}</td>
                      <td>
                        {canManageStaff && s.role !== "owner" && (
                          <Button size="sm" variant="ghost" disabled={removeStaffMutation.isPending} onClick={() => removeStaffMutation.mutate(s.id)}>Remove</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {canManageStaff && detail.teamId && (
              <div className="pro-col" style={{ gap: 10, maxWidth: 480, paddingTop: 8, borderTop: "1px solid var(--pro-border)" }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Add co-manager from {detail.hostingTeamName || "your team"}</p>
                <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <select value={staffPick} onChange={(e) => setStaffPick(e.target.value)} style={{ flex: 1, minWidth: 160, padding: 8, borderRadius: 8 }}>
                    <option value="">Select Pro team member…</option>
                    {manageCoManagers
                      .filter((c) => c.hasPro && c.userId !== detail.organizerUserId && !(detail.staff ?? []).some((s) => s.userId === c.userId))
                      .map((c) => (
                        <option key={c.userId} value={c.userId}>
                          {c.displayName} ({c.role}){c.isCaptain ? " · Captain" : ""}
                        </option>
                      ))}
                  </select>
                  <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as typeof staffRole)} style={{ padding: 8, borderRadius: 8 }}>
                    <option value="admin">Admin — full control</option>
                    <option value="operations">Operations — teams & fixtures</option>
                    <option value="scorekeeper">Scorekeeper — scores only</option>
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!staffPick || addStaffMutation.isPending}
                    onClick={() => {
                      const pick = manageCoManagers.find((c) => c.userId === staffPick);
                      if (!pick) return;
                      addStaffMutation.mutate({ userId: pick.userId, role: staffRole, displayName: pick.displayName });
                    }}
                  >
                    Add
                  </Button>
                </div>
                {manageCoManagers.filter((c) => c.hasPro).length === 0 && (
                  <p className="pro-text-muted" style={{ fontSize: 12 }}>No other Pro subscribers on this team yet.</p>
                )}
              </div>
            )}
            {!detail.teamId && (
              <p className="pro-text-muted" style={{ fontSize: 12 }}>This tournament was not linked to a hosting team — only the creator can manage it.</p>
            )}
          </Card>
        )}

        {tab === "settings" && (
          <Card>
            <h3 style={{ marginTop: 0 }}>Tournament rules & requirements</h3>
            {!canSettings ? (
              <p className="pro-text-muted" style={{ fontSize: 13 }}>Your role cannot edit tournament rules.</p>
            ) : (
            <div className="pro-col" style={{ gap: 12, maxWidth: 560 }}>
              <label className="pro-col" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Description</span>
                <textarea rows={2} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} onBlur={() => settingsMutation.mutate({ description: descDraft })} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
              </label>
              <label className="pro-col" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>What teams need (kit, roster, docs)</span>
                <textarea rows={4} defaultValue={settings.requirements} onBlur={(e) => settingsMutation.mutate({ requirements: e.target.value })} placeholder={tProfile.kitRequirements.join("\n")} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
              </label>
              <label className="pro-col" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Welcome message (registration page)</span>
                <textarea rows={2} defaultValue={settings.welcomeMessage} onBlur={(e) => settingsMutation.mutate({ welcomeMessage: e.target.value })} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
              </label>
              <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={settings.autoApprove} onChange={(e) => settingsMutation.mutate({ autoApprove: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Auto-approve registrations (skip manual review)</span>
              </label>
              <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={settings.captainOnly} onChange={(e) => settingsMutation.mutate({ captainOnly: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Captain-only registration</span>
              </label>
              <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={settings.collectTeamGoals} onChange={(e) => settingsMutation.mutate({ collectTeamGoals: e.target.checked })} />
                <span style={{ fontSize: 13 }}>Ask teams what they want from the tournament</span>
              </label>
              <label className="pro-col" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Minimum squad size</span>
                <input type="number" min={1} max={50} defaultValue={settings.minMembers} onBlur={(e) => settingsMutation.mutate({ minMembers: parseInt(e.target.value, 10) || 5 })} style={{ padding: 8, borderRadius: 8, maxWidth: 100 }} />
              </label>
              <p className="pro-text-muted" style={{ fontSize: 12 }}>{tProfile.rosterHint}</p>
            </div>
            )}
          </Card>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell title="Tournaments" subtitle="Run sport-specific competitions — control who enters, what they need, fixtures, and live scores." actions={<Button variant="primary" leadingIcon={<Plus size={14} />} onClick={() => setTab("create")}>New tournament</Button>}>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: "create", label: "Create", icon: <Plus size={13} /> }, { key: "mine", label: "My tournaments", icon: <Trophy size={13} />, count: mine.length }]} />

      {tab === "create" && (
        <div className="pro-col" style={{ gap: 16 }}>
          <StepBar steps={CREATE_STEPS} current={createStep} />

          <div className="pro-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,280px)", gap: 16 }}>
            <Card>
              {createStep === 0 && (
                <>
                  <h3 style={{ marginTop: 0 }}>Step 1 — Basics</h3>
                  <div className="pro-col" style={{ gap: 12 }}>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Tournament name</span>
                      <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={`${form.sport} Cup 2026`} style={{ padding: 8, borderRadius: 8 }} />
                    </label>
                    <div className="pro-row" style={{ gap: 12 }}>
                      <label className="pro-col" style={{ flex: 1, gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Sport</span>
                        <select value={form.sport} onChange={(e) => setForm((f) => ({ ...f, sport: e.target.value }))} style={{ padding: 8, borderRadius: 8 }}>
                          {TOURNAMENT_SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label className="pro-col" style={{ flex: 1, gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Format</span>
                        <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as TournamentFormat }))} style={{ padding: 8, borderRadius: 8 }}>
                          {sportProfile.recommendedFormats.map((fmt) => (
                            <option key={fmt} value={fmt}>{formatLabel(fmt)}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Teams</span>
                      <select value={form.maxTeams} onChange={(e) => setForm((f) => ({ ...f, maxTeams: Number(e.target.value) as typeof form.maxTeams }))} style={{ padding: 8, borderRadius: 8 }}>
                        {TEAM_COUNTS.filter((n) => sportProfile.typicalTeamCounts.includes(n) || n === form.maxTeams).map((n) => <option key={n} value={n}>{n} teams</option>)}
                      </select>
                    </label>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Entry fee (€)</span>
                      <input type="number" min={0} value={form.entryFeeEur} onChange={(e) => setForm((f) => ({ ...f, entryFeeEur: Number(e.target.value) }))} style={{ padding: 8, borderRadius: 8 }} />
                    </label>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Prize / payout description</span>
                      <textarea rows={2} value={form.prizeDescription} onChange={(e) => setForm((f) => ({ ...f, prizeDescription: e.target.value }))} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
                    </label>
                    <div className="pro-row" style={{ gap: 12 }}>
                      <label className="pro-col" style={{ flex: 1, gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Start</span>
                        <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                      </label>
                      <label className="pro-col" style={{ flex: 1, gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>End</span>
                        <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} style={{ padding: 8, borderRadius: 8 }} />
                      </label>
                    </div>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Location</span>
                      <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Venue or city" style={{ padding: 8, borderRadius: 8 }} />
                    </label>
                    <Button variant="primary" disabled={!form.name || !form.startDate || !form.endDate} onClick={() => setCreateStep(1)}>
                      Continue to rules <ChevronRight size={14} style={{ display: "inline", marginLeft: 4 }} />
                    </Button>
                  </div>
                </>
              )}

              {createStep === 1 && (
                <>
                  <h3 style={{ marginTop: 0 }}>Step 2 — Rules & requirements</h3>
                  <div className="pro-col" style={{ gap: 12 }}>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>What teams must bring / comply with</span>
                      <textarea rows={3} value={form.settings.requirements} onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, requirements: e.target.value } }))} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
                    </label>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Welcome message (registration page)</span>
                      <textarea rows={2} value={form.settings.welcomeMessage} onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, welcomeMessage: e.target.value } }))} style={{ padding: 8, borderRadius: 8, fontFamily: "inherit" }} />
                    </label>
                    <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={form.settings.autoApprove} onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, autoApprove: e.target.checked } }))} />
                      <span style={{ fontSize: 13 }}>Auto-approve teams (otherwise you review each entry)</span>
                    </label>
                    <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={form.settings.captainOnly} onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, captainOnly: e.target.checked } }))} />
                      <span style={{ fontSize: 13 }}>Captain-only registration</span>
                    </label>
                    <label className="pro-row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={form.settings.collectTeamGoals} onChange={(e) => setForm((f) => ({ ...f, settings: { ...f.settings, collectTeamGoals: e.target.checked } }))} />
                      <span style={{ fontSize: 13 }}>Ask teams what they want from the tournament</span>
                    </label>
                    <div className="pro-row" style={{ gap: 8 }}>
                      <Button variant="ghost" onClick={() => setCreateStep(0)}>Back</Button>
                      <Button variant="primary" onClick={() => setCreateStep(2)}>Continue to team access</Button>
                    </div>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <>
                  <h3 style={{ marginTop: 0 }}>Step 3 — Team access</h3>
                  <p className="pro-text-muted" style={{ fontSize: 13, marginTop: 0 }}>
                    Link your Pro team and invite co-managers. Only subscribed Pro members can help run the tournament.
                  </p>
                  <div className="pro-col" style={{ gap: 12 }}>
                    <label className="pro-col" style={{ gap: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Hosting team</span>
                      <select
                        value={form.teamId}
                        onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value, coManagers: [] }))}
                        style={{ padding: 8, borderRadius: 8 }}
                      >
                        <option value="">No team (solo organizer)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} · {t.sport}</option>
                        ))}
                      </select>
                    </label>

                    {form.teamId && (
                      <>
                        <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Co-managers (optional)</p>
                        {coManagerCandidates.filter((c) => c.hasPro && c.userId !== user?.id).length === 0 ? (
                          <p className="pro-text-muted" style={{ fontSize: 12 }}>No other Pro subscribers on this team — you can add staff later from the Staff tab.</p>
                        ) : (
                          <div className="pro-col" style={{ gap: 8 }}>
                            {coManagerCandidates
                              .filter((c) => c.hasPro && c.userId !== user?.id)
                              .map((c) => {
                                const selected = form.coManagers.find((m) => m.userId === c.userId);
                                return (
                                  <div key={c.userId} className="pro-row" style={{ justifyContent: "space-between", padding: 10, borderRadius: 8, border: "1px solid var(--pro-border)", alignItems: "center" }}>
                                    <div>
                                      <span style={{ fontWeight: 700 }}>{c.displayName}</span>
                                      <span className="pro-text-muted" style={{ fontSize: 11, marginLeft: 8 }}>{c.role}{c.isCaptain ? " · Captain" : ""}</span>
                                    </div>
                                    {selected ? (
                                      <div className="pro-row" style={{ gap: 6, alignItems: "center" }}>
                                        <select
                                          value={selected.role}
                                          onChange={(e) =>
                                            setForm((f) => ({
                                              ...f,
                                              coManagers: f.coManagers.map((m) =>
                                                m.userId === c.userId ? { ...m, role: e.target.value as typeof selected.role } : m,
                                              ),
                                            }))
                                          }
                                          style={{ padding: 4, borderRadius: 6, fontSize: 12 }}
                                        >
                                          <option value="admin">Admin</option>
                                          <option value="operations">Operations</option>
                                          <option value="scorekeeper">Scorekeeper</option>
                                        </select>
                                        <Button size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, coManagers: f.coManagers.filter((m) => m.userId !== c.userId) }))}>Remove</Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          setForm((f) => ({
                                            ...f,
                                            coManagers: [...f.coManagers, { userId: c.userId, role: "operations", displayName: c.displayName }],
                                          }))
                                        }
                                      >
                                        Add
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    )}

                    <div className="pro-row" style={{ gap: 8 }}>
                      <Button variant="ghost" onClick={() => setCreateStep(1)}>Back</Button>
                      <Button variant="primary" onClick={() => setCreateStep(3)}>Review & launch</Button>
                    </div>
                  </div>
                </>
              )}

              {createStep === 3 && (
                <>
                  <h3 style={{ marginTop: 0 }}>Step 4 — Launch</h3>
                  <div className="pro-col" style={{ gap: 10, fontSize: 14 }}>
                    <p><strong>{form.name || "Untitled"}</strong> · {form.sport} · {formatLabel(form.format)} · {form.maxTeams} teams</p>
                    <p className="pro-text-muted" style={{ fontSize: 13 }}>{form.startDate} → {form.endDate} · {form.location || "Location TBC"}</p>
                    <p className="pro-text-muted" style={{ fontSize: 13 }}>Entry €{form.entryFeeEur}{form.prizeDescription ? ` · ${form.prizeDescription}` : ""}</p>
                    {form.teamId && (
                      <p style={{ fontSize: 13 }}>
                        Hosting team: <strong>{teams.find((t) => t.id === form.teamId)?.name || activeTeam?.name}</strong>
                        {form.coManagers.length > 0 && ` · ${form.coManagers.length} co-manager(s)`}
                      </p>
                    )}
                    <div className="pro-row" style={{ gap: 8, marginTop: 8 }}>
                      <Button variant="ghost" onClick={() => setCreateStep(2)}>Back</Button>
                      <Button
                        variant="primary"
                        leadingIcon={createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                        disabled={createMutation.isPending || !form.name || !form.startDate || !form.endDate}
                        onClick={() => createMutation.mutate()}
                      >
                        Create tournament
                      </Button>
                    </div>
                    {createError && <p style={{ color: "#ef4444", fontSize: 13, margin: "8px 0 0" }}>{createError}</p>}
                  </div>
                </>
              )}
            </Card>
            <Card>
              <h3 style={{ marginTop: 0 }}>{form.sport} guide</h3>
              <p className="pro-text-muted" style={{ fontSize: 13 }}>{sportProfile.rosterHint}</p>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Recommended kit</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--pro-text-muted)" }}>
                {sportProfile.kitRequirements.map((k) => <li key={k}>{k}</li>)}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "mine" && (
        <Card padded={false}>
          {listLoading ? <div className="p-4 animate-pulse h-32" style={{ background: "var(--pro-surface-2)" }} /> : mine.length === 0 ? (
            <EmptyState icon={<Trophy size={20} />} title="No tournaments yet" description="Create your first competition and share the registration link with captains." />
          ) : (
            <table className="pro-table">
              <thead><tr><th>Name</th><th>Sport</th><th>Format</th><th>Teams</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {mine.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{t.name}</td>
                    <td>{t.sport}</td>
                    <td>{formatLabel(t.format)}</td>
                    <td>{t.maxTeams}</td>
                    <td><Tag tone={t.status === "completed" ? "success" : "muted"}>{t.status}</Tag></td>
                    <td><Button href={`/pro/tournament/${t.id}`} size="sm" variant="secondary">Manage</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </PageShell>
  );
}

/** Public registration — no Pro required, captain registers eligible team. */
export function TournamentPublicPage() {
  const [, params] = useRoute("/tournament/:id");
  const id = params?.id;
  const qc = useQueryClient();

  const [teamId, setTeamId] = useState("");
  const [teamGoals, setTeamGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");

  const { data, isLoading } = useQuery<Tournament>({
    queryKey: ["/api/pro/tournaments", id, "public"],
    enabled: !!id,
    queryFn: async () => {
      const r = await fetch(`/api/pro/tournaments/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const { data: eligibleTeams = [] } = useQuery<EligibleTeam[]>({
    queryKey: ["/api/pro/tournaments", id, "eligible-teams"],
    enabled: !!id,
    queryFn: async () => {
      const r = await fetch(`/api/pro/tournaments/${id}/eligible-teams`, { credentials: "include" });
      if (r.status === 401) return [];
      if (!r.ok) return [];
      return r.json();
    },
  });

  const settings = data?.settings ?? DEFAULT_TOURNAMENT_SETTINGS;
  const tProfile = data ? getSportTournamentProfile(data.sport) : null;

  const checkoutMutation = useMutation({
    mutationFn: async (tid: string) => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${id}/checkout`, { teamId: tid });
      return res.json() as Promise<{ clientSecret?: string; freeEntry?: boolean }>;
    },
    onSuccess: async (res) => {
      if (res.freeEntry) {
        registerMutation.mutate(undefined);
        return;
      }
      if (res.clientSecret) setClientSecret(res.clientSecret);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (paymentIntentId?: string) => {
      const res = await apiRequest("POST", `/api/pro/tournaments/${id}/register`, {
        teamId,
        paymentIntentId,
        teamGoals: settings.collectTeamGoals ? teamGoals : undefined,
        notes,
        contactEmail,
      });
      return res.json();
    },
    onSuccess: (body: any) => {
      setRegistered(true);
      setRegisterMessage(body.message || "Registered!");
      setClientSecret(null);
      qc.invalidateQueries({ queryKey: ["/api/pro/tournaments", id] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-bg)" }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surna-bg)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <Tag tone="active">{data.sport}</Tag>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0" }}>{data.name}</h1>
        <p style={{ color: "var(--surna-text-muted)", fontSize: 14 }}>{formatLabel(data.format)} · €{data.entryFeeEur} per team</p>

        {settings.welcomeMessage && <p style={{ fontSize: 14, marginTop: 12 }}>{settings.welcomeMessage}</p>}

        <Card style={{ margin: "16px 0", padding: 16, borderRadius: 12 }}>
          <div className="flex gap-3 mb-2"><MapPin size={16} /><span>{data.location || "TBC"}</span></div>
          <div className="flex gap-3 mb-2"><Calendar size={16} /><span>{data.startDate} → {data.endDate}</span></div>
          <div className="flex gap-3"><Users size={16} /><span>{data.registrations?.length ?? 0} / {data.maxTeams} teams</span></div>
          {data.prizeDescription && <p style={{ marginTop: 12, fontWeight: 600 }}>🏆 {data.prizeDescription}</p>}
        </Card>

        {(settings.requirements || tProfile) && (
          <Card style={{ marginBottom: 16, padding: 16 }}>
            <h3 style={{ marginTop: 0, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><ClipboardList size={14} /> What you need</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {(settings.requirements || tProfile?.kitRequirements.join("\n") || "").split("\n").filter(Boolean).map((line) => (
                <li key={line} style={{ marginBottom: 4 }}>{line}</li>
              ))}
            </ul>
            {tProfile && <p className="pro-text-muted" style={{ fontSize: 12, marginTop: 8 }}>{tProfile.rosterHint}</p>}
          </Card>
        )}

        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Registered teams</h3>
        <ul style={{ margin: "0 0 20px", paddingLeft: 18, fontSize: 14 }}>
          {(data.registrations ?? []).map((r) => <li key={r.id}>{r.teamName}</li>)}
          {(data.registrations?.length ?? 0) === 0 && <li style={{ color: "var(--surna-text-muted)" }}>Be the first to register</li>}
        </ul>

        {registered ? (
          <Card style={{ padding: 16, textAlign: "center", background: "rgba(34,197,94,0.12)", border: "1px solid #22c55e" }}>
            <Trophy size={32} style={{ margin: "0 auto 8px" }} />
            <p style={{ fontWeight: 800 }}>{registerMessage}</p>
          </Card>
        ) : clientSecret && stripePromise ? (
          <Card style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Pay entry fee</h3>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <RegisterPaymentForm clientSecret={clientSecret} onSuccess={(pi) => registerMutation.mutate(pi)} onCancel={() => setClientSecret(null)} />
            </Elements>
          </Card>
        ) : (
          <Card style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Register your team</h3>
            {eligibleTeams.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--surna-text-muted)" }}>
                No eligible {data.sport} teams found. You must be team captain with a matching sport team.
              </p>
            ) : (
              <>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <option value="">Select your team…</option>
                  {eligibleTeams.map((t) => (
                    <option key={t.id} value={t.id} disabled={!t.isCaptain && settings.captainOnly}>
                      {t.name} ({t.members} members){!t.isCaptain && settings.captainOnly ? " — captain only" : ""}
                    </option>
                  ))}
                </select>
                {settings.collectTeamGoals && (
                  <textarea value={teamGoals} onChange={(e) => setTeamGoals(e.target.value)} rows={2} placeholder="What does your team want from this tournament?" style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 10, fontFamily: "inherit" }} />
                )}
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything else the organizer should know?" style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 10, fontFamily: "inherit" }} />
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email (optional)" style={{ width: "100%", padding: 10, borderRadius: 8, marginBottom: 12 }} />
                <Button variant="primary" fullWidth disabled={!teamId || checkoutMutation.isPending} onClick={() => checkoutMutation.mutate(teamId)}>
                  {data.entryFeeEur > 0 ? `Pay €${data.entryFeeEur} & apply` : "Submit application"}
                </Button>
              </>
            )}
            <Link href="/pro/tournament"><p style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>Organizer? Manage in Pro <ChevronRight size={12} style={{ display: "inline" }} /></p></Link>
          </Card>
        )}
      </div>
    </div>
  );
}
