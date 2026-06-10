import { useState, useMemo } from "react";
import {
  Activity, CheckCheck, X, UserPlus, Calendar, MessageSquare, Package,
  Settings, ClipboardCheck, Search, Download, Filter, Clock,
} from "lucide-react";
import {
  PageShell, Card, Button, Tag, StatCard, EmptyState, ContextBar, FilterChips,
} from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useActivity, type ActivityEntry, type ActivityKind } from "./components/proWorkflowApi";

type EventKind = ActivityKind;
type LogEntry = ActivityEntry & { ts: string };

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

const _legacySeed: any[] = [
  { id: "l1",  ts: "Just now",   iso: "2026-04-20T18:11", actor: "Lia B.",     actorRole: "Owner",   kind: "approval",       summary: "Approved join request",                  target: "Marco S.",           team: "Senior A",        severity: "info" },
  { id: "l2",  ts: "12m ago",    iso: "2026-04-20T17:59", actor: "James O.",   actorRole: "Manager", kind: "inventory.in",   summary: "Stock in: Home shirt × 6",                                                target: "Storage A",      severity: "info" },
  { id: "l3",  ts: "1h ago",     iso: "2026-04-20T17:11", actor: "Sara M.",    actorRole: "Coach",   kind: "event.create",   summary: "Created session: High-press patterns",   target: "Mon Apr 21 19:00",   team: "Senior A",        severity: "info" },
  { id: "l4",  ts: "3h ago",     iso: "2026-04-20T15:11", actor: "Lia B.",     actorRole: "Owner",   kind: "post.pin",       summary: "Pinned announcement",                    target: "Season kickoff — Aug 18",                       severity: "info" },
  { id: "l5",  ts: "6h ago",     iso: "2026-04-20T12:11", actor: "Marco D.",   actorRole: "Coach",   kind: "training.create",summary: "Added drill: Pressing trigger drill",                                                                  severity: "info" },
  { id: "l6",  ts: "Yesterday",  iso: "2026-04-19T14:30", actor: "System",     actorRole: "System",  kind: "settings.change",summary: "Auto-disabled inactive integration",     target: "Slack",                                       severity: "warn" },
  { id: "l7",  ts: "Yesterday",  iso: "2026-04-19T11:02", actor: "Lia B.",     actorRole: "Owner",   kind: "rejection",      summary: "Declined trial invitation",              target: "Noah K.",            team: "Senior A",        severity: "info" },
  { id: "l8",  ts: "Yesterday",  iso: "2026-04-19T09:45", actor: "James O.",   actorRole: "Manager", kind: "member.add",     summary: "Added staff member",                     target: "Sara M. — Head Physio",                         severity: "info" },
  { id: "l9",  ts: "2d ago",     iso: "2026-04-18T19:30", actor: "Sara M.",    actorRole: "Coach",   kind: "event.cancel",   summary: "Cancelled session: Recovery — Tue 6pm",                                team: "Senior B",        severity: "warn" },
  { id: "l10", ts: "2d ago",     iso: "2026-04-18T15:14", actor: "Ava R.",     actorRole: "Member",  kind: "post.publish",   summary: "Posted training photo",                                                                                severity: "info" },
  { id: "l11", ts: "3d ago",     iso: "2026-04-17T16:00", actor: "Lia B.",     actorRole: "Owner",   kind: "settings.change",summary: "Updated club description",                                                                              severity: "info" },
  { id: "l12", ts: "3d ago",     iso: "2026-04-17T10:08", actor: "James O.",   actorRole: "Manager", kind: "inventory.out",  summary: "Issued GK gloves to Tom W.",                                                                            severity: "info" },
];

function Icon({ k }: { k: EventKind }) {
  const map: Record<EventKind, React.ReactNode> = {
    "approval":         <CheckCheck size={13} />,
    "rejection":        <X size={13} />,
    "member.add":       <UserPlus size={13} />,
    "member.remove":    <UserPlus size={13} />,
    "event.create":     <Calendar size={13} />,
    "event.cancel":     <Calendar size={13} />,
    "post.publish":     <MessageSquare size={13} />,
    "post.pin":         <MessageSquare size={13} />,
    "training.create":  <ClipboardCheck size={13} />,
    "inventory.in":     <Package size={13} />,
    "inventory.out":    <Package size={13} />,
    "settings.change":  <Settings size={13} />,
  };
  return <>{map[k]}</>;
}

type Bucket = "all" | "approval" | "members" | "events" | "comms" | "training" | "inventory" | "settings";

function bucketOf(k: EventKind): Bucket {
  if (k === "approval" || k === "rejection") return "approval";
  if (k.startsWith("member"))    return "members";
  if (k.startsWith("event"))     return "events";
  if (k.startsWith("post"))      return "comms";
  if (k.startsWith("training"))  return "training";
  if (k.startsWith("inventory")) return "inventory";
  return "settings";
}

