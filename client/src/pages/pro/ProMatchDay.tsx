import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Swords, LayoutGrid, Users, Plus, Calendar, Save, Send,
  FileText, Trophy,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import { apiRequest } from "@/lib/queryClient";
import { proKeys, mapMatchRows, fetchProJson, type ProMatchRow } from "./lib/proQueries";
import FormationMessageCard from "./components/FormationMessageCard";
import {
  type PitchPlayer,
  type BenchPlayer,
  buildEmptyPitch,
  encodeFormationMessage,
  getFormationTemplate,
  snapToFormation,
  assignBenchToSlot,
  clearPitchSlot,
  isPitchSlotFilled,
  playerMatchesIdentity,
} from "./lib/tacticalFormations";
import { defaultFormationForLayout } from "./lib/proSport";
import type { SportTacticalLayoutId } from "@shared/sportTacticalLayouts";
import { getLayoutMeta } from "@shared/sportTacticalLayouts";
import { getArchetypeDef } from "@shared/formationBoard";
import ProSportMatchPanel from "./components/ProSportMatchPanel";

const TacticalBoard = lazy(() => import("./components/TacticalBoard"));

type MTab = "upcoming" | "formations" | "squads" | "history";

type Match = ProMatchRow;

type FormationRow = {
  id: string;
  name: string;
  shape?: string;
  usage?: number;
  layoutJson?: unknown;
  sportType?: string;
};

type SquadMember = {
  id: string;
  name: string;
  position: string;
  number?: number;
  userId?: string;
  status?: string;
  photoUrl?: string;
};

type FormationBoardMeta = {
  layoutId: SportTacticalLayoutId | null;
  defaultFormationKey: string | null;
  formationLayout: string | null;
  archetypes: Array<{ key: string; label: string; formationKey: string; blurb: string }>;
  shapePresets: Array<{ key: string; label: string }>;
};

type MessengerGroup = { id: string; name?: string };

function isAvailable(status?: string) {
  const s = (status || "active").toLowerCase();
  return s === "active" || s === "available";
}

function MStatus({ s }: { s: Match["status"] }) {
  if (s === "live") return <Tag tone="danger">Live</Tag>;
  if (s === "ready") return <Tag tone="success">Ready</Tag>;
  return <Tag tone="muted">Scheduled</Tag>;
}


type SavedLayout = {
  formationKey?: string;
  layoutId?: SportTacticalLayoutId;
  archetypeKey?: string;
  benchOrder?: string[];
  players?: Array<{
    playerId?: string;
    userId?: string;
    name: string;
    number?: number;
    role: string;
    x: number;
    y: number;
    note?: string;
    photoUrl?: string;
  }>;
};

export default function ProMatchDay() {
  const { isTeamMode } = useProWorkspaceContext();
  if (!isTeamMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Match Day"
        description="Lineups, formations, and match prep are part of Team Pro."
      />
    );
  }
  return <ProTeamMatchDay />;
}

