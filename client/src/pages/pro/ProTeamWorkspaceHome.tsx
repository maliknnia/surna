import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Calendar,
  Swords,
  Dumbbell,
  MessageSquare,
  BarChart3,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Bell,
} from "lucide-react";
import { useProTeam } from "./components/ProTeamContext";
import { useProRole } from "./components/useProRole";
import { proKeys, mapMatchRows, fetchProJson } from "./lib/proQueries";
import { withTeamQuery } from "./lib/proWorkspaceNav";
import ProWorkspaceLauncher from "./ProWorkspaceLauncher";

type ToolTile = {
  key: string;
  label: string;
  desc: string;
  path: string;
  icon: typeof Users;
};

export default function ProTeamWorkspaceHome() {
  const { teamId, activeTeam, teams, teamsLoading, sportProfile } = useProTeam();
  const { can } = useProRole();

  const { data: statsData } = useQuery<{
    members: number;
    events: number;
    pending: number;
    messages: number;
  }>({
    queryKey: proKeys.teamStats(teamId ?? ""),
    enabled: !!teamId,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/stats`, signal),
  });

  const { data: dashData } = useQuery<{
    items: Array<{ id: string; title: string; sub: string; cta: string; href: string; tone: string }>;
  }>({
    queryKey: proKeys.teamDashboard(teamId ?? ""),
    enabled: !!teamId,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/dashboard`, signal),
  });

  const { data: upcomingEvents = [] } = useQuery<
    Array<{ id: string; title: string; date: string; time: string; venue: string }>
  >({
    queryKey: proKeys.teamMatches(teamId ?? ""),
    enabled: !!teamId,
    queryFn: async ({ signal }) => {
      const rows = await fetchProJson<unknown[]>(`/api/pro/team/${teamId}/matches`, signal);
      return mapMatchRows(rows).slice(0, 3).map((m) => ({
        id: m.id,
        title: m.opponent ? `vs ${m.opponent}` : "Fixture",
        date: m.date,
        time: m.time,
        venue: m.venue,
      }));
    },
  });

  const tools: ToolTile[] = useMemo(() => {
    const matchLabel = sportProfile.supportsTacticalBoard ? "Match Day" : "Game Day";
    const list: ToolTile[] = [
      { key: "squad", label: "Squad", desc: "Roster, roles & invites", path: "/pro/roster", icon: Users },
      { key: "events", label: "Events", desc: "Fixtures & training", path: "/pro/schedule", icon: Calendar },
      { key: "match", label: matchLabel, desc: "Lineups & match prep", path: "/pro/match-day", icon: Swords },
      { key: "training", label: "Training", desc: sportProfile.displaySport + " drills", path: "/pro/training", icon: Dumbbell },
      { key: "messages", label: "Messages", desc: "Team announcements", path: "/pro/comms", icon: MessageSquare },
      { key: "stats", label: "Analytics", desc: "Performance & attendance", path: "/pro/stats", icon: BarChart3 },
    ];
    if (can("members.approve")) {
      list.splice(1, 0, {
        key: "approvals",
        label: "Approvals",
        desc: "Join requests waiting",
        path: "/pro/approvals",
        icon: UserPlus,
      });
    }
    return list.slice(0, 6);
  }, [sportProfile.displaySport, sportProfile.supportsTacticalBoard, can]);

  const attention = (dashData?.items ?? []).slice(0, 3);
  const loading = teamsLoading || !teamId;

  if (!teamsLoading && teams.length === 0) {
    return <ProWorkspaceLauncher focus="team" />;
  }

  return (
    <div data-testid="pro-workspace-home">
      <section className="pro-workspace-home__hero">
        <p style={{ margin: 0, fontSize: 13, color: "var(--pro-text-muted)", lineHeight: 1.5 }}>
          {activeTeam?.sport ?? "Your sport"} · {activeTeam?.location ?? "Ireland"}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 600, color: "var(--pro-text)", lineHeight: 1.45 }}>
          Everything for <span style={{ color: "var(--pro-gold)" }}>{activeTeam?.name ?? "your team"}</span> in one calm workspace.
        </p>
        {!loading && statsData ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {[
              { label: "Squad", value: statsData.members },
              { label: "Events", value: statsData.events },
              { label: "Requests", value: statsData.pending },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "var(--pro-surface-2)",
                  border: "0.5px solid var(--pro-border)",
                  color: "var(--pro-text-secondary, var(--pro-text-muted))",
                }}
              >
                {chip.label} · {chip.value}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
        Tools
      </h2>
      <div className="pro-workspace-home__tools">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const href = withTeamQuery(tool.path, teamId);
          return (
            <Link key={tool.key} href={href}>
              <span className="pro-workspace-tool" data-testid={`pro-tool-${tool.key}`}>
                <span className="pro-workspace-tool__icon"><Icon size={18} /></span>
                <span className="pro-workspace-tool__label">{tool.label}</span>
                <span className="pro-workspace-tool__desc">{tool.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {attention.length > 0 ? (
        <>
          <h2 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
            Needs attention
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {attention.map((item) => (
              <Link key={item.id} href={withTeamQuery(item.href, teamId)}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "var(--pro-bg-elevated)",
                    border: "0.5px solid var(--pro-border)",
                  }}
                  data-testid={`pro-attention-${item.id}`}
                >
                  <Bell size={16} style={{ color: "var(--pro-gold)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--pro-text)" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "var(--pro-text-muted)", marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <ArrowRight size={14} style={{ color: "var(--pro-text-subtle)", flexShrink: 0 }} />
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : !loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderRadius: 14,
            background: "var(--pro-bg-elevated)",
            border: "0.5px solid var(--pro-border)",
            marginBottom: 20,
            fontSize: 13,
            color: "var(--pro-text-muted)",
          }}
        >
          <CheckCircle2 size={16} style={{ color: "var(--pro-success)" }} />
          All caught up — your workspace is ready.
        </div>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--pro-text-subtle)" }}>
              Coming up
            </h2>
            <Link href={withTeamQuery("/pro/schedule", teamId)} style={{ fontSize: 12, fontWeight: 600, color: "var(--pro-gold)", textDecoration: "none" }}>
              View all
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.map((ev) => (
              <Link key={ev.id} href={`/events/${ev.id}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 14,
                    background: "var(--pro-bg-elevated)",
                    border: "0.5px solid var(--pro-border)",
                  }}
                >
                  <Calendar size={16} style={{ color: "var(--pro-text-muted)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: "var(--pro-text-muted)" }}>{ev.date} · {ev.venue}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pro-text-subtle)" }}>{ev.time}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
