import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Calendar, Image as ImageIcon, BarChart3, Settings, Shield,
  MapPin, Plus, MoreHorizontal, Search, Filter, UserPlus, CheckCheck,
  Clock, MessageSquare, ChevronRight, Pencil,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, FilterChips, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam, type ProTeamSummary } from "./components/ProTeamContext";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import ProPlaceStaffModule from "./modules/ProPlaceStaffModule";
import { apiRequest } from "@/lib/queryClient";
import { proKeys } from "./lib/proQueries";
import { Link } from "wouter";

type TeamTab = "roster" | "schedule" | "events" | "media" | "analytics" | "settings";

type Member = {
  id: string;
  name: string;
  position: string;
  number?: number;
  status: "active" | "injured" | "suspended" | "inactive";
  playerId?: string;
  attendance: number;
  joined: string;
  role: "captain" | "player" | "coach" | "staff";
};

type AvailabilityStatus = "active" | "injured" | "suspended";

const AVAIL_CYCLE: AvailabilityStatus[] = ["active", "injured", "suspended"];

function availabilityDotColor(status: AvailabilityStatus) {
  if (status === "active") return "#22c55e";
  if (status === "injured") return "#ef4444";
  return "#eab308";
}

function availabilityLabel(status: AvailabilityStatus) {
  if (status === "active") return "Available";
  if (status === "injured") return "Injured";
  return "Suspended";
}

function toAvailability(status: Member["status"]): AvailabilityStatus {
  if (status === "injured") return "injured";
  if (status === "suspended") return "suspended";
  return "active";
}

function StatusTag({ status }: { status: Member["status"] | ProTeamSummary["status"] }) {
  if (status === "active") return <Tag tone="success">Available</Tag>;
  if (status === "recruiting") return <Tag tone="active">Recruiting</Tag>;
  if (status === "paused") return <Tag tone="muted">Paused</Tag>;
  if (status === "injured") return <Tag tone="danger">Injured</Tag>;
  if (status === "suspended") return <Tag tone="muted">Suspended</Tag>;
  return <Tag tone="muted">Inactive</Tag>;
}