function dayOf(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function ProActivity() {
  const { can } = useProRole();
  const canView = can("analytics.view"); // gate behind analytics view
  const [bucket, setBucket] = useState<Bucket>("all");
  const [search, setSearch] = useState("");
  const { data } = useActivity();
  const log: LogEntry[] = useMemo(
    () => (data ?? []).map((d) => ({ ...d, ts: relTime(d.iso) })),
    [data]
  );

  const filtered = useMemo(() => {
    return log.filter((l) => {
      if (bucket !== "all" && bucketOf(l.kind) !== bucket) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(l.actor.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q) || (l.target ?? "").toLowerCase().includes(q) || (l.team ?? "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [bucket, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    filtered.forEach((l) => {
      const day = dayOf(l.iso);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const countByBucket = (b: Bucket) => log.filter((l) => bucketOf(l.kind) === b).length;

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Today</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--pro-fs-sm)" }}>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Events</span><span style={{ fontWeight: 800 }}>{log.filter(l => l.iso.startsWith("2026-04-20")).length}</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Approvals</span><span style={{ fontWeight: 800 }}>1</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Warnings</span><span style={{ fontWeight: 800 }}>0</span></div>
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Retention</h3>
        <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", margin: 0 }}>Activity is retained for 365 days. Older entries are archived and exportable from Settings → Security.</p>
      </Card>
    </>
  );

  if (!canView) {
    return (
      <PageShell title="Activity log" subtitle="A timeline of every change made in this workspace.">
        <Card>
          <EmptyState
            icon={<Activity size={18} />}
            title="No access to activity"
            description="The activity log is visible to managers, coaches, admins and owners. Ask an admin to upgrade your role."
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Activity log"
      subtitle="A timeline of every change made in this workspace, by whom and when."
      actions={
        <>
          <Button variant="secondary" leadingIcon={<Filter size={14} />}>Filters</Button>
          <Button variant="primary" leadingIcon={<Download size={14} />} disabled={!can("analytics.export")}>Export</Button>
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={<>Audit who did what and when. Decisions made in Approvals, edits in Settings and stock movements all show up here.</>}
        actions={[
          { key: "approvals", label: "Open approvals", icon: <CheckCheck size={12} />, href: "/pro/approvals" },
          { key: "export",    label: "Export CSV",     icon: <Download size={12} />,   disabled: !can("analytics.export"), hidden: !can("analytics.export") },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Events (7d)"      value={log.length} icon={<Activity size={12} />} />
        <StatCard label="Approvals (7d)"   value={log.filter(l => l.kind === "approval").length} delta={{ value: "+3", direction: "up" }} icon={<CheckCheck size={12} />} />
        <StatCard label="Warnings"         value={log.filter(l => l.severity === "warn").length} icon={<X size={12} />} />
        <StatCard label="Active actors"    value={new Set(log.map(l => l.actor)).size} icon={<UserPlus size={12} />} />
      </div>

      <Card padded={false}>
        <div className="pro-row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border)", gap: 10 }}>
          <div className="pro-topbar__search" style={{ height: 32, maxWidth: 320, flex: 1 }}>
            <Search size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity…" />
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border-soft)" }}>
          <FilterChips<Bucket>
            value={bucket}
            onChange={setBucket}
            options={[
              { key: "all",       label: "All",         count: log.length },
              { key: "approval",  label: "Decisions",   count: countByBucket("approval") },
              { key: "members",   label: "Members",     count: countByBucket("members") },
              { key: "events",    label: "Events",      count: countByBucket("events") },
              { key: "comms",     label: "Comms",       count: countByBucket("comms") },
              { key: "training",  label: "Training",    count: countByBucket("training") },
              { key: "inventory", label: "Inventory",   count: countByBucket("inventory") },
              { key: "settings",  label: "Settings",    count: countByBucket("settings") },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Activity size={18} />} title="No matching activity" description="Try a different filter or search." />
        ) : (
          grouped.map(([day, entries]) => (
            <div key={day}>
              <div style={{
                padding: "10px 18px",
                background: "var(--pro-surface-2)",
                borderTop: "1px solid var(--pro-border)",
                borderBottom: "1px solid var(--pro-border-soft)",
                fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--pro-text-subtle)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Clock size={11} /> {day}
              </div>
              {entries.map((l, i) => (
                <div key={l.id} data-testid={`log-${l.id}`} className="pro-row" style={{
                  gap: 12, padding: "12px 18px",
                  borderTop: i === 0 ? 0 : "1px solid var(--pro-border-soft)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: l.severity === "warn" ? "var(--pro-danger-soft)" : "var(--pro-surface-3)",
                    color: l.severity === "warn" ? "var(--pro-danger)" : "var(--pro-text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon k={l.kind} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{l.actor}</span>
                      <Tag tone="muted">{l.actorRole}</Tag>
                      <span className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)" }}>{l.summary}</span>
                      {l.target && <span style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{l.target}</span>}
                      {l.team && <Tag tone="muted">{l.team}</Tag>}
                    </div>
                  </div>
                  <span className="pro-text-muted" style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{l.ts}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </PageShell>
  );
}
