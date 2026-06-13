import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Calendar, MessageSquare, Eye, TrendingUp, UserPlus,
  CheckCircle2, Plus, ArrowRight, Megaphone, BarChart3,
  AlertTriangle, AlertCircle, Sparkles, Lightbulb,
  ClipboardCheck, Bell,
} from "lucide-react";
import { Link } from "wouter";
import { PageShell, Card, StatCard, Button, SectionHeader, Tag, EmptyState, ContextBar } from "./components/primitives";
import { useProRole, ROLE_LABELS } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";
import TransferActivityPanel from "./components/TransferActivityPanel";
import ProSportHero from "./components/ProSportHero";
import ProSportShortcuts from "./components/ProSportShortcuts";
import { proKeys, mapMatchRows, fetchProJson } from "./lib/proQueries";

type AttentionTone = "urgent" | "warn" | "info";
type AttentionItem = {
  id: string;
  tone: AttentionTone;
  iconKey?: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  cta: string;
  href: string;
  count?: number;
};

const ATTENTION_BY_ROLE: Record<string, string[]> = {
  owner:   ["approvals","activity","roster","low-attendance","priority-msgs","filling-fast","growth","billing","recruitment"],
  admin:   ["approvals","activity","roster","low-attendance","priority-msgs","filling-fast","growth","billing","recruitment"],
  coach:   ["activity","roster","low-attendance","priority-msgs","filling-fast","recruitment"],
  manager: ["approvals","activity","roster","low-attendance","priority-msgs","billing"],
  member:  ["activity","roster"],
};

function iconForKey(key?: string) {
  switch (key) {
    case "userPlus": return <UserPlus size={16} />;
    case "bell": return <Bell size={16} />;
    case "users": return <Users size={16} />;
    case "message": return <MessageSquare size={16} />;
    case "sparkles": return <Sparkles size={16} />;
    case "trend": return <TrendingUp size={16} />;
    case "alert": return <AlertCircle size={16} />;
    case "clipboard": return <ClipboardCheck size={16} />;
    case "warn": return <AlertTriangle size={16} />;
    default: return <Bell size={16} />;
  }
}

function StatusTag({ status }: { status: "published" | "filling" | "draft" }) {
  if (status === "filling") return <Tag tone="active">Filling fast</Tag>;
  if (status === "draft")   return <Tag tone="muted">Draft</Tag>;
  return <Tag tone="success">Published</Tag>;
}

/* ----------------------------------------------------------------- */

