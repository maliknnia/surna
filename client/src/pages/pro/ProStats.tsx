import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, Users, Eye, MessageSquare, Heart, Calendar,
  Download, Filter, ArrowRight, Award, Target, Activity, Globe, BarChart2, Swords,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState } from "./components/primitives";
import { useProTeam } from "./components/ProTeamContext";
import ProSportHero from "./components/ProSportHero";
import { proKeys, fetchProJson } from "./lib/proQueries";

type Range = "7d" | "30d" | "90d" | "12m";
type StatsTab = "overview" | "performance" | "audience" | "content" | "events";

const ranges: { key: Range; label: string }[] = [
  { key: "7d",  label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

/* ---------- Sparkline (B&W line chart) ---------- */
function Sparkline({ data, height = 56, fill = true }: { data: number[]; height?: number; fill?: boolean }) {
  const w = 100, h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 8) - 4}`).join(" ");
  const area = `${points} ${w},${h} 0,${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {fill && <polygon points={area} fill="var(--pro-text)" opacity="0.06" />}
      <polyline points={points} fill="none" stroke="var(--pro-text)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------- Bar chart (B&W) ---------- */
function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 6, alignItems: "end", height: 140 }}>
      {data.map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", maxWidth: 28 }}>
            <div title={String(v)} style={{
              height: `${(v / max) * 100}%`,
              background: i === data.length - 1 ? "var(--pro-active)" : "var(--pro-text)",
              opacity: i === data.length - 1 ? 1 : 0.78,
              borderRadius: "4px 4px 2px 2px",
              minHeight: 4,
              transition: "height 200ms ease",
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--pro-text-subtle)" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Donut (B&W stacked rings) ---------- */
function Donut({ segments, size = 132 }: { segments: { label: string; value: number; tone: number }[]; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--pro-surface-3)" strokeWidth="14" fill="none" />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const offset = c - acc;
          acc += len;
          return (
            <circle
              key={i}
              cx={size/2} cy={size/2} r={r}
              stroke="var(--pro-text)"
              strokeOpacity={1 - i * 0.18}
              strokeWidth="14"
              fill="none"
              strokeDasharray={`${len} ${c}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              strokeLinecap="butt"
            />
          );
        })}
        <text x="50%" y="48%" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: "var(--pro-text)" }}>{total.toLocaleString()}</text>
        <text x="50%" y="62%" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: "var(--pro-text-subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {segments.map((s, i) => (
          <div key={i} className="pro-row" style={{ gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3,
              background: "var(--pro-text)", opacity: 1 - i * 0.18,
            }} />
            <span style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 600, flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 800 }}>{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Range selector ---------- */
function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div style={{ display: "flex", padding: 2, background: "var(--pro-surface-2)", border: "1px solid var(--pro-border)", borderRadius: 10 }}>
      {ranges.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          data-testid={`range-${r.key}`}
          style={{
            padding: "5px 10px", borderRadius: 8,
            background: value === r.key ? "var(--pro-surface)" : "transparent",
            color: value === r.key ? "var(--pro-text)" : "var(--pro-text-muted)",
            border: 0, fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: value === r.key ? "var(--pro-shadow-sm)" : "none",
          }}
        >{r.label}</button>
      ))}
    </div>
  );
}

/* ---------- Sample data ---------- */
const series = {
  followers: [820, 845, 860, 890, 915, 950, 985, 1010, 1035, 1080, 1120, 1180],
  engagement:[ 24,  31,  28,  35,  42,  39,  47,  53,  49,  58,  61,  64],
  reach:     [3200,3400,3650,3800,4100,3950,4400,4850,4720,5200,5400,5800],
  events:    [ 14,  16,  18,  17,  20,  19,  22,  24,  23,  26,  27,  29],
};

const monthLabels = ["May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr"];

const topContent = [
  { id: "c1", title: "Open Trials — Senior Squad",          type: "Event",      views: 4_812, engagement: 612, trend: "up" as const },
  { id: "c2", title: "Sunday League win — 3-1 vs Riverside",type: "Post",       views: 3_240, engagement: 480, trend: "up" as const },
  { id: "c3", title: "New goalkeeper jersey drop",          type: "Marketplace",views: 2_910, engagement: 318, trend: "flat" as const },
  { id: "c4", title: "Coach Lia — tactical breakdown",      type: "Video",      views: 2_614, engagement: 402, trend: "up" as const },
  { id: "c5", title: "Youth U16 — friendly recap",          type: "Post",       views: 1_920, engagement: 211, trend: "down" as const },
];

const audience = [
  { label: "18–24", value: 280 },
  { label: "25–34", value: 420 },
  { label: "35–44", value: 310 },
  { label: "45+",   value: 170 },
];

const cities = [
  { city: "London",    pct: 34 },
  { city: "Manchester",pct: 18 },
  { city: "Bristol",   pct: 12 },
  { city: "Leeds",     pct:  9 },
  { city: "Glasgow",   pct:  7 },
];

/* ---------- Page ---------- */
export default function ProStats() {
  const [range, setRange] = useState<Range>("90d");
  const [tab, setTab] = useState<StatsTab>("performance");
  const { sportProfile, activeTeam, teamId } = useProTeam();

  const { data: teamStats } = useQuery<{
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

  const performanceMetrics = useMemo(() => {
    return sportProfile.statLabels.map((label: string) => ({
      label,
      pending: true,
    }));
  }, [sportProfile.statLabels]);

  const sliced = useMemo(() => {
    const n = range === "7d" ? 4 : range === "30d" ? 6 : range === "90d" ? 9 : 12;
    return {
      followers:  series.followers.slice(-n),
      engagement: series.engagement.slice(-n),
      reach:      series.reach.slice(-n),
      events:     series.events.slice(-n),
      labels:     monthLabels.slice(-n),
    };
  }, [range]);

  const RightPanel = (
    <>
      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Highlights</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="pro-row" style={{ gap: 8 }}>
            <Award size={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>Best week ever</div>
              <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>+58 followers, 4 events filled.</div>
            </div>
          </div>
          <div className="pro-row" style={{ gap: 8 }}>
            <Target size={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>Goal: 1.5k followers</div>
              <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>78% of the way · ETA 6 weeks.</div>
            </div>
          </div>
          <div className="pro-row" style={{ gap: 8 }}>
            <Activity size={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--pro-fs-sm)", fontWeight: 700 }}>Engagement up 12%</div>
              <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>vs previous {range}.</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: 0, marginBottom: 10 }}>Suggested actions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Button variant="secondary" size="sm" fullWidth>Boost top event</Button>
          <Button variant="ghost" size="sm" fullWidth>Schedule weekly digest</Button>
          <Button variant="ghost" size="sm" fullWidth>Re-engage inactive members</Button>
        </div>
      </Card>
    </>
  );

  const fmt = (n: number) => n.toLocaleString();
  const last = (a: number[]) => a[a.length - 1];
  const prev = (a: number[]) => a[a.length - 2] ?? a[0];
  const delta = (a: number[]) => {
    const d = ((last(a) - prev(a)) / Math.max(prev(a), 1)) * 100;
    return { value: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, direction: (d > 0 ? "up" : d < 0 ? "down" : "flat") as "up" | "down" | "flat" };
  };

  return (
    <PageShell
      title="Analytics"
      subtitle={`${sportProfile.displaySport} performance & club analytics${activeTeam ? ` · ${activeTeam.name}` : ""}.`}
      actions={
        <>
          <RangeSelector value={range} onChange={setRange} />
          <Button variant="secondary" leadingIcon={<Filter size={14} />}>Filters</Button>
          <Button variant="primary" leadingIcon={<Download size={14} />}>Export</Button>
        </>
      }
      rightPanel={RightPanel}
    >
      <ProSportHero profile={sportProfile} teamName={activeTeam?.name} compact />

      {teamStats && tab === "overview" && (
        <div className="pro-grid pro-grid-4" style={{ gap: 12, marginBottom: 16 }}>
          <StatCard label="Members" value={teamStats.members} icon={<Users size={12} />} />
          <StatCard label="Upcoming events" value={teamStats.events} icon={<Calendar size={12} />} />
          <StatCard label="Unread messages" value={teamStats.messages} icon={<MessageSquare size={12} />} />
          <StatCard label="Profile visits" value={teamStats.visits} icon={<Eye size={12} />} />
        </div>
      )}

      <Tabs<StatsTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "performance", label: "Performance", icon: <BarChart2 size={13} /> },
          { key: "overview", label: "Club overview" },
          { key: "audience", label: "Audience" },
          { key: "content",  label: "Content" },
          { key: "events",   label: "Events" },
        ]}
      />

      {tab === "performance" && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <p className="pro-text-muted" style={{ fontSize: 13, margin: "0 0 14px" }}>
              {sportProfile.governingBody}-aligned metrics for {sportProfile.displaySport}.
              Log results after each fixture to populate live numbers.
            </p>
            <div className="pro-metric-grid">
              {performanceMetrics.map((m: { label: string }) => (
                <div key={m.label} className="pro-metric-card">
                  <div className="pro-metric-card__label">{m.label}</div>
                  <div className="pro-metric-card__value pro-metric-card__value--pending">—</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="pro-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Next step</h3>
                <p className="pro-text-muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
                  Use Match Day to prep your squad, then file results to unlock {sportProfile.statLabels[0]?.toLowerCase() ?? "performance"} tracking.
                </p>
              </div>
              <Link href="/pro/match-day">
                <Button variant="primary" leadingIcon={<Swords size={14} />}>Open match day</Button>
              </Link>
            </div>
          </Card>
        </>
      )}

      {tab === "overview" && (
        <>
          <div className="pro-grid pro-grid-4" style={{ gap: 12 }}>
            <StatCard label="Followers"  value={fmt(last(sliced.followers))}  delta={delta(sliced.followers)}  icon={<Users size={12} />} />
            <StatCard label="Reach"      value={fmt(last(sliced.reach))}      delta={delta(sliced.reach)}      icon={<Eye size={12} />} />
            <StatCard label="Engagement" value={`${last(sliced.engagement)}%`}delta={delta(sliced.engagement)} icon={<Heart size={12} />} />
            <StatCard label="Events run" value={fmt(last(sliced.events))}     delta={delta(sliced.events)}     icon={<Calendar size={12} />} />
          </div>

          <div className="pro-grid pro-grid-2" style={{ gap: 12 }}>
            <Card>
              <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pro-text-subtle)" }}>Audience growth</div>
                  <div style={{ fontSize: "var(--pro-fs-h2)", fontWeight: 800, marginTop: 2 }}>{fmt(last(sliced.followers))}</div>
                </div>
                <Tag tone={delta(sliced.followers).direction === "up" ? "success" : "muted"}>
                  {delta(sliced.followers).direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {delta(sliced.followers).value}
                </Tag>
              </div>
              <Sparkline data={sliced.followers} height={120} />
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${sliced.labels.length}, 1fr)`, fontSize: 10, fontWeight: 700, color: "var(--pro-text-subtle)", marginTop: 4 }}>
                {sliced.labels.map((l) => <span key={l} style={{ textAlign: "center" }}>{l}</span>)}
              </div>
            </Card>

            <Card>
              <div className="pro-row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: "var(--pro-fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pro-text-subtle)" }}>Reach by month</div>
                  <div style={{ fontSize: "var(--pro-fs-h2)", fontWeight: 800, marginTop: 2 }}>{fmt(sliced.reach.reduce((s, n) => s + n, 0))}</div>
                </div>
                <Tag tone="active">Last bar = current</Tag>
              </div>
              <BarChart data={sliced.reach} labels={sliced.labels} />
            </Card>
          </div>

          <Card padded={false}>
            <div className="pro-row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0 }}>Top performing content</h3>
                <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Ranked by views in selected range</p>
              </div>
              <Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={13} />}>See all</Button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="pro-table">
                <thead>
                  <tr><th style={{ width: 36 }}>#</th><th>Title</th><th>Type</th><th>Views</th><th>Engagement</th><th>Trend</th></tr>
                </thead>
                <tbody>
                  {topContent.map((c, i) => (
                    <tr key={c.id} data-testid={`top-content-${c.id}`}>
                      <td style={{ color: "var(--pro-text-subtle)", fontWeight: 800 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{c.title}</td>
                      <td><Tag tone="muted">{c.type}</Tag></td>
                      <td style={{ fontWeight: 700 }}>{fmt(c.views)}</td>
                      <td className="pro-text-muted">{fmt(c.engagement)}</td>
                      <td>
                        <Tag tone={c.trend === "up" ? "success" : c.trend === "down" ? "danger" : "muted"}>
                          {c.trend === "up" ? <TrendingUp size={11} /> : c.trend === "down" ? <TrendingDown size={11} /> : "—"} {c.trend}
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {tab === "audience" && (
        <>
          <div style={{ marginBottom: 12 }}><Tag tone="muted">Sample audience data</Tag></div>
        <div className="pro-grid pro-grid-2" style={{ gap: 12 }}>
          <Card>
            <h3 style={{ margin: 0, marginBottom: 12 }}>Age distribution</h3>
            <Donut segments={audience.map((a, i) => ({ label: a.label, value: a.value, tone: i }))} />
          </Card>
          <Card>
            <h3 style={{ margin: 0, marginBottom: 12 }}>Top cities</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {cities.map((c) => (
                <div key={c.city}>
                  <div className="pro-row" style={{ justifyContent: "space-between", fontSize: "var(--pro-fs-sm)", marginBottom: 4 }}>
                    <span className="pro-row" style={{ gap: 6 }}><Globe size={12} style={{ color: "var(--pro-text-subtle)" }} /><span style={{ fontWeight: 700 }}>{c.city}</span></span>
                    <span style={{ fontWeight: 800 }}>{c.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--pro-surface-3)", overflow: "hidden" }}>
                    <div style={{ width: `${c.pct * 2.5}%`, maxWidth: "100%", height: "100%", background: "var(--pro-active)" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        </>
      )}

      {tab === "content" && (
        <Card>
          <EmptyState icon={<MessageSquare size={18} />} title="Detailed content analytics" description="Per-post and per-video breakdowns will land in the next polish pass." />
        </Card>
      )}

      {tab === "events" && (
        <div className="pro-grid pro-grid-2" style={{ gap: 12 }}>
          <Card>
            <h3 style={{ margin: 0, marginBottom: 12 }}>Events run</h3>
            <BarChart data={sliced.events} labels={sliced.labels} />
          </Card>
          <Card>
            <h3 style={{ margin: 0, marginBottom: 12 }}>Avg engagement %</h3>
            <Sparkline data={sliced.engagement} height={140} />
          </Card>
        </div>
      )}
    </PageShell>
  );
}
