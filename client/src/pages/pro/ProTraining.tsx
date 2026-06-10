import { useState, useMemo } from "react";
import {
  Dumbbell, ClipboardList, Plus, Calendar, Clock, MapPin, Search,
  BookOpen, Target, Activity,
} from "lucide-react";
import { Link } from "wouter";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProTeam } from "./components/ProTeamContext";
import { useAppendActivity } from "./components/proWorkflowApi";
import ProSportHero from "./components/ProSportHero";
import type { SportProfile } from "./lib/proSport";

type TTab = "sessions" | "drills" | "plans";
type SessionStatus = "scheduled" | "completed" | "cancelled";

type Session = {
  id: string;
  focus: string;
  date: string;
  time: string;
  duration: string;
  venue: string;
  attendees: number;
  capacity: number;
  status: SessionStatus;
  intensity: "low" | "medium" | "high";
};

type Drill = {
  id: string;
  name: string;
  category: string;
  duration: string;
  players: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
};

function buildSessionsFromProfile(
  templates: Array<{ focus: string; intensity: "low" | "medium" | "high"; duration: string }>,
  capacity: number,
): Session[] {
  const days = ["Mon", "Wed", "Fri"];
  const times = ["19:00", "19:00", "18:30"];
  const venues = ["Main venue", "Training ground", "Main venue"];
  return templates.map((t, i) => ({
    id: `s${i + 1}`,
    focus: t.focus,
    date: `${days[i] ?? "Tue"}, next week`,
    time: times[i] ?? "19:00",
    duration: t.duration,
    venue: venues[i] ?? "Main venue",
    attendees: Math.max(1, capacity - 4),
    capacity,
    status: "scheduled" as SessionStatus,
    intensity: t.intensity,
  }));
}