function ProTeamMatchDay() {
  const { teamId, teams, activeTeam, sportProfile } = useProTeam();
  const teamName = activeTeam?.name ?? teams.find((t) => t.id === teamId)?.name ?? "Team";
  const { can } = useProRole();
  const canManage = can("match.manage");
  const qc = useQueryClient();

  const [tab, setTab] = useState<MTab>("upcoming");
  const profileLayout = sportProfile.tacticalLayout;
  const [layoutId, setLayoutId] = useState<SportTacticalLayoutId>(profileLayout ?? "football");
  const [formationKey, setFormationKey] = useState<string>(
    sportProfile.defaultFormation ?? "4-3-3",
  );
  const [archetypeKey, setArchetypeKey] = useState<string | null>(null);
  const [activeFormationId, setActiveFormationId] = useState<string | null>(null);
  const [pitchPlayers, setPitchPlayers] = useState<PitchPlayer[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [playerNotes, setPlayerNotes] = useState<Record<string, string>>({});
  const [squadInitialized, setSquadInitialized] = useState(false);

  const { data: matches = [], isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: proKeys.teamMatches(teamId ?? ""),
    enabled: !!teamId,
    queryFn: async ({ signal }) => {
      const rows = await fetchProJson<unknown[]>(`/api/pro/team/${teamId}/matches`, signal);
      return mapMatchRows(rows);
    },
  });

  const needsFormations = tab === "formations";
  const { data: boardMeta } = useQuery<FormationBoardMeta>({
    queryKey: proKeys.teamFormationBoard(teamId ?? ""),
    enabled: !!teamId && needsFormations,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/formation-board`, signal),
  });

  const tacticalLayout = boardMeta?.layoutId ?? profileLayout ?? null;

  const { data: apiFormations = [], isLoading: formLoading } = useQuery<FormationRow[]>({
    queryKey: proKeys.teamFormations(teamId ?? ""),
    enabled: !!teamId && needsFormations && !!tacticalLayout,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/formations`, signal),
  });

  const needsSquad = !!teamId;
  const { data: squad = [], isLoading: squadLoading } = useQuery<SquadMember[]>({
    queryKey: proKeys.teamSquad(teamId ?? ""),
    enabled: needsSquad,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/squad`, signal),
  });

  const { data: pastMatches = [], isLoading: pastLoading } = useQuery<Match[]>({
    queryKey: proKeys.teamMatchesPast(teamId ?? ""),
    enabled: !!teamId && tab === "history",
    queryFn: async ({ signal }) => {
      const rows = await fetchProJson<unknown[]>(`/api/pro/team/${teamId}/matches?range=past`, signal);
      return mapMatchRows(rows);
    },
  });

  const sportFormations = useMemo(
    () => apiFormations.filter((f) => !f.sportType || f.sportType === layoutId),
    [apiFormations, layoutId],
  );

  const { data: messengerGroups } = useQuery<{ groups?: MessengerGroup[] }>({
    queryKey: ["/api/messenger/groups", "pro-md"],
    queryFn: async () => {
      const r = await fetch("/api/messenger/groups", { credentials: "include" });
      if (!r.ok) return { groups: [] };
      return r.json();
    },
  });

  const availableSquad = useMemo(
    () => squad.filter((p) => isAvailable(p.status)),
    [squad],
  );

  const benchPlayers: BenchPlayer[] = useMemo(() => {
    return availableSquad
      .filter((p) => !pitchPlayers.some((slot) => playerMatchesIdentity(slot, p)))
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        number: p.number,
        position: p.position,
        photoUrl: p.photoUrl,
      }));
  }, [availableSquad, pitchPlayers]);

  const teamGroupId = useMemo(() => {
    const groups = messengerGroups?.groups ?? [];
    const lower = teamName.toLowerCase();
    const match =
      groups.find((g) => (g.name || "").toLowerCase().includes(lower)) ||
      groups.find((g) => (g.name || "").toLowerCase().includes("team")) ||
      groups[0];
    return match?.id ?? null;
  }, [messengerGroups, teamName]);

  const initFormation = useCallback(
    (nextLayout: SportTacticalLayoutId, key?: string) => {
      const fk = key ?? boardMeta?.defaultFormationKey ?? defaultFormationForLayout(nextLayout);
      const template = getFormationTemplate(fk);
      setPitchPlayers(buildEmptyPitch(template));
      setFormationKey(fk);
      setLayoutId(nextLayout);
      setArchetypeKey(null);
      setActiveFormationId(null);
      setSelectedSlotId(null);
      setPlayerNotes({});
    },
    [boardMeta?.defaultFormationKey],
  );

  const loadSavedFormation = useCallback(
    (row: FormationRow) => {
      const layout = (row.layoutJson || {}) as SavedLayout;
      const savedLayoutId =
        layout.layoutId ??
        (row.sportType as SportTacticalLayoutId | undefined) ??
        tacticalLayout ??
        "football";
      const fk =
        layout.formationKey ??
        (savedLayoutId === "gaa" ? "gaa-15" : defaultFormationForLayout(savedLayoutId));
      const template = getFormationTemplate(fk);
      const savedPlayers = layout.players ?? [];
      const notes: Record<string, string> = {};
      const players: PitchPlayer[] = template.slots.map((slot, i) => {
        const saved = savedPlayers[i];
        const squadMatch = saved?.playerId
          ? squad.find((s) => s.id === saved.playerId)
          : saved?.userId
            ? squad.find((s) => s.userId === saved.userId)
            : undefined;
        const slotId = `slot-${i}`;
        if (saved?.note) notes[slotId] = saved.note;
        const filled = !!(saved?.userId || saved?.playerId || squadMatch);
        return {
          slotId,
          playerId: saved?.playerId ?? squadMatch?.id,
          userId: saved?.userId ?? squadMatch?.userId,
          name: filled ? saved?.name ?? squadMatch?.name ?? slot.role : slot.role,
          number: saved?.number ?? squadMatch?.number ?? i + 1,
          role: saved?.role ?? squadMatch?.position ?? slot.role,
          x: saved?.x ?? slot.x,
          y: saved?.y ?? slot.y,
          photoUrl: saved?.photoUrl ?? squadMatch?.photoUrl,
        };
      });
      setFormationKey(fk);
      setLayoutId(savedLayoutId);
      setArchetypeKey(layout.archetypeKey ?? null);
      setActiveFormationId(row.id);
      setPitchPlayers(players);
      setPlayerNotes(notes);
      setSelectedSlotId(null);
    },
    [squad, tacticalLayout],
  );

  useEffect(() => {
    if (!tacticalLayout) return;
    setLayoutId(tacticalLayout);
    setFormationKey(
      boardMeta?.defaultFormationKey ??
        sportProfile.defaultFormation ??
        defaultFormationForLayout(tacticalLayout),
    );
    setSquadInitialized(false);
    setPlayerNotes({});
    setActiveFormationId(null);
    setArchetypeKey(null);
  }, [teamId, tacticalLayout, boardMeta?.defaultFormationKey, sportProfile.defaultFormation]);

  useEffect(() => {
    if (squadLoading || squadInitialized || !tacticalLayout) return;
    initFormation(
      tacticalLayout,
      boardMeta?.defaultFormationKey ?? sportProfile.defaultFormation ?? undefined,
    );
    setSquadInitialized(true);
  }, [
    squadLoading,
    squadInitialized,
    tacticalLayout,
    boardMeta?.defaultFormationKey,
    sportProfile.defaultFormation,
    initFormation,
  ]);

  const handleFormationKeyChange = (key: string) => {
    const template = getFormationTemplate(key);
    setFormationKey(key);
    setLayoutId(template.layoutId);
    setArchetypeKey(null);
    setPitchPlayers((prev) => snapToFormation(prev, template));
  };

  const handleArchetypeSelect = (key: string) => {
    const arch = getArchetypeDef(key);
    if (!arch) return;
    const template = getFormationTemplate(arch.formationKey);
    setArchetypeKey(arch.key);
    setFormationKey(arch.formationKey);
    setLayoutId(arch.layoutId);
    setPitchPlayers((prev) => snapToFormation(prev, template));
  };

  const assignFromBench = useCallback((bench: BenchPlayer, slotId: string) => {
    setPitchPlayers((prev) => {
      const cleared = prev.map((p) =>
        playerMatchesIdentity(p, bench)
          ? clearPitchSlot(p, getFormationTemplate(formationKey).slots[Number(p.slotId.replace("slot-", ""))]?.role)
          : p,
      );
      return cleared.map((p) => {
        if (p.slotId !== slotId) return p;
        return assignBenchToSlot(p, bench, p.role);
      });
    });
    setSelectedSlotId(slotId);
  }, [formationKey]);

  const returnToBench = useCallback((slotId: string) => {
    setPitchPlayers((prev) =>
      prev.map((p) => {
        if (p.slotId !== slotId) return p;
        const idx = Number(p.slotId.replace("slot-", ""));
        const role = getFormationTemplate(formationKey).slots[idx]?.role ?? p.role;
        return clearPitchSlot(p, role);
      }),
    );
    setSelectedSlotId(null);
    setPlayerNotes((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, [formationKey]);

  const assignPlayer = useCallback(
    (player: SquadMember) => {
      if (!selectedSlotId) return;
      assignFromBench(
        {
          id: player.id,
          userId: player.userId,
          name: player.name,
          number: player.number,
          position: player.position,
          photoUrl: player.photoUrl,
        },
        selectedSlotId,
      );
    },
    [selectedSlotId, assignFromBench],
  );

  const saveFormationMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      const template = getFormationTemplate(formationKey);
      const name = archetypeKey
        ? getArchetypeDef(archetypeKey)?.label || template.label
        : template.label;
      const res = await apiRequest("POST", `/api/pro/team/${teamId}/formations`, {
        formationId: activeFormationId || undefined,
        name,
        sportType: layoutId,
        archetypeKey: archetypeKey || undefined,
        layoutJson: {
          formationKey,
          layoutId,
          archetypeKey: archetypeKey || undefined,
          players: pitchPlayers.map((p) => ({
            playerId: p.playerId,
            userId: p.userId,
            name: p.name,
            number: p.number,
            role: p.role,
            x: p.x,
            y: p.y,
            photoUrl: p.photoUrl,
            note: p.userId ? playerNotes[p.slotId] : undefined,
          })),
          benchOrder: benchPlayers.map((b) => b.userId || b.id),
        },
      });
      return res.json();
    },
    onSuccess: (row: FormationRow) => {
      if (row?.id) setActiveFormationId(row.id);
      if (teamId) qc.invalidateQueries({ queryKey: proKeys.teamFormations(teamId) });
    },
  });

  const sendToTeamMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      const template = getFormationTemplate(formationKey);
      const notesByUserId: Record<string, string> = {};
      pitchPlayers.forEach((p) => {
        const note = playerNotes[p.slotId]?.trim();
        if (p.userId && note) notesByUserId[p.userId] = note;
      });
      const payload = {
        surnaType: "formation" as const,
        formationName: template.label,
        layoutId,
        sport: layoutId,
        players: pitchPlayers.map((p) => ({
          name: p.name,
          number: p.number,
          role: p.role,
          x: p.x,
          y: p.y,
          userId: p.userId,
        })),
        notesByUserId: Object.keys(notesByUserId).length ? notesByUserId : undefined,
      };

      if (teamGroupId) {
        await apiRequest("POST", `/api/messenger/groups/${teamGroupId}/messages`, {
          body: encodeFormationMessage(payload),
        });
      } else {
        const notesByName: Record<string, string> = {};
        pitchPlayers.forEach((p) => {
          const note = playerNotes[p.slotId]?.trim();
          if (note) notesByName[p.name] = note;
        });
        await apiRequest("POST", `/api/pro/team/${teamId}/tactical-broadcast`, {
          message: `Matchday formation: ${template.label}`,
          formationName: template.label,
          slots: Object.fromEntries(
            pitchPlayers.map((p, i) => [`slot_${i}`, `${p.name} (${p.role})`]),
          ),
          formationPayload: payload,
          playerNotes: notesByName,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messenger/groups"] });
    },
  });

  const previewPayload = useMemo(
    () => ({
      surnaType: "formation" as const,
      formationName: getFormationTemplate(formationKey).label,
      layoutId,
      sport: layoutId,
      players: pitchPlayers.map((p) => ({
        name: p.name,
        number: p.number,
        role: p.role,
        x: p.x,
        y: p.y,
      })),
    }),
    [formationKey, layoutId, pitchPlayers],
  );

  const sendLineupMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("No team");
      const lineup = availableSquad.slice(0, sportProfile.playersOnField || availableSquad.length);
      const lines = lineup.map((p, i) => {
        const pos = sportProfile.positions[i] ?? p.position;
        return `${pos}: ${p.name}${p.number != null ? ` #${p.number}` : ""}`;
      });
      await apiRequest("POST", `/api/pro/team/${teamId}/tactical-broadcast`, {
        message: `${sportProfile.displaySport} match lineup`,
        formationName: "Match lineup",
        slots: Object.fromEntries(lines.map((l, i) => [`slot_${i}`, l])),
        playerNotes: {},
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/messenger/groups"] });
    },
  });

  const RightPanel = tacticalLayout ? (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Saved formations</h3>
        {sportFormations.length === 0 ? (
          <p className="pro-text-muted" style={{ fontSize: 12, margin: 0 }}>Save a layout to reuse it before the next match.</p>
        ) : (
          <div className="pro-col" style={{ gap: 6 }}>
            {sportFormations.slice(0, 6).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => loadSavedFormation(f)}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--pro-border)",
                  background: "var(--pro-surface)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {f.name}
              </button>
          ))}
        </div>
        )}
      </Card>
      <Card>
        <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>
          Recent results sync when match reports are filed.
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Preview</h3>
        <FormationMessageCard data={previewPayload} />
      </Card>
    </>
  ) : (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>{sportProfile.governingBody}</h3>
        <p className="pro-text-muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
          {sportProfile.matchDuration} · {sportProfile.periods}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {sportProfile.rulesSummary.slice(0, 3).map((r: string) => (
            <li key={r} style={{ marginBottom: 4 }}>{r}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Kit checklist</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {sportProfile.kitRequirements.map((k: string) => (
            <li key={k} style={{ marginBottom: 4 }}>{k}</li>
          ))}
        </ul>
      </Card>
    </>
  );

  const boardLoading = !squadInitialized && !!tacticalLayout;

  const historyRows = pastMatches.map((m) => ({
    id: m.id,
    date: m.date,
    opp: m.opponent,
    res: "—",
    form: "—",
  }));

  return (
    <PageShell
      title={sportProfile.matchDayLabel}
      subtitle={
        tacticalLayout
          ? `${sportProfile.displaySport} · drag players on the ${getLayoutMeta(tacticalLayout).surfaceLabel.toLowerCase()}, add notes, send to the team group.`
          : `${sportProfile.displaySport} · rules, lineup, kit checklist and squad prep for ${sportProfile.governingBody} format.`
      }
      actions={
        <>
          <Button variant="secondary" leadingIcon={<LayoutGrid size={14} />} onClick={() => setTab("formations")}>
            Formations
          </Button>
          {canManage && (
            <Button variant="primary" leadingIcon={<Plus size={14} />}>New match</Button>
          )}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={
          canManage ? (
            <>
              Drag from bench to pitch · snap to slots · {benchPlayers.length} on bench
            </>
          ) : (
            <>Match day overview.</>
          )
        }
        actions={[
          { key: "formations", label: "Formations", icon: <LayoutGrid size={12} />, onClick: () => setTab("formations") },
          { key: "squads", label: "Squads", icon: <Users size={12} />, onClick: () => setTab("squads"), disabled: !canManage },
          { key: "history", label: "History", icon: <FileText size={12} />, onClick: () => setTab("history") },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Upcoming" value={matches.length} icon={<Calendar size={12} />} />
        <StatCard label="Available" value={availableSquad.length} icon={<Users size={12} />} />
        <StatCard label="Saved formations" value={sportFormations.length} icon={<LayoutGrid size={12} />} />
        <StatCard label="Win rate (5)" value="—" icon={<Trophy size={12} />} />
      </div>

      <Tabs<MTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "upcoming", label: "Upcoming", icon: <Calendar size={13} />, count: matches.length },
          { key: "formations", label: tacticalLayout ? "Tactical board" : "Match prep", icon: <LayoutGrid size={13} /> },
          { key: "squads", label: "Match squads", icon: <Users size={13} /> },
          { key: "history", label: "History", icon: <FileText size={13} />, count: historyRows.length },
        ]}
      />

      {tab === "upcoming" && (
        <Card padded={false}>
          {matchesLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 rounded" style={{ background: "var(--pro-surface-2)" }} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <EmptyState
              icon={<Calendar size={18} />}
              title="No upcoming matches"
              description="Create events for your captain account or link fixtures."
            />
          ) : (
          <table className="pro-table">
              <thead>
                <tr>
                  <th>Opponent</th>
                  <th>Competition</th>
                  <th>When</th>
                  <th>Venue</th>
                  <th>Status</th>
                </tr>
              </thead>
            <tbody>
              {matches.map((m) => (
                  <tr key={m.id}>
                  <td style={{ fontWeight: 700 }}>vs {m.opponent}</td>
                  <td><Tag tone="muted">{m.competition}</Tag></td>
                    <td>{m.date} {m.time}</td>
                    <td>{m.venue}</td>
                  <td><MStatus s={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </Card>
      )}

      {tab === "formations" && !tacticalLayout && (
        <ProSportMatchPanel
          profile={sportProfile}
          squad={squad}
          canManage={canManage}
          onSendLineup={canManage ? () => sendLineupMutation.mutate() : undefined}
          sending={sendLineupMutation.isPending}
        />
      )}

      {tab === "formations" && tacticalLayout && (
        <div
          className="pro-grid"
          style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,300px)", gap: 16 }}
        >
          <Card className="pro-tactical-card">
            <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Tactical board</h3>
                <p className="pro-text-muted" style={{ margin: "4px 0 0", fontSize: 11 }}>
                  {getLayoutMeta(layoutId).label}
                  {boardMeta?.formationLayout ? ` · ${boardMeta.formationLayout}` : ""}
                </p>
              </div>
            </div>

            {boardLoading || formLoading ? (
              <div className="animate-pulse rounded-xl" style={{ height: 420, background: "var(--pro-surface-2)" }} />
            ) : (
              <Suspense fallback={<div className="animate-pulse rounded-xl" style={{ height: 420, background: "var(--pro-surface-2)" }} />}>
                <TacticalBoard
                  layoutId={layoutId}
                  formationKey={formationKey}
                  onFormationChange={handleFormationKeyChange}
                  players={pitchPlayers}
                  onPlayersChange={setPitchPlayers}
                  bench={benchPlayers}
                  onAssignFromBench={assignFromBench}
                  onReturnToBench={returnToBench}
                  selectedSlotId={selectedSlotId}
                  onSelectSlot={setSelectedSlotId}
                  playerNotes={playerNotes}
                  noteForSlot={selectedSlotId ? playerNotes[selectedSlotId] ?? "" : ""}
                  onNoteChange={(slotId, note) =>
                    setPlayerNotes((prev) => ({ ...prev, [slotId]: note }))
                  }
                  archetypes={boardMeta?.archetypes ?? []}
                  archetypeKey={archetypeKey}
                  onArchetypeSelect={handleArchetypeSelect}
                />
              </Suspense>
            )}

            {canManage && (
              <div className="pro-row" style={{ marginTop: 16, gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  leadingIcon={<Send size={14} />}
                  disabled={sendToTeamMutation.isPending || !pitchPlayers.some(isPitchSlotFilled)}
                  onClick={() => sendToTeamMutation.mutate()}
                >
                  Send to team
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Save size={14} />}
                  disabled={saveFormationMutation.isPending}
                  onClick={() => saveFormationMutation.mutate()}
                >
                  Save formation
                </Button>
                {sendToTeamMutation.isSuccess && <Tag tone="success">Sent to team chat</Tag>}
                {saveFormationMutation.isSuccess && <Tag tone="success">Saved</Tag>}
                {!teamGroupId && (
                  <span style={{ fontSize: 11, color: "#a3a3a3" }}>
                    No team group found — sent via squad DMs
                  </span>
                )}
            </div>
            )}
          </Card>

          <Card>
            <h3 style={{ marginTop: 0 }}>Squad ({availableSquad.length} available)</h3>
            <p
              className={`pro-text-muted${selectedSlotId ? " pro-squad-picker__hint--active" : ""}`}
              style={{ fontSize: 12 }}
            >
              {selectedSlotId
                ? "Tap a player to place on the selected slot (or drag from the bench)."
                : "Drag from the bench onto the pitch, or select a slot then tap a player."}
            </p>
            {squadLoading ? (
              <div className="animate-pulse h-40 rounded mt-2" style={{ background: "var(--pro-surface-2)" }} />
            ) : availableSquad.length === 0 ? (
              <EmptyState
                icon={<Users size={16} />}
                title="No available players"
                description="Mark players as Available on the Roster page."
              />
            ) : (
              <div
                className={`pro-squad-picker${selectedSlotId ? " pro-squad-picker--ready" : ""}`}
              >
                {availableSquad.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="pro-squad-picker__item"
                    disabled={!selectedSlotId}
                    onClick={() => assignPlayer(p)}
                  >
                    <span className="pro-squad-picker__badge">{p.number ?? "—"}</span>
                    <span className="pro-squad-picker__name">{p.name}</span>
                    <span className="pro-squad-picker__pos">{p.position}</span>
                  </button>
              ))}
            </div>
            )}
            {squad.filter((p) => !isAvailable(p.status)).length > 0 && (
              <p className="pro-text-muted" style={{ fontSize: 11, marginTop: 12 }}>
                {squad.filter((p) => !isAvailable(p.status)).length} player(s) unavailable (injured/suspended) — hidden from picker.
              </p>
            )}
          </Card>
        </div>
      )}

      {tab === "squads" && (
          <Card>
          {squadLoading ? (
            <div className="animate-pulse h-32 rounded" style={{ background: "var(--pro-surface-2)" }} />
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {squad.map((p) => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  {p.name} — {p.position}{" "}
                  {p.number != null ? `#${p.number}` : ""}{" "}
                  <Tag tone={isAvailable(p.status) ? "success" : "danger"}>
                    {p.status || "active"}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
          </Card>
      )}

      {tab === "history" && (
        <Card padded={false}>
          {pastLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 rounded" style={{ background: "var(--pro-surface-2)" }} />
              ))}
            </div>
          ) : historyRows.length === 0 ? (
            <EmptyState
              icon={<FileText size={18} />}
              title="No past fixtures"
              description="Completed matches appear here once events are recorded for your team captain."
            />
          ) : (
          <table className="pro-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Competition</th>
                  <th>Venue</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((h) => (
                  <tr key={h.id}>
                    <td>{h.date}</td>
                    <td>{h.opp}</td>
                    <td><Tag tone="muted">Fixture</Tag></td>
                    <td>{pastMatches.find((m) => m.id === h.id)?.venue ?? "—"}</td>
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