export default function ProDashboard() {
  const { user } = useAuth();
  const { role, can } = useProRole();
  const { teamId, teamsLoading, activeTeam, sportProfile } = useProTeam();
  const greeting = user?.displayName || user?.firstName || user?.username || "there";

  const { data: dashData, isLoading: dashLoading } = useQuery<{ items: Array<{ id: string; tone: AttentionTone; iconKey?: string; title: string; sub: string; cta: string; href: string; count?: number }> }>({
    queryKey: proKeys.teamDashboard(teamId ?? ""),
    enabled: !!teamId,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/dashboard`, signal),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{
    members: number;
    events: number;
    pending: number;
    messages: number;
    visits: string;
    engage: string;
  }>({
    queryKey: proKeys.teamStats(teamId ?? ""),
    enabled: !!teamId,
    queryFn: ({ signal }) => fetchProJson(`/api/pro/team/${teamId}/stats`, signal),
  });

  const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<
    Array<{ id: string; title: string; date: string; time: string; venue: string; status?: string }>
  >({
    queryKey: proKeys.teamMatches(teamId ?? ""),
    enabled: !!teamId,
    queryFn: async ({ signal }) => {
      const rows = await fetchProJson<unknown[]>(`/api/pro/team/${teamId}/matches`, signal);
      return mapMatchRows(rows).slice(0, 6).map((m) => ({
        id: m.id,
        title: m.opponent ? `vs ${m.opponent}` : "Fixture",
        date: m.date,
        time: m.time,
        venue: m.venue,
        status: "published" as const,
      }));
    },
  });

  const attention: AttentionItem[] = useMemo(() => {
    const raw = dashData?.items ?? [];
    const visibleIds = new Set(ATTENTION_BY_ROLE[role] ?? []);
    return raw
      .filter((a) => visibleIds.has(a.id))
      .map((a) => ({
        ...a,
        icon: iconForKey(a.iconKey),
      }));
  }, [dashData, role]);

  const urgentCount = attention.filter((a) => a.tone === "urgent").length;

  const allStats = [
    { key: "members",  label: "Members",          value: String(statsData?.members ?? "—"), delta: { value: "Live roster", direction: "flat" as const }, icon: <Users size={12} /> },
    { key: "events",   label: "Upcoming events",  value: String(statsData?.events ?? "—"), delta: { value: "From your calendar", direction: "flat" as const }, icon: <Calendar size={12} /> },
    { key: "pending",  label: "Pending requests", value: String(statsData?.pending ?? "—"), delta: { value: "Join requests", direction: "flat" as const }, icon: <UserPlus size={12} /> },
    { key: "messages", label: "Unread messages",  value: String(statsData?.messages ?? "—"), delta: { value: "Messenger", direction: "flat" as const }, icon: <MessageSquare size={12} /> },
    { key: "visits",   label: "Profile visits (7d)", value: String(statsData?.visits ?? "—"), delta: { value: "—", direction: "flat" as const }, icon: <Eye size={12} /> },
    { key: "engage",   label: "Engagement",       value: String(statsData?.engage ?? "—"), delta: { value: "—", direction: "flat" as const }, icon: <TrendingUp size={12} /> },
  ];
  const statKeysByRole: Record<string, string[]> = {
    owner:   ["members","events","pending","messages","visits","engage"],
    admin:   ["members","events","pending","messages","visits","engage"],
    coach:   ["events","messages","engage"],
    manager: ["members","events","pending","messages"],
    member:  ["events","messages"],
  };
  const statSet = new Set(statKeysByRole[role] ?? []);
  const summaryStats = allStats.filter((s) => statSet.has(s.key));

  /* Quick actions in right panel — role-gated */
  const quickActions = [
    { label: "Create event",    to: "/pro/schedule",    icon: <Calendar size={15} />,       allowed: can("events.create") },
    { label: "Post update",     to: "/pro/comms",       icon: <Megaphone size={15} />,      allowed: can("messages.announce") },
    { label: "Invite members",  to: "/pro/recruitment", icon: <UserPlus size={15} />,       allowed: can("members.invite") },
    { label: "Review requests", to: "/pro/approvals",      icon: <CheckCircle2 size={15} />,   allowed: can("members.approve") },
    { label: "Open analytics",  to: "/pro/stats",       icon: <BarChart3 size={15} />,      allowed: can("analytics.view") },
  ].filter((q) => q.allowed);

  /* Sport-aware coaching tips */
  const sportInsights = useMemo(() => {
    const tips: { tone: "warn" | "info"; text: string }[] = [];
    if (sportProfile.playersOnField > 0) {
      tips.push({
        tone: "info",
        text: `${sportProfile.displaySport}: ${sportProfile.playersOnField} on field · ${sportProfile.matchDuration} · ${sportProfile.governingBody} rules loaded in Match Day.`,
      });
    }
    if (sportProfile.defaultDrills.length > 0) {
      tips.push({
        tone: "info",
        text: `${sportProfile.defaultDrills.length} ${sportProfile.displaySport} drills ready in Training — ${sportProfile.drillCategories.slice(0, 3).join(", ")}.`,
      });
    }
    if (statsData?.pending && statsData.pending > 0) {
      tips.push({
        tone: "warn",
        text: `${statsData.pending} join request${statsData.pending === 1 ? "" : "s"} waiting on Roster.`,
      });
    }
    return tips;
  }, [sportProfile, statsData?.pending]);

  const insights = sportInsights.filter((_, i) => {
    if (role === "member") return i === 0;
    return true;
  }).slice(0, 4);

  const RightPanel = (
    <>
      {quickActions.length > 0 && (
        <Card>
          <SectionHeader title="Quick actions" subtitle={`Available to ${ROLE_LABELS[role]}`} />
          <div className="pro-col" style={{ gap: 6 }}>
            {quickActions.map((q) => (
              <Link key={q.to} href={q.to}>
                <div className="pro-row" style={{ gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "background 120ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--pro-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  data-testid={`quick-${q.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <span style={{ color: "var(--pro-text-muted)" }}>{q.icon}</span>
                  <span style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 600, color: "var(--pro-text)" }}>{q.label}</span>
                  <ArrowRight size={13} style={{ marginLeft: "auto", color: "var(--pro-text-subtle)" }} />
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <SectionHeader title="Coaching tips" subtitle={`For ${sportProfile.displaySport}${activeTeam ? ` · ${activeTeam.name}` : ""}`} />
        {insights.length === 0 ? (
          <EmptyState icon={<Lightbulb size={18} />} title="Nothing to surface yet" description="Insights appear as your club generates activity." />
        ) : (
          <div className="pro-col" style={{ gap: 10 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: "var(--pro-fs-sm)", color: "var(--pro-text)" }}>
                <span style={{
                  marginTop: 6, width: 6, height: 6, borderRadius: 99, flexShrink: 0,
                  background: ins.tone === "warn" ? "var(--pro-text)" : "var(--pro-text-subtle)",
                }} />
                <span style={{ lineHeight: 1.5 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );

  const showSkeleton = teamsLoading || !teamId || dashLoading || statsLoading;

  return (
    <PageShell
      title={`Welcome back, ${greeting}`}
      subtitle={
        urgentCount > 0
          ? `You have ${urgentCount} urgent ${urgentCount === 1 ? "item" : "items"} that need your attention.`
          : "Everything looks calm. Here's the rundown."
      }
      actions={
        <>
          {can("events.create") && (
            <Button href="/pro/schedule" variant="secondary" leadingIcon={<Calendar size={14} />}>New event</Button>
          )}
          {can("messages.announce") && (
            <Button href="/pro/comms" variant="primary" leadingIcon={<Plus size={14} />}>Post update</Button>
          )}
        </>
      }
      rightPanel={RightPanel}
    >
      {activeTeam && (
        <>
          <ProSportHero profile={sportProfile} teamName={activeTeam.name} compact />
          <ProSportShortcuts profile={sportProfile} />
        </>
      )}

      {/* Context bar — what this page is for + role-aware shortcuts */}
      <ContextBar
        context={
          <>
            <Bell size={13} />
            <span>Acting as <strong style={{ color: "var(--pro-text)" }}>{ROLE_LABELS[role]}</strong> — showing only what's relevant to you.</span>
          </>
        }
        actions={[
          { key: "approve", label: "Approvals",  icon: <CheckCircle2 size={13} />, href: "/pro/approvals",      hidden: !can("members.approve") },
          { key: "events",  label: "Events",     icon: <Calendar size={13} />,     href: "/pro/schedule" },
          { key: "inbox",   label: "Inbox",      icon: <MessageSquare size={13} />,href: "/pro/comms" },
          { key: "stats",   label: "Analytics",  icon: <BarChart3 size={13} />,    href: "/pro/stats",       hidden: !can("analytics.view") },
        ]}
      />

      {/* Attention center — the brain */}
      <Card padded={false}>
        <div style={{ padding: "16px 18px 8px" }}>
          <SectionHeader
            title="Needs your attention"
            subtitle={
              showSkeleton
                ? "Loading…"
                : attention.length === 0
                ? "All caught up"
                : `${attention.length} item${attention.length === 1 ? "" : "s"} · ${urgentCount} urgent`
            }
            actions={
              !showSkeleton && attention.length > 0 ? (
                <Tag tone={urgentCount > 0 ? "active" : "muted"}>
                  {urgentCount > 0 ? `${urgentCount} urgent` : "Routine"}
                </Tag>
              ) : null
            }
          />
        </div>
        {showSkeleton ? (
          <div className="pro-col" style={{ padding: "0 18px 22px", gap: 10 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse" style={{ height: 56, borderRadius: 10, background: "var(--pro-surface-2)" }} />
            ))}
          </div>
        ) : attention.length === 0 ? (
          <div style={{ padding: "0 18px 22px" }}>
            <EmptyState
              icon={<CheckCircle2 size={18} />}
              title="Nothing needs your attention"
              description="You'll see urgent items, low-attendance warnings, priority chats and growth signals here."
            />
          </div>
        ) : (
          <div className="pro-attention">
            {attention.map((a) => (
              <Link key={a.id} href={a.href}>
                <div className={`pro-attention__row ${a.tone === "urgent" ? "pro-attention__row--urgent" : ""}`}
                  data-testid={`attention-${a.id}`}
                >
                  <span className="pro-attention__icon">{a.icon}</span>
                  <div className="pro-attention__main">
                    <div className="pro-attention__title">
                      <span>{a.title}</span>
                      {a.count !== undefined && <Tag tone={a.tone === "urgent" ? "active" : "muted"}>{a.count}</Tag>}
                    </div>
                    <div className="pro-attention__sub">{a.sub}</div>
                  </div>
                  <Button size="sm" variant={a.tone === "urgent" ? "primary" : "ghost"} trailingIcon={<ArrowRight size={12} />}>
                    {a.cta}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Summary row */}
      {showSkeleton ? (
        <div className="pro-grid pro-grid-3" style={{ gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: 88, borderRadius: 12, background: "var(--pro-surface-2)" }} />
          ))}
        </div>
      ) : summaryStats.length > 0 ? (
        <div className="pro-grid pro-grid-3" style={{ gap: 12 }}>
          {summaryStats.map((s) => (
            <StatCard key={s.key} label={s.label} value={s.value} delta={s.delta} icon={s.icon} />
          ))}
        </div>
      ) : null}

      <TransferActivityPanel teamId={teamId} />

      {/* Upcoming events */}
      <Card padded={false}>
        <div style={{ padding: "16px 18px 8px" }}>
          <SectionHeader
            title="Upcoming events"
            actions={<Button href="/pro/schedule" variant="ghost" size="sm" trailingIcon={<ArrowRight size={13} />}>View all</Button>}
          />
        </div>
        <div>
          {eventsLoading || showSkeleton ? (
            <div className="pro-col" style={{ padding: 18, gap: 10 }}>
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 64, borderRadius: 10, background: "var(--pro-surface-2)" }} />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div style={{ padding: "0 18px 22px" }}>
              <EmptyState icon={<Calendar size={18} />} title="No upcoming matches" description="Schedule events for this team to see them here." />
            </div>
          ) : upcomingEvents.map((e, idx) => (
            <Link key={e.id} href={`/events/${e.id}`}>
              <div
                className="pro-row"
                style={{
                  padding: "14px 18px",
                  gap: 12,
                  borderTop: idx === 0 ? "1px solid var(--pro-border)" : "1px solid var(--pro-border-soft)",
                  cursor: "pointer",
                  transition: "background 120ms",
                }}
                onMouseEnter={(e2) => (e2.currentTarget.style.background = "var(--pro-hover)")}
                onMouseLeave={(e2) => (e2.currentTarget.style.background = "transparent")}
                data-testid={`event-row-${e.id}`}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "var(--pro-surface-2)", border: "1px solid var(--pro-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--pro-text)", flexShrink: 0,
                }}>
                  <Calendar size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-body)", color: "var(--pro-text)" }}>{e.title}</div>
                  <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>
                    {e.date} · {e.venue}
                  </div>
                </div>
                <div style={{ fontSize: "var(--pro-fs-xs)", color: "var(--pro-text-muted)", fontWeight: 600 }}>
                  {e.time}
                </div>
                <StatusTag status={(e.status as "published" | "filling" | "draft") || "published"} />
                <ArrowRight size={14} style={{ color: "var(--pro-text-subtle)" }} />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