function intensityLabel(v: "low" | "medium" | "high") {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function Difficulty({ level }: { level: number }) {
  return (
    <div className="pro-difficulty" title={`Difficulty ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`pro-difficulty__dot${i <= level ? " pro-difficulty__dot--on" : ""}`} />
      ))}
    </div>
  );
}

export default function ProTraining() {
  const [tab, setTab] = useState<TTab>("sessions");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const { sportProfile, activeTeam } = useProTeam();
  const { can } = useProRole();
  const logActivity = useAppendActivity();
  const canCreate = can("training.create");

  const capacity = Math.max(sportProfile.squadMax, sportProfile.playersOnField, 12);
  const sessions = useMemo(
    () => buildSessionsFromProfile(sportProfile.trainingSessionTemplates, capacity),
    [sportProfile.trainingSessionTemplates, capacity],
  );
  const drills = useMemo(() => sportProfile.defaultDrills as Drill[], [sportProfile.defaultDrills]);
  const totalMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + parseInt(s.duration, 10) || 0, 0),
    [sessions],
  );

  const filteredDrills = useMemo(() => {
    let list = drills;
    if (category !== "all") list = list.filter((d) => d.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }
    return list;
  }, [drills, category, search]);

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Categories</h3>
        <div className="pro-col" style={{ gap: 6 }}>
          {sportProfile.drillCategories.map((cat: string) => {
            const count = drills.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                className="pro-row"
                style={{
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--pro-border-soft)",
                  background: category === cat ? "var(--pro-surface-2)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                onClick={() => { setCategory(cat); setTab("drills"); }}
              >
                <span>{cat}</span>
                <Tag tone="muted">{count}</Tag>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Resources</h3>
        <div className="pro-col" style={{ gap: 6 }}>
          <Link href="/pro/match-day">
            <Button variant="ghost" size="sm" fullWidth>Match day prep</Button>
          </Link>
          <Link href="/pro/inventory">
            <Button variant="ghost" size="sm" fullWidth>Kit inventory</Button>
          </Link>
        </div>
      </Card>
    </>
  );

  return (
    <PageShell
      title="Training"
      subtitle={`${sportProfile.governingBody} templates · ${drills.length} drills · ${totalMinutes} min planned`}
      actions={
        <>
          <Button variant="secondary" leadingIcon={<BookOpen size={14} />} onClick={() => setTab("drills")}>
            Drill library
          </Button>
          {canCreate && (
            <Button
              variant="primary"
              leadingIcon={<Plus size={14} />}
              onClick={() => logActivity.mutate({ kind: "training.create", summary: "Added a training session" })}
            >
              New session
            </Button>
          )}
        </>
      }
      rightPanel={RightPanel}
    >
      <ProSportHero
        profile={sportProfile}
        teamName={activeTeam?.name}
        links={[{ label: "Match prep", href: "/pro/match-day" }]}
        compact
      />

      <ContextBar
        context={<>Sport-specific session templates and drill library — tuned for {sportProfile.displaySport}.</>}
        actions={[
          { key: "drills", label: "Drills", icon: <BookOpen size={12} />, onClick: () => setTab("drills") },
          { key: "plans", label: "Season plan", icon: <Target size={12} />, onClick: () => setTab("plans") },
        ]}
      />

      <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
        <StatCard label="Sessions" value={sessions.length} icon={<Calendar size={12} />} />
        <StatCard label="Drills" value={drills.length} icon={<Dumbbell size={12} />} />
        <StatCard label="Categories" value={sportProfile.drillCategories.length} icon={<ClipboardList size={12} />} />
        <StatCard label="Minutes" value={`${totalMinutes}m`} icon={<Activity size={12} />} />
      </div>

      <Tabs<TTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "sessions", label: "Sessions", icon: <Dumbbell size={13} />, count: sessions.length },
          { key: "drills", label: "Drill library", icon: <ClipboardList size={13} />, count: drills.length },
          { key: "plans", label: "Season plan", icon: <Target size={13} /> },
        ]}
      />

      {tab === "sessions" && (
        <Card padded={false}>
          <div className="pro-session-list">
            {sessions.map((s) => (
              <div key={s.id} className="pro-session-row" data-testid={`session-${s.id}`}>
                <div>
                  <div className="pro-session-row__focus">{s.focus}</div>
                  <div className="pro-session-row__meta">
                    <span><Calendar size={12} /> {s.date} · {s.time}</span>
                    <span><Clock size={12} /> {s.duration}</span>
                    <span><MapPin size={12} /> {s.venue}</span>
                    <Tag tone={s.intensity === "high" ? "active" : "muted"}>{intensityLabel(s.intensity)}</Tag>
                  </div>
                </div>
                <Tag tone="active">Template</Tag>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "drills" && (
        <Card padded={false}>
          <div className="pro-row" style={{ padding: "12px 14px", borderBottom: "1px solid var(--pro-border)", gap: 8 }}>
            <div className="pro-topbar__search" style={{ height: 32, maxWidth: 280, flex: 1 }}>
              <Search size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drills…" />
            </div>
          </div>
          <div className="pro-category-chips">
            <button
              type="button"
              className={`pro-category-chip${category === "all" ? " pro-category-chip--active" : ""}`}
              onClick={() => setCategory("all")}
            >
              All ({drills.length})
            </button>
            {sportProfile.drillCategories.map((cat: string) => (
              <button
                key={cat}
                type="button"
                className={`pro-category-chip${category === cat ? " pro-category-chip--active" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {filteredDrills.length === 0 ? (
            <EmptyState icon={<Search size={18} />} title="No drills match" description="Try another category or search term." />
          ) : (
            <div className="pro-drill-grid">
              {filteredDrills.map((d) => (
                <div key={d.id} className="pro-drill-card">
                  <div className="pro-row" style={{ justifyContent: "space-between" }}>
                    <Tag tone="muted">{d.category}</Tag>
                    <Difficulty level={d.difficulty} />
                  </div>
                  <div className="pro-drill-card__name">{d.name}</div>
                  <div className="pro-drill-card__meta">{d.duration} · {d.players} players</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "plans" && (
        <Card>
          <SectionPlanPreview profile={sportProfile} sessions={sessions} />
        </Card>
      )}
    </PageShell>
  );
}

function SectionPlanPreview({
  profile,
  sessions,
}: {
  profile: SportProfile;
  sessions: Session[];
}) {
  const weeks = [
    { label: "Week 1 — Foundation", focus: profile.trainingSessionTemplates[0]?.focus ?? "Technique & fitness" },
    { label: "Week 2 — Build", focus: profile.trainingSessionTemplates[1]?.focus ?? "Tactical patterns" },
    { label: "Week 3 — Peak", focus: profile.trainingSessionTemplates[2]?.focus ?? "Match simulation" },
    { label: "Week 4 — Recovery", focus: "Light sessions & review" },
  ];

  return (
    <div>
      <h3 style={{ margin: "0 0 8px" }}>4-week {profile.displaySport} block</h3>
      <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 16px" }}>
        Auto-generated from {profile.governingBody} session templates. Customize when session API is connected.
      </p>
      <div className="pro-col" style={{ gap: 10 }}>
        {weeks.map((w, i) => (
          <div
            key={w.label}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--pro-border)",
              background: i === 0 ? "var(--pro-surface-2)" : "var(--pro-surface)",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13 }}>{w.label}</div>
            <div className="pro-text-muted" style={{ fontSize: 12, marginTop: 4 }}>{w.focus}</div>
            {i === 0 && sessions.length > 0 && (
              <div style={{ fontSize: 11, color: "var(--pro-text-subtle)", marginTop: 6 }}>
                {sessions.length} sessions · {sessions.reduce((s, x) => s + (parseInt(x.duration, 10) || 0), 0)} min
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