function TeamSwitcher({
  teams,
  activeId,
  onChange,
}: {
  teams: ProTeamSummary[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = teams.find((t) => t.id === activeId);
  if (!active) {
    return (
      <Card>
        <EmptyState icon={<Users size={18} />} title="No teams yet" description="Join or create a team in the main app to manage it here." />
      </Card>
    );
  }
  return (
    <Card>
      <div className="pro-row" style={{ gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "var(--pro-active)", color: "var(--pro-active-text)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em",
        }}>
          {active.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pro-row" style={{ gap: 8 }}>
            <h2 style={{ margin: 0 }}>{active.name}</h2>
            <StatusTag status={active.status} />
          </div>
          <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <span className="pro-row" style={{ gap: 4 }}><Shield size={12} /> {active.sport}</span>
            <span className="pro-row" style={{ gap: 4 }}><MapPin size={12} /> {active.location}</span>
            <span className="pro-row" style={{ gap: 4 }}><Users size={12} /> {active.members} members</span>
            <span>★ {active.rating}</span>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <select
            value={activeId}
            onChange={(e) => onChange(e.target.value)}
            data-testid="select-team"
            style={{
              appearance: "none",
              padding: "8px 32px 8px 12px",
              borderRadius: 10,
              border: "1px solid var(--pro-border-strong)",
              background: "var(--pro-surface)",
              color: "var(--pro-text)",
              fontSize: "var(--pro-fs-sm)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <ChevronRight size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--pro-text-subtle)", pointerEvents: "none" }} />
        </div>
        <Button variant="secondary" leadingIcon={<Pencil size={14} />} href="/pro/settings">Edit</Button>
      </div>
    </Card>
  );
}

type RosterFilter = "all" | "active" | "injured" | "inactive" | "captain" | "coach" | "staff";

function RosterTable({
  members,
  loading,
  teamId,
  canEdit,
  onStatusChange,
}: {
  members: Member[];
  loading: boolean;
  teamId: string;
  canEdit: boolean;
  onStatusChange: (playerId: string, status: AvailabilityStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const availableCount = members.filter((m) => m.status === "active").length;

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (filter === "all") { /* keep */ }
      else if (filter === "active" || filter === "injured" || filter === "inactive") {
        if (m.status !== filter) return false;
      } else {
        if (m.role !== filter) return false;
      }
      if (search.trim() && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.position.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [members, search, filter]);

  const counts = useMemo(() => ({
    all: members.length,
    active: members.filter((m) => m.status === "active").length,
    injured: members.filter((m) => m.status === "injured").length,
    inactive: members.filter((m) => m.status === "inactive").length,
    captain: members.filter((m) => m.role === "captain").length,
    coach: members.filter((m) => m.role === "coach").length,
    staff: members.filter((m) => m.role === "staff").length,
  }), [members]);

  if (loading) {
    return (
      <Card padded={false}>
        <div className="pro-col" style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: 40, borderRadius: 8, background: "var(--pro-surface-2)" }} />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <div className="pro-col" style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border)", gap: 10 }}>
        <div className="pro-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="pro-row" style={{ gap: 8, fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            <span>{availableCount} available</span>
            <span className="pro-text-muted" style={{ fontWeight: 500 }}>
              · tap status to cycle
            </span>
          </div>
        </div>
        <div className="pro-row" style={{ gap: 8 }}>
          <div className="pro-topbar__search" style={{ height: 32, maxWidth: 280, flex: 1 }}>
            <Search size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members…" data-testid="input-roster-search" />
          </div>
          <Button variant="secondary" size="sm" leadingIcon={<Filter size={13} />}>More</Button>
        </div>
        <FilterChips<RosterFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all",      label: "All",      count: counts.all },
            { key: "active",   label: "Active",   count: counts.active },
            { key: "injured",  label: "Injured",  count: counts.injured },
            { key: "inactive", label: "Inactive", count: counts.inactive },
            { key: "captain",  label: "Captains", count: counts.captain },
            { key: "coach",    label: "Coaches",  count: counts.coach },
            { key: "staff",    label: "Staff",    count: counts.staff },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={18} />} title="No members match" description="Try clearing filters or search." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="pro-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Member</th>
                <th>Position</th>
                <th>Role</th>
                <th>Attendance</th>
                <th>Joined</th>
                <th>Availability</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} data-testid={`member-row-${m.id}`}>
                  <td style={{ color: "var(--pro-text-subtle)", fontWeight: 700 }}>{m.number ?? "—"}</td>
                  <td>
                    <div className="pro-row" style={{ gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 99,
                        background: "var(--pro-surface-3)", color: "var(--pro-text)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800,
                      }}>{m.name.charAt(0)}</div>
                      <span style={{ fontWeight: 700 }}>{m.name}</span>
                    </div>
                  </td>
                  <td className="pro-text-muted">{m.position}</td>
                  <td><Tag tone={m.role === "captain" ? "active" : "muted"}>{m.role}</Tag></td>
                  <td>
                    <div className="pro-row" style={{ gap: 8 }}>
                      <div style={{
                        width: 60, height: 6, borderRadius: 99,
                        background: "var(--pro-surface-3)", overflow: "hidden",
                      }}>
                        <div style={{ width: `${m.attendance}%`, height: "100%", background: "var(--pro-active)" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--pro-text-muted)" }}>{m.attendance}%</span>
                    </div>
                  </td>
                  <td className="pro-text-muted">{m.joined}</td>
                  <td>
                    <button
                      type="button"
                      disabled={!canEdit || !m.playerId}
                      onClick={() => {
                        if (!m.playerId) return;
                        const cur = toAvailability(m.status);
                        const next = AVAIL_CYCLE[(AVAIL_CYCLE.indexOf(cur) + 1) % AVAIL_CYCLE.length];
                        onStatusChange(m.playerId, next);
                      }}
                      title={canEdit ? "Tap to change availability" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--pro-border)",
                        background: "var(--pro-surface)",
                        cursor: canEdit && m.playerId ? "pointer" : "default",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: availabilityDotColor(toAvailability(m.status)),
                          flexShrink: 0,
                        }}
                      />
                      {availabilityLabel(toAvailability(m.status))}
                    </button>
                  </td>
                  <td>
                    <div className="pro-row" style={{ gap: 4 }}>
                      <button type="button" className="pro-icon-btn" aria-label="Message" style={{ width: 28, height: 28 }}><MessageSquare size={13} /></button>
                      <button type="button" className="pro-icon-btn" aria-label="More" style={{ width: 28, height: 28 }}><MoreHorizontal size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PendingRequests() {
  const { can } = useProRole();
  const requests = [
    { id: "r1", name: "Marco S.", role: "Player", note: "Defender, 5 yrs experience" },
    { id: "r2", name: "Lia P.",   role: "Coach",  note: "Youth UEFA B license" },
    { id: "r3", name: "Tom W.",   role: "Player", note: "Goalkeeper, free Sundays" },
  ];
  return (
    <Card padded={false}>
      <div style={{ padding: "16px 18px 8px" }}>
        <h3 style={{ margin: 0 }}>Pending join requests</h3>
        <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>{requests.length} awaiting review</p>
      </div>
      {requests.map((r, idx) => (
        <div key={r.id} className="pro-row" style={{
          padding: "12px 18px", gap: 10,
          borderTop: idx === 0 ? "1px solid var(--pro-border)" : "1px solid var(--pro-border-soft)",
        }} data-testid={`request-${r.id}`}>
          <div style={{
            width: 32, height: 32, borderRadius: 99,
            background: "var(--pro-surface-3)", color: "var(--pro-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
          }}>{r.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{r.name}</div>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{r.role} · {r.note}</div>
          </div>
          <Button variant="ghost" size="sm" disabled={!can("members.approve")} href="/pro/approvals" title={!can("members.approve") ? "Requires admin or manager role" : undefined}>Decline</Button>
          <Button variant="primary" size="sm" leadingIcon={<CheckCheck size={12} />} disabled={!can("members.approve")} href="/pro/approvals" title={!can("members.approve") ? "Requires admin or manager role" : undefined}>Approve</Button>
        </div>
      ))}
    </Card>
  );
}

function mapRosterToMembers(rows: Array<{ id: string; userId?: string; name: string; position: string; number?: number; status: string }>): Member[] {
  return rows.map((r) => {
    const st = (r.status || "active").toLowerCase();
    const status: Member["status"] =
      st === "injured"
        ? "injured"
        : st === "suspended"
          ? "suspended"
          : st === "inactive" || st === "reserve"
            ? "inactive"
            : "active";
    const pos = (r.position || "").toLowerCase();
    let role: Member["role"] = "player";
    if (pos.includes("coach")) role = "coach";
    else if (pos.includes("physio") || pos.includes("staff")) role = "staff";
    return {
      id: r.userId || r.id,
      playerId: r.id,
      name: r.name,
      position: r.position || "—",
      number: r.number,
      status,
      attendance: status === "active" ? 85 : 50,
      joined: "—",
      role,
    };
  });
}

export default function ProRoster() {
  const { isPlaceMode, isShopMode } = useProWorkspaceContext();
  if (isPlaceMode) return <ProPlaceStaffModule />;
  if (isShopMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Squad roster"
        description="Player rosters live in Team Pro. Manage shop products from Inventory."
      />
    );
  }
  return <ProTeamRoster />;
}

function ProTeamRoster() {
  const { teams, teamId, setTeamId, teamsLoading, sportProfile } = useProTeam();
  const [tab, setTab] = useState<TeamTab>("roster");
  const { can } = useProRole();
  const qc = useQueryClient();

  const effectiveTeam = teamId || teams[0]?.id || "";

  const { data: roleMembers, isLoading: membersLoading } = useQuery({
    queryKey: proKeys.teamMembers(effectiveTeam),
    enabled: !!effectiveTeam,
    queryFn: async () => {
      const r = await fetch(`/api/pro/team/${effectiveTeam}/members`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const { data: squadRows = [], isLoading: squadLoading } = useQuery({
    queryKey: proKeys.teamSquad(effectiveTeam),
    enabled: !!effectiveTeam,
    queryFn: async () => {
      const r = await fetch(`/api/pro/team/${effectiveTeam}/squad`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ playerId, status }: { playerId: string; status: AvailabilityStatus }) => {
      await apiRequest("PATCH", `/api/pro/team/${effectiveTeam}/player/${playerId}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proKeys.teamSquad(effectiveTeam) });
    },
  });

  const members: Member[] = useMemo(() => {
    const fromSquad = mapRosterToMembers(squadRows);
    if (fromSquad.length > 0) return fromSquad;
    const rows = Array.isArray(roleMembers) ? roleMembers : [];
    return rows.map((row: any) => ({
      id: row.member?.id || row.user?.id || Math.random().toString(36),
      name: row.user?.displayName || row.user?.username || "Member",
      position: row.role?.name || "Member",
      status: "active" as const,
      attendance: 80,
      joined: "—",
      role: "player" as const,
    }));
  }, [squadRows, roleMembers]);

  const team = teams.find((t) => t.id === effectiveTeam);

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Team health</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-xs)", color: "var(--pro-text-muted)", fontWeight: 700, marginBottom: 4 }}>
              <span>Roster size</span><span>{members.length}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "var(--pro-surface-3)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, members.length * 4)}%`, height: "100%", background: "var(--pro-active)" }} />
            </div>
          </div>
        </div>
      </Card>
      <PendingRequests />
    </>
  );

  if (teamsLoading && teams.length === 0) {
    return (
      <PageShell title="Teams" subtitle="Loading…">
        <div className="animate-pulse" style={{ height: 120, borderRadius: 12, background: "var(--pro-surface-2)" }} />
      </PageShell>
    );
  }

  if (!teams.length) {
    return (
      <PageShell title="Teams" subtitle="No teams linked to your account yet.">
        <EmptyState icon={<Users size={22} />} title="No teams" description="Create or join a team in SURNA, then return to Pro." />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Teams"
      subtitle={`Switch teams, manage ${sportProfile.displaySport} rosters, availability, and linked schedule.`}
      actions={
        <>
          {can("members.invite") && <Button variant="secondary" leadingIcon={<UserPlus size={14} />} href="/pro/comms">Invite</Button>}
          {can("club.edit")      && <Button variant="primary"   leadingIcon={<Plus size={14} />} href="/teams">New team</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={<><Users size={13} /><span>Manage who&apos;s on this team and how they can participate.</span></>}
        actions={[
          { key: "invite",   label: "Invite member",  icon: <UserPlus size={13} />,    hidden: !can("members.invite"), href: "/pro/comms" },
          { key: "approve",  label: "Review requests",icon: <CheckCheck size={13} />,  hidden: !can("members.approve"), href: "/pro/approvals" },
          { key: "messages", label: "Message team",   icon: <MessageSquare size={13} />, href: "/pro/comms" },
          { key: "schedule", label: "Schedule training", icon: <Calendar size={13} />, href: "/pro/schedule", hidden: !can("training.create") },
        ]}
      />

      <TeamSwitcher teams={teams} activeId={effectiveTeam} onChange={setTeamId} />

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Members" value={team?.members ?? members.length} delta={{ value: "Live data", direction: "flat" }} icon={<Users size={12} />} />
        <StatCard label="Active events" value={team?.events ?? 0} delta={{ value: "—", direction: "flat" }} icon={<Calendar size={12} />} />
        <StatCard label="On roster" value={members.length} delta={{ value: "Pro squad + roles", direction: "flat" }} icon={<CheckCheck size={12} />} />
        <StatCard label="Response time" value="—" delta={{ value: "—", direction: "flat" }} icon={<Clock size={12} />} />
      </div>

      <Tabs<TeamTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "roster",    label: "Roster",    icon: <Users size={13} />,    count: members.length },
          { key: "schedule",  label: "Schedule",  icon: <Calendar size={13} /> },
          { key: "events",    label: "Events",    icon: <Calendar size={13} />, count: team?.events },
          { key: "media",     label: "Media",     icon: <ImageIcon size={13} /> },
          { key: "analytics", label: "Analytics", icon: <BarChart3 size={13} /> },
          { key: "settings",  label: "Settings",  icon: <Settings size={13} /> },
        ]}
      />

      {tab === "roster" && (
        <RosterTable
          members={members}
          loading={squadLoading || membersLoading}
          teamId={effectiveTeam}
          canEdit={can("match.manage") || can("members.approve")}
          onStatusChange={(playerId, status) => statusMutation.mutate({ playerId, status })}
        />
      )}
      {tab === "schedule" && (
        <Card>
          <EmptyState
            icon={<Calendar size={18} />}
            title="Team schedule"
            description={`View ${sportProfile.scheduleLabel} for ${team?.name ?? "this team"}.`}
            action={<Button href="/pro/schedule" variant="primary" leadingIcon={<Calendar size={13} />}>Open events</Button>}
          />
        </Card>
      )}
      {tab === "events" && (
        <Card>
          <EmptyState
            icon={<Calendar size={18} />}
            title={team?.events ? `${team.events} upcoming events` : "No events for this team"}
            description="Events are filtered to your team sport and captain account."
            action={<Button href="/pro/schedule" variant="primary" leadingIcon={<Plus size={13} />}>View schedule</Button>}
          />
        </Card>
      )}
      {tab === "media" && (
        <Card><EmptyState icon={<ImageIcon size={18} />} title="No media uploaded" description="Photos and videos shared with this team will appear here." /></Card>
      )}
      {tab === "analytics" && (
        <Card><EmptyState icon={<BarChart3 size={18} />} title="Analytics coming in next phase" description="Member growth, attendance trends, and engagement charts." /></Card>
      )}
      {tab === "settings" && (
        <Card><EmptyState icon={<Settings size={18} />} title="Team settings" description="Privacy, join rules, captains and admins." /></Card>
      )}
    </PageShell>
  );
}
