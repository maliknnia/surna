import { useState } from "react";
import { useLocation } from "wouter";
import {
  Building2, Users, Calendar, Trophy, Plus, ArrowRight, MapPin,
  Shield, GraduationCap, Megaphone, Settings, ChevronRight, Star,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";

type ClubTab = "overview" | "teams" | "academy" | "staff" | "announcements" | "settings";

type ClubTeam = {
  id: string;
  name: string;
  category: string;
  members: number;
  events: number;
  status: "active" | "recruiting" | "paused";
};

type AcademyPlayer = {
  id: string;
  name: string;
  age: number;
  position: string;
  rating: number;
  pathway: "U12" | "U14" | "U16" | "U18" | "Senior";
  status: "developing" | "ready" | "trial";
};

const club = {
  name: "Northwood Sports Club",
  founded: 2014,
  location: "Manchester, UK",
  members: 248,
  teams: 6,
  trophies: 17,
};

const teams: ClubTeam[] = [
  { id: "t1", name: "Senior A",       category: "Senior",  members: 22, events: 14, status: "active" },
  { id: "t2", name: "Senior B",       category: "Senior",  members: 19, events: 10, status: "active" },
  { id: "t3", name: "Women's First",  category: "Senior",  members: 19, events: 11, status: "active" },
  { id: "t4", name: "Youth U18",      category: "Academy", members: 16, events:  8, status: "recruiting" },
  { id: "t5", name: "Youth U16",      category: "Academy", members: 18, events:  9, status: "recruiting" },
  { id: "t6", name: "Youth U14",      category: "Academy", members: 14, events:  6, status: "active" },
];

const academy: AcademyPlayer[] = [
  { id: "a1", name: "Liam C.",  age: 13, position: "Forward",    rating: 4.6, pathway: "U14", status: "developing" },
  { id: "a2", name: "Maya R.",  age: 15, position: "Midfielder", rating: 4.8, pathway: "U16", status: "ready" },
  { id: "a3", name: "Sam P.",   age: 16, position: "Defender",   rating: 4.4, pathway: "U16", status: "developing" },
  { id: "a4", name: "Noah K.",  age: 17, position: "Goalkeeper", rating: 4.9, pathway: "U18", status: "trial" },
  { id: "a5", name: "Ava T.",   age: 14, position: "Forward",    rating: 4.7, pathway: "U14", status: "ready" },
];

const staffMembers = [
  { id: "s1", name: "Lia Bennett",   role: "Head of Football",      since: "2019" },
  { id: "s2", name: "James O.",      role: "Academy Director",      since: "2021" },
  { id: "s3", name: "Sara M.",       role: "Head Physio",           since: "2022" },
  { id: "s4", name: "Marco D.",      role: "Goalkeeper Coach",      since: "2023" },
];

const announcements = [
  { id: "n1", title: "Season kickoff — Aug 18",        body: "Pre-season training schedule published for all teams.", date: "2 days ago" },
  { id: "n2", title: "New academy intake open",        body: "U12 to U16 trials, registrations open until June 30.",   date: "5 days ago" },
  { id: "n3", title: "Riverside Arena partnership",    body: "10% discount for all club bookings until end of year.", date: "1 week ago" },
];

function StatusTag({ s }: { s: ClubTeam["status"] | AcademyPlayer["status"] }) {
  if (s === "active")     return <Tag tone="success">Active</Tag>;
  if (s === "recruiting") return <Tag tone="active">Recruiting</Tag>;
  if (s === "ready")      return <Tag tone="success">Ready</Tag>;
  if (s === "trial")      return <Tag tone="active">In trial</Tag>;
  if (s === "developing") return <Tag tone="muted">Developing</Tag>;
  return <Tag tone="muted">Paused</Tag>;
}

export default function ProClub() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<ClubTab>("overview");
  const { can } = useProRole();
  const canEdit = can("club.edit");
  const canSettings = can("club.settings");
  const canAnnounce = can("messages.announce");

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Club at a glance</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "var(--pro-fs-sm)" }}>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Founded</span><span style={{ fontWeight: 800 }}>{club.founded}</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Members</span><span style={{ fontWeight: 800 }}>{club.members}</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Teams</span><span style={{ fontWeight: 800 }}>{club.teams}</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Trophies</span><span style={{ fontWeight: 800 }}>{club.trophies}</span></div>
          <div className="pro-row" style={{ justifyContent: "space-between" }}><span className="pro-text-muted">Location</span><span style={{ fontWeight: 800 }}>{club.location}</span></div>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Quick actions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Button variant="secondary" size="sm" fullWidth leadingIcon={<Plus size={13} />} href="/pro/roster">Add team</Button>
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<GraduationCap size={13} />} href="/pro/recruitment">New trial intake</Button>
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<Megaphone size={13} />} onClick={() => setTab("announcements")}>Post club update</Button>
          <Button variant="ghost" size="sm" fullWidth leadingIcon={<Settings size={13} />} href="/pro/settings">Club settings</Button>
        </div>
      </Card>
    </>
  );

  return (
    <PageShell
      title="Club & Academy"
      subtitle="Run multiple teams, develop academy talent, manage staff under one roof."
      actions={
        <>
          {canAnnounce && <Button variant="secondary" leadingIcon={<Megaphone size={14} />} onClick={() => setTab("announcements")}>Announcement</Button>}
          {canEdit && <Button variant="primary" leadingIcon={<Plus size={14} />} href="/pro/roster">Add team</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={canEdit
          ? <>This is your club's command center. Add teams, develop academy talent, manage staff and post club-wide updates.</>
          : <>Public-facing view of {club.name}. Owners and admins can edit teams, academy, staff and club-wide settings.</>}
        actions={[
          { key: "add-team",       label: "Add team",       icon: <Plus size={12} />,         variant: "primary", disabled: !canEdit, hidden: !canEdit, href: "/pro/roster" },
          { key: "announce",       label: "Post update",    icon: <Megaphone size={12} />,    onClick: () => setTab("announcements"), disabled: !canAnnounce, hidden: !canAnnounce },
          { key: "academy",        label: "Academy",        icon: <GraduationCap size={12} />,onClick: () => setTab("academy") },
          { key: "settings",       label: "Club settings",  icon: <Settings size={12} />,     onClick: () => setTab("settings"), disabled: !canSettings, hidden: !canSettings },
        ]}
      />
      {/* Club header card */}
      <Card>
        <div className="pro-row" style={{ gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "var(--pro-active)", color: "var(--pro-active-text)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 26,
          }}>{club.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pro-row" style={{ gap: 8 }}>
              <h2 style={{ margin: 0 }}>{club.name}</h2>
              <Tag tone="success">Verified club</Tag>
            </div>
            <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", marginTop: 2, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span className="pro-row" style={{ gap: 4 }}><MapPin size={12} /> {club.location}</span>
              <span className="pro-row" style={{ gap: 4 }}><Calendar size={12} /> Since {club.founded}</span>
              <span className="pro-row" style={{ gap: 4 }}><Users size={12} /> {club.members} members</span>
            </div>
          </div>
          <Button variant="ghost" trailingIcon={<ArrowRight size={14} />} href="/">Public page</Button>
        </div>
      </Card>

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Teams"     value={club.teams}    delta={{ value: "+1 this year",  direction: "up" }}   icon={<Shield size={12} />} />
        <StatCard label="Members"   value={club.members}  delta={{ value: "+18 this month",direction: "up" }}   icon={<Users size={12} />} />
        <StatCard label="Academy"   value={academy.length} delta={{ value: "5 in pathway", direction: "flat" }} icon={<GraduationCap size={12} />} />
        <StatCard label="Trophies"  value={club.trophies} delta={{ value: "+2 last season",direction: "up" }}   icon={<Trophy size={12} />} />
      </div>

      <Tabs<ClubTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "overview",      label: "Overview" },
          { key: "teams",         label: "Teams",         icon: <Shield size={13} />,        count: teams.length },
          { key: "academy",       label: "Academy",       icon: <GraduationCap size={13} />, count: academy.length },
          { key: "staff",         label: "Staff",         icon: <Users size={13} />,         count: staffMembers.length },
          { key: "announcements", label: "Announcements", icon: <Megaphone size={13} />,     count: announcements.length },
          { key: "settings",      label: "Settings",      icon: <Settings size={13} /> },
        ]}
      />

      {tab === "overview" && (
        <div className="pro-grid pro-grid-2" style={{ gap: 12 }}>
          <Card padded={false}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
              <h3 style={{ margin: 0 }}>Senior teams</h3>
              <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Top of the club pyramid</p>
            </div>
            {teams.filter(t => t.category === "Senior").map((t, i) => (
              <div key={t.id} className="pro-row" style={{
                padding: "12px 18px", gap: 10,
                borderTop: i === 0 ? "1px solid var(--pro-border)" : "1px solid var(--pro-border-soft)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{t.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{t.name}</div>
                  <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{t.members} members · {t.events} events</div>
                </div>
                <StatusTag s={t.status} />
                <button
                  type="button"
                  className="pro-icon-btn"
                  aria-label="Open roster"
                  style={{ width: 28, height: 28 }}
                  onClick={() => setLocation("/pro/roster")}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </Card>

          <Card padded={false}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
              <h3 style={{ margin: 0 }}>Academy pathway</h3>
              <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Players closest to first-team selection</p>
            </div>
            {academy.slice(0, 4).map((p, i) => (
              <div key={p.id} className="pro-row" style={{
                padding: "12px 18px", gap: 10,
                borderTop: i === 0 ? "1px solid var(--pro-border)" : "1px solid var(--pro-border-soft)",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{p.name.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{p.name} <span className="pro-text-muted" style={{ fontWeight: 500 }}>· {p.position}</span></div>
                  <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{p.pathway} · age {p.age}</div>
                </div>
                <div className="pro-row" style={{ gap: 4, fontSize: "var(--pro-fs-sm)", fontWeight: 800 }}>
                  <Star size={12} /> {p.rating}
                </div>
                <StatusTag s={p.status} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "teams" && (
        <Card padded={false}>
          <div style={{ overflowX: "auto" }}>
            <table className="pro-table">
              <thead>
                <tr><th>Team</th><th>Category</th><th>Members</th><th>Events</th><th>Status</th><th style={{ width: 100 }}>Actions</th></tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} data-testid={`club-team-${t.id}`}>
                    <td>
                      <div className="pro-row" style={{ gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{t.name.charAt(0)}</div>
                        <span style={{ fontWeight: 700 }}>{t.name}</span>
                      </div>
                    </td>
                    <td><Tag tone={t.category === "Academy" ? "active" : "muted"}>{t.category}</Tag></td>
                    <td className="pro-text-muted">{t.members}</td>
                    <td className="pro-text-muted">{t.events}</td>
                    <td><StatusTag s={t.status} /></td>
                    <td>
                      <Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={12} />} href="/pro/roster">Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "academy" && (
        <Card padded={false}>
          <div style={{ overflowX: "auto" }}>
            <table className="pro-table">
              <thead>
                <tr><th>Player</th><th>Pathway</th><th>Age</th><th>Position</th><th>Rating</th><th>Status</th></tr>
              </thead>
              <tbody>
                {academy.map((p) => (
                  <tr key={p.id} data-testid={`academy-${p.id}`}>
                    <td>
                      <div className="pro-row" style={{ gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 99, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{p.name.charAt(0)}</div>
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                      </div>
                    </td>
                    <td><Tag tone="muted">{p.pathway}</Tag></td>
                    <td className="pro-text-muted">{p.age}</td>
                    <td className="pro-text-muted">{p.position}</td>
                    <td>
                      <div className="pro-row" style={{ gap: 4, fontWeight: 800 }}>
                        <Star size={12} /> {p.rating}
                      </div>
                    </td>
                    <td><StatusTag s={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "staff" && (
        <Card padded={false}>
          {staffMembers.map((m, i) => (
            <div key={m.id} className="pro-row" style={{
              padding: "12px 18px", gap: 10,
              borderTop: i === 0 ? 0 : "1px solid var(--pro-border-soft)",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 99, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{m.name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{m.name}</div>
                <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{m.role} · since {m.since}</div>
              </div>
              <Button variant="ghost" size="sm" href="/pro/settings">Manage</Button>
            </div>
          ))}
        </Card>
      )}

      {tab === "announcements" && (
        <Card padded={false}>
          {announcements.map((a, i) => (
            <div key={a.id} style={{
              padding: "14px 18px",
              borderTop: i === 0 ? 0 : "1px solid var(--pro-border-soft)",
            }}>
              <div className="pro-row" style={{ gap: 8 }}>
                <Megaphone size={13} style={{ color: "var(--pro-text-subtle)" }} />
                <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)", flex: 1 }}>{a.title}</div>
                <span className="pro-text-muted" style={{ fontSize: 11, fontWeight: 700 }}>{a.date}</span>
              </div>
              <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", margin: "6px 0 0 21px" }}>{a.body}</p>
            </div>
          ))}
        </Card>
      )}

      {tab === "settings" && (
        <Card><EmptyState icon={<Settings size={18} />} title="Club settings" description="Branding, visibility, billing owner and admins live here." action={<Button variant="primary" href="/pro/settings">Open settings</Button>} /></Card>
      )}
    </PageShell>
  );
}
