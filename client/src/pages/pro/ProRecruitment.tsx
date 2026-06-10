import { useState, useMemo } from "react";
import {
  ClipboardCheck, Star, Plus, Search, Filter, Calendar, MapPin, Users,
  CheckCheck, X, MoreHorizontal, ArrowRight, Megaphone, Euro, Eye,
} from "lucide-react";
import { PlayerMarketTab, ScoutViewTab, ScoutWatchlistTab } from "./components/RecruitmentPhase3";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar, FilterChips } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useAppendActivity } from "./components/proWorkflowApi";

type RTab = "trials" | "shortlist" | "applicants" | "market" | "scout" | "watchlist";
type TrialStatus = "scheduled" | "open" | "filling" | "closed";
type AppStatus = "new" | "shortlisted" | "trial-invited" | "rejected" | "signed";

type Trial = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  spots: number;
  filled: number;
  status: TrialStatus;
};

type Applicant = {
  id: string;
  name: string;
  age: number;
  position: string;
  rating: number;
  status: AppStatus;
  appliedFor: string;
};

const trials: Trial[] = [
  { id: "t1", title: "Open Trials — Senior Squad",   date: "Tue, Apr 28", time: "18:30", venue: "Riverside Arena",  spots: 40, filled: 38, status: "filling" },
  { id: "t2", title: "Goalkeeper trial",              date: "Sat, May 02", time: "10:00", venue: "Central Pitch 3",  spots: 8,  filled: 6,  status: "open" },
  { id: "t3", title: "Youth U16 — intake",            date: "Sun, May 10", time: "11:00", venue: "Riverside Arena",  spots: 24, filled: 12, status: "open" },
  { id: "t4", title: "Women's First — pre-season",   date: "Sat, May 16", time: "09:30", venue: "Central Pitch 1",  spots: 30, filled: 30, status: "closed" },
];

const applicants: Applicant[] = [
  { id: "a1", name: "Marco S.", age: 24, position: "Defender",   rating: 4.6, status: "shortlisted",   appliedFor: "Senior A" },
  { id: "a2", name: "Tom W.",   age: 22, position: "Goalkeeper", rating: 4.8, status: "trial-invited", appliedFor: "Senior A" },
  { id: "a3", name: "Eli J.",   age: 19, position: "Midfielder", rating: 4.4, status: "new",           appliedFor: "Senior B" },
  { id: "a4", name: "Ava R.",   age: 21, position: "Forward",    rating: 4.9, status: "signed",        appliedFor: "Women's First" },
  { id: "a5", name: "Noah K.",  age: 27, position: "Forward",    rating: 4.2, status: "rejected",      appliedFor: "Senior A" },
  { id: "a6", name: "Sara B.",  age: 18, position: "Defender",   rating: 4.5, status: "new",           appliedFor: "Youth U18" },
];

const shortlist = applicants.filter((a) => a.status === "shortlisted" || a.status === "trial-invited");

function TStatus({ s }: { s: TrialStatus }) {
  if (s === "open")     return <Tag tone="success">Open</Tag>;
  if (s === "filling")  return <Tag tone="active">Filling</Tag>;
  if (s === "closed")   return <Tag tone="muted">Closed</Tag>;
  return <Tag tone="muted">Scheduled</Tag>;
}
function AStatus({ s }: { s: AppStatus }) {
  if (s === "new")            return <Tag tone="active">New</Tag>;
  if (s === "shortlisted")    return <Tag tone="active">Shortlisted</Tag>;
  if (s === "trial-invited")  return <Tag tone="active">Trial invited</Tag>;
  if (s === "signed")         return <Tag tone="success">Signed</Tag>;
  return <Tag tone="danger">Rejected</Tag>;
}

