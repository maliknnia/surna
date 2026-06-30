import { useState, useMemo } from "react";
import {
  CheckCheck, X, ShieldAlert, UserPlus, MessageSquare, Calendar,
  ClipboardCheck, Star, Clock, Filter, ArrowRight, Loader2,
} from "lucide-react";
import {
  PageShell, Card, Button, Tag, StatCard, EmptyState, ContextBar, FilterChips,
} from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import ProPlaceApprovalsModule from "./modules/ProPlaceApprovalsModule";
import {
  useApprovals, useDecideApproval, type Approval,
} from "./components/proWorkflowApi";

type Kind = Approval["kind"];

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function KindBadge({ k }: { k: Kind }) {
  const map: Record<Kind, { label: string; icon: React.ReactNode }> = {
    member:  { label: "Member",       icon: <UserPlus size={11} /> },
    post:    { label: "Post",         icon: <MessageSquare size={11} /> },
    event:   { label: "Event change", icon: <Calendar size={11} /> },
    trial:   { label: "Trial",        icon: <ClipboardCheck size={11} /> },
    expense: { label: "Expense",      icon: <Star size={11} /> },
  };
  const m = map[k];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700,
      padding: "3px 8px", borderRadius: 99,
      background: "var(--pro-surface-3)",
      color: "var(--pro-text)",
    }}>{m.icon}{m.label}</span>
  );
}

function PriorityDot({ p }: { p: Approval["priority"] }) {
  const color = p === "high" ? "var(--pro-danger)" : p === "normal" ? "var(--pro-text)" : "var(--pro-text-subtle)";
  return <span aria-label={`${p} priority`} title={`${p} priority`} style={{ width: 8, height: 8, borderRadius: 99, background: color, display: "inline-block" }} />;
}

export default function ProApprovals() {
  const { isPlaceMode, isShopMode } = useProWorkspaceContext();
  if (isPlaceMode) return <ProPlaceApprovalsModule />;
  if (isShopMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Squad approvals"
        description="Join requests and squad approvals live in Team Pro. Fulfill shop orders from Orders."
      />
    );
  }
  return <ProTeamApprovals />;
}

function ProTeamApprovals() {
  const { teamId: rawTeamId } = useProTeam();
  const teamId = rawTeamId ?? undefined;
  const { data, isLoading } = useApprovals(teamId);
  const items: Approval[] = data ?? [];
  const { can, role } = useProRole();
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [showOnlyMine, setShowOnlyMine] = useState(true);
  const decideMut = useDecideApproval(teamId);

  const visible = useMemo(() => {
    return items.filter((i) => {
      if (i.status !== "pending") return false;
      if (filter !== "all" && i.kind !== filter) return false;
      if (showOnlyMine && !can(i.needs)) return false;
      return true;
    });
  }, [items, filter, showOnlyMine, can]);

  const countByKind = (k: Kind) => items.filter((i) => i.status === "pending" && i.kind === k && (!showOnlyMine || can(i.needs))).length;
  const totalPending = items.filter((i) => i.status === "pending").length;
  const yoursPending = items.filter((i) => i.status === "pending" && can(i.needs)).length;

  function decide(id: string, status: "approved" | "rejected") {
    decideMut.mutate({ id, status });
  }

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>How approvals work</h3>
        <ol className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", paddingLeft: 16, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Items only show up if your role can act on them.</li>
          <li>Approving instantly applies the change across the platform.</li>
          <li>Every decision is logged in the activity log.</li>
        </ol>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>SLA</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--pro-fs-sm)" }}>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Avg time to decide</span><span style={{ fontWeight: 800 }}>3h 24m</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Older than 24h</span><span style={{ fontWeight: 800, color: "var(--pro-danger)" }}>2</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Approved this week</span><span style={{ fontWeight: 800 }}>14</span></div>
        </div>
      </Card>
    </>
  );

  return (
    <PageShell
      title="Approvals"
      subtitle="The single queue for everything that needs a decision."
      actions={
        <Button variant="secondary" leadingIcon={<Filter size={14} />}>Filters</Button>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={yoursPending > 0
          ? <>You have <strong>{yoursPending}</strong> {yoursPending === 1 ? "item" : "items"} waiting for you. Decisions apply immediately and are logged.</>
          : <>No pending items need your attention right now. Nice work.</>}
        actions={[
          { key: "mine",       label: showOnlyMine ? "Show all roles" : "Only mine",  icon: <ShieldAlert size={12} />, onClick: () => setShowOnlyMine((v) => !v) },
          { key: "activity",   label: "Open activity log", icon: <Clock size={12} />, href: "/pro/activity" },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Pending total"    value={totalPending} icon={<ClipboardCheck size={12} />} />
        <StatCard label="For your role"    value={yoursPending} delta={yoursPending > 0 ? { value: "Action needed", direction: "down" } : undefined} icon={<ShieldAlert size={12} />} />
        <StatCard label="Approved (week)"  value={14} delta={{ value: "+3", direction: "up" }} icon={<CheckCheck size={12} />} />
        <StatCard label="Rejected (week)"  value={2}  icon={<X size={12} />} />
      </div>

      <FilterChips<"all" | Kind>
        value={filter}
        onChange={setFilter}
        options={[
          { key: "all",     label: "All",          count: visible.length },
          { key: "member",  label: "Members",      count: countByKind("member") },
          { key: "post",    label: "Posts",        count: countByKind("post") },
          { key: "event",   label: "Event changes",count: countByKind("event") },
          { key: "trial",   label: "Trials",       count: countByKind("trial") },
          { key: "expense", label: "Expenses",     count: countByKind("expense") },
        ]}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCheck size={18} />}
            title="Inbox zero"
            description={showOnlyMine ? `Nothing waiting for ${role}.` : "All items have been handled."}
          />
        </Card>
      ) : (
        <Card padded={false}>
          {visible.map((i, idx) => {
            const allowed = can(i.needs);
            return (
              <div key={i.id} data-testid={`approval-${i.id}`} className="pro-row" style={{
                gap: 12, padding: "14px 18px",
                borderTop: idx === 0 ? 0 : "1px solid var(--pro-border-soft)",
              }}>
                <PriorityDot p={i.priority} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pro-row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <KindBadge k={i.kind} />
                    <span style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{i.title}</span>
                    {i.team && <Tag tone="muted">{i.team}</Tag>}
                  </div>
                  <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 4 }}>
                    {i.detail} · requested by {i.requestedBy} · {relTime(i.requestedAt)}
                  </div>
                </div>
                <div className="pro-row" style={{ gap: 6 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<X size={12} />}
                    disabled={!allowed}
                    onClick={() => decide(i.id, "rejected")}
                    data-testid={`reject-${i.id}`}
                  >Decline</Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leadingIcon={<CheckCheck size={12} />}
                    disabled={!allowed}
                    onClick={() => decide(i.id, "approved")}
                    data-testid={`approve-${i.id}`}
                  >Approve</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    href="/pro/activity"
                    leadingIcon={<ArrowRight size={12} />}
                    aria-label="View activity"
                  />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </PageShell>
  );
}