export default function ProRecruitment() {
  const [tab, setTab] = useState<RTab>("trials");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppStatus>("all");
  const { can } = useProRole();
  const logActivity = useAppendActivity();
  const canPost = can("recruitment.post");
  const canReview = can("recruitment.review");

  const filteredApps = useMemo(() => {
    let list = applicants;
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.position.toLowerCase().includes(q) || a.appliedFor.toLowerCase().includes(q));
    }
    return list;
  }, [search, statusFilter]);

  const countBy = (s: AppStatus) => applicants.filter((a) => a.status === s).length;

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Pipeline</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "New",            v: applicants.filter((a) => a.status === "new").length },
            { label: "Shortlisted",    v: applicants.filter((a) => a.status === "shortlisted").length },
            { label: "Trial invited",  v: applicants.filter((a) => a.status === "trial-invited").length },
            { label: "Signed",         v: applicants.filter((a) => a.status === "signed").length },
            { label: "Rejected",       v: applicants.filter((a) => a.status === "rejected").length },
          ].map((s) => (
            <div key={s.label}>
              <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-xs)", color: "var(--pro-text-muted)", fontWeight: 700, marginBottom: 4 }}>
                <span>{s.label}</span><span>{s.v}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--pro-surface-3)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (s.v / applicants.length) * 100)}%`, height: "100%", background: "var(--pro-active)" }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Quick actions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Button variant="secondary" size="sm" fullWidth leadingIcon={<Plus size={13} />}>New trial</Button>
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<Megaphone size={13} />}>Promote on map</Button>
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<Users size={13} />}>Invite scouts</Button>
        </div>
      </Card>
    </>
  );

  return (
    <PageShell
      title="Recruitment"
      subtitle="Run trials, shortlist talent, manage applicants from one workspace."
      actions={
        <>
          <Button variant="secondary" leadingIcon={<Filter size={14} />}>Filters</Button>
          {canPost && <Button variant="primary" leadingIcon={<Plus size={14} />}>New trial</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={canPost
          ? <>Post trials, shortlist talent and move applicants through your pipeline. Promote on the map to attract more candidates.</>
          : canReview
            ? <>Review applicants and recommend who advances. Posting new trials is restricted.</>
            : <>Recruitment overview. Coaches and admins post trials and review applicants.</>}
        actions={[
          { key: "new-trial",      label: "New trial",      icon: <Plus size={12} />,      variant: "primary", disabled: !canPost,   hidden: !canPost,   onClick: () => logActivity.mutate({ kind: "event.create", summary: "Posted a new trial" }) },
          { key: "promote",        label: "Promote on map", icon: <Megaphone size={12} />, disabled: !canPost,   hidden: !canPost,   onClick: () => logActivity.mutate({ kind: "post.publish", summary: "Promoted recruitment on the map" }) },
          { key: "shortlist",      label: "Open shortlist", icon: <Star size={12} />,      onClick: () => setTab("shortlist") },
          { key: "applicants",     label: "Review applicants", icon: <Users size={12} />,  onClick: () => setTab("applicants"), disabled: !canReview },
        ]}
      />
      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Open trials" value={trials.filter(t => t.status !== "closed").length} icon={<ClipboardCheck size={12} />} />
        <StatCard label="Applicants"  value={applicants.length} delta={{ value: "+4 this week", direction: "up" }} icon={<Users size={12} />} />
        <StatCard label="Shortlisted" value={shortlist.length}  icon={<Star size={12} />} />
        <StatCard label="Signed (90d)" value={applicants.filter(a => a.status === "signed").length} delta={{ value: "+1", direction: "up" }} icon={<CheckCheck size={12} />} />
      </div>

      <Tabs<RTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "trials",     label: "Trials",     icon: <ClipboardCheck size={13} />, count: trials.length },
          { key: "shortlist",  label: "Shortlist",  icon: <Star size={13} />,           count: shortlist.length },
          { key: "applicants", label: "Applicants", icon: <Users size={13} />,          count: applicants.length },
          { key: "market",     label: "Player market", icon: <Euro size={13} /> },
          { key: "scout",      label: "Scout view", icon: <Eye size={13} /> },
          { key: "watchlist",  label: "Watchlist",  icon: <Eye size={13} /> },
        ]}
      />

      {tab === "trials" && (
        trials.length === 0 ? (
          <Card><EmptyState icon={<ClipboardCheck size={18} />} title="No trials scheduled" description="Create your first trial event." action={<Button variant="primary" leadingIcon={<Plus size={13} />}>New trial</Button>} /></Card>
        ) : (
          <div className="pro-grid pro-grid-2" style={{ gap: 12 }}>
            {trials.map((t) => (
              <Card key={t.id}>
                <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{t.title}</h3>
                  <TStatus s={t.status} />
                </div>
                <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  <span className="pro-row" style={{ gap: 6 }}><Calendar size={12} /> {t.date} · {t.time}</span>
                  <span className="pro-row" style={{ gap: 6 }}><MapPin size={12} /> {t.venue}</span>
                </div>
                <div className="pro-row" style={{ gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--pro-surface-3)", overflow: "hidden" }}>
                    <div style={{ width: `${(t.filled / t.spots) * 100}%`, height: "100%", background: "var(--pro-active)" }} />
                  </div>
                  <span style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 800 }}>{t.filled}/{t.spots}</span>
                </div>
                <div className="pro-row" style={{ gap: 6 }}>
                  <Button variant="secondary" size="sm" fullWidth>Manage</Button>
                  <Button variant="primary" size="sm" fullWidth trailingIcon={<ArrowRight size={12} />}>Open</Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === "shortlist" && (
        shortlist.length === 0 ? (
          <Card><EmptyState icon={<Star size={18} />} title="No shortlisted players" description="Star promising applicants to add them to the shortlist." /></Card>
        ) : (
          <Card padded={false}>
            <table className="pro-table">
              <thead><tr><th>Player</th><th>Position</th><th>Age</th><th>Rating</th><th>Applied for</th><th>Status</th><th style={{ width: 160 }}>Actions</th></tr></thead>
              <tbody>
                {shortlist.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="pro-row" style={{ gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 99, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{a.name.charAt(0)}</div>
                        <span style={{ fontWeight: 700 }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="pro-text-muted">{a.position}</td>
                    <td className="pro-text-muted">{a.age}</td>
                    <td><div className="pro-row" style={{ gap: 4, fontWeight: 800 }}><Star size={12} /> {a.rating}</div></td>
                    <td><Tag tone="muted">{a.appliedFor}</Tag></td>
                    <td><AStatus s={a.status} /></td>
                    <td>
                      <div className="pro-row" style={{ gap: 4 }}>
                        <Button variant="ghost" size="sm">Message</Button>
                        <Button variant="primary" size="sm">Invite</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {tab === "applicants" && (
        <Card padded={false}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="pro-row" style={{ gap: 8 }}>
              <div className="pro-topbar__search" style={{ height: 32, maxWidth: 320, flex: 1 }}>
                <Search size={13} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicants…" />
              </div>
            </div>
            <FilterChips<"all" | AppStatus>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { key: "all",            label: "All",            count: applicants.length },
                { key: "new",            label: "New",            count: countBy("new") },
                { key: "shortlisted",    label: "Shortlisted",    count: countBy("shortlisted") },
                { key: "trial-invited",  label: "Trial invited",  count: countBy("trial-invited") },
                { key: "signed",         label: "Signed",         count: countBy("signed") },
                { key: "rejected",       label: "Rejected",       count: countBy("rejected") },
              ]}
            />
          </div>
          {filteredApps.length === 0 ? (
            <EmptyState icon={<Users size={18} />} title="No applicants match" description="Try a different search term." />
          ) : (
            <table className="pro-table">
              <thead><tr><th>Player</th><th>Position</th><th>Age</th><th>Rating</th><th>Applied for</th><th>Status</th><th style={{ width: 140 }}>Actions</th></tr></thead>
              <tbody>
                {filteredApps.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="pro-row" style={{ gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 99, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{a.name.charAt(0)}</div>
                        <span style={{ fontWeight: 700 }}>{a.name}</span>
                      </div>
                    </td>
                    <td className="pro-text-muted">{a.position}</td>
                    <td className="pro-text-muted">{a.age}</td>
                    <td><div className="pro-row" style={{ gap: 4, fontWeight: 800 }}><Star size={12} /> {a.rating}</div></td>
                    <td><Tag tone="muted">{a.appliedFor}</Tag></td>
                    <td><AStatus s={a.status} /></td>
                    <td>
                      <div className="pro-row" style={{ gap: 4 }}>
                        <button className="pro-icon-btn" aria-label="Approve" style={{ width: 28, height: 28 }}><CheckCheck size={13} /></button>
                        <button className="pro-icon-btn" aria-label="Reject" style={{ width: 28, height: 28 }}><X size={13} /></button>
                        <button className="pro-icon-btn" aria-label="More" style={{ width: 28, height: 28 }}><MoreHorizontal size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "market" && <PlayerMarketTab />}
      {tab === "scout" && <ScoutViewTab />}
      {tab === "watchlist" && <ScoutWatchlistTab />}
    </PageShell>
  );
}
