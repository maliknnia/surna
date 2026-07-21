import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Users, Calendar, Trophy, Plus, ArrowRight, MapPin,
  Shield, GraduationCap, Megaphone, Settings, ChevronRight, Star,
} from "lucide-react";
import { PageShell, Card, Button, Tag, Tabs, StatCard, EmptyState, ContextBar } from "./components/primitives";
import { useProRole } from "./components/useProRole";
import { useProWorkspaceContext } from "./lib/useProWorkspaceContext";
import { ProWorkspaceModeGate } from "./components/ProWorkspaceModeGate";
import ProPlaceClubModule from "./modules/ProPlaceClubModule";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import {
  createProClub,
  fetchMyProClubs,
  fetchMyTeamsForClubLink,
  fetchProClubAcademy,
  fetchProClubTeams,
  addProClubTeam,
  academyPlayerDisplayName,
  teamLinkCategory,
  type ProAcademyProfile,
  type ProClubTeamLink,
} from "@/lib/proClubApi";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/navigation";

type ClubTab = "overview" | "teams" | "academy" | "staff" | "announcements" | "settings";

type ClubTeam = {
  id: string;
  name: string;
  category: string;
  sport: string;
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

function mapTeamLink(link: ProClubTeamLink): ClubTeam {
  const name = link.teamName ?? "Team";
  return {
    id: link.teamId,
    name,
    category: teamLinkCategory(name),
    sport: link.teamSport ?? "—",
    members: link.memberCount ?? 0,
    events: 0,
    status: "active",
  };
}

function mapAcademyProfile(profile: ProAcademyProfile): AcademyPlayer {
  const pathwayRaw = profile.ageGroup ?? "U16";
  const pathway = (["U12", "U14", "U16", "U18", "Senior"].includes(pathwayRaw)
    ? pathwayRaw
    : "U16") as AcademyPlayer["pathway"];
  const progress = profile.progressJson ?? {};
  const position = typeof progress.position === "string" ? progress.position : "—";
  const rating = typeof progress.rating === "number" ? progress.rating : 4.5;
  const statusRaw = typeof progress.status === "string" ? progress.status : "developing";
  const status = (["developing", "ready", "trial"].includes(statusRaw)
    ? statusRaw
    : "developing") as AcademyPlayer["status"];
  const ageMatch = pathway.match(/U(\d+)/);
  const age = ageMatch ? Number(ageMatch[1]) : 16;

  return {
    id: profile.id,
    name: academyPlayerDisplayName(profile),
    age,
    position,
    rating,
    pathway,
    status,
  };
}

function StatusTag({ s }: { s: ClubTeam["status"] | AcademyPlayer["status"] }) {
  if (s === "active")     return <Tag tone="success">Active</Tag>;
  if (s === "recruiting") return <Tag tone="active">Recruiting</Tag>;
  if (s === "ready")      return <Tag tone="success">Ready</Tag>;
  if (s === "trial")      return <Tag tone="active">In trial</Tag>;
  if (s === "developing") return <Tag tone="muted">Developing</Tag>;
  return <Tag tone="muted">Paused</Tag>;
}

export default function ProClub() {
  const { isPlaceMode, isShopMode } = useProWorkspaceContext();
  if (isPlaceMode) return <ProPlaceClubModule />;
  if (isShopMode) {
    return (
      <ProWorkspaceModeGate
        required={["team"]}
        title="Club & academy"
        description="Multi-team club tools are part of Team Pro. Manage shop settings from Settings."
      />
    );
  }
  return <ProTeamClub />;
}

function ProTeamClub() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ClubTab>("overview");
  const [newClubName, setNewClubName] = useState("");
  const [newClubLocation, setNewClubLocation] = useState("");
  const [teamToLink, setTeamToLink] = useState("");
  const { can } = useProRole();
  const canEdit = can("club.edit");
  const canSettings = can("club.settings");
  const canAnnounce = can("messages.announce");

  const { data: myClubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ["pro-clubs-mine"],
    queryFn: fetchMyProClubs,
  });
  const activeClubRow = myClubs[0];
  const clubId = activeClubRow?.id;

  const { data: clubTeamLinks = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["pro-club-teams", clubId],
    queryFn: () => fetchProClubTeams(clubId!),
    enabled: !!clubId,
  });

  const { data: academyProfiles = [], isLoading: academyLoading } = useQuery({
    queryKey: ["pro-club-academy", clubId],
    queryFn: () => fetchProClubAcademy(clubId!),
    enabled: !!clubId,
  });

  const { data: myTeams = [] } = useQuery({
    queryKey: ["my-teams-for-club"],
    queryFn: fetchMyTeamsForClubLink,
    enabled: !!clubId && canEdit,
  });

  const createClubMutation = useMutation({
    mutationFn: () =>
      createProClub({
        name: newClubName.trim(),
        location: newClubLocation.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pro-clubs-mine"] });
      setNewClubName("");
      setNewClubLocation("");
    },
  });

  const linkTeamMutation = useMutation({
    mutationFn: () => addProClubTeam(clubId!, teamToLink),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pro-club-teams", clubId] });
      setTeamToLink("");
      toast({ title: "Team linked", description: "The team is now part of your club workspace." });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not link team",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const teams = clubTeamLinks.map(mapTeamLink);
  const academy = academyProfiles.map(mapAcademyProfile);
  const totalMembers = teams.reduce((sum, t) => sum + t.members, 0);

  const club = activeClubRow
    ? {
        name: activeClubRow.name,
        founded: activeClubRow.createdAt
          ? new Date(activeClubRow.createdAt).getFullYear()
          : new Date().getFullYear(),
        location: activeClubRow.location ?? "—",
        members: totalMembers,
        teams: teams.length,
        trophies: 0,
      }
    : null;

  const linkedTeamIds = new Set(clubTeamLinks.map((l) => l.teamId));
  const linkableTeams = myTeams.filter(
    (t) =>
      !linkedTeamIds.has(t.id) &&
      (t.myRole === "captain" || t.myRole === "co_captain" || t.myRole === "admin"),
  );

  if (clubsLoading) {
    return (
      <PageShell title="Club & Academy" subtitle="Loading your club workspace…">
        <Card>
          <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", margin: 0 }}>
            Loading…
          </p>
        </Card>
      </PageShell>
    );
  }

  if (!activeClubRow && canEdit) {
    return (
      <PageShell
        title="Club & Academy"
        subtitle="Create your multi-team club workspace on SURNA Pro."
      >
        <Card>
          <h3 style={{ marginTop: 0 }}>Set up your club</h3>
          <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)" }}>
            Link teams, academy profiles, and announcements under one club.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <Input
              value={newClubName}
              onChange={(e) => setNewClubName(e.target.value)}
              placeholder="Club name"
            />
            <Input
              value={newClubLocation}
              onChange={(e) => setNewClubLocation(e.target.value)}
              placeholder="City or region"
            />
            <Button
              variant="primary"
              leadingIcon={<Plus size={14} />}
              disabled={!newClubName.trim() || createClubMutation.isPending || !user?.id}
              onClick={() => createClubMutation.mutate()}
            >
              {createClubMutation.isPending ? "Creating…" : "Create club"}
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!activeClubRow) {
    return (
      <PageShell title="Club & Academy" subtitle="Multi-team club workspace on SURNA Pro.">
        <EmptyState
          icon={<Building2 size={18} />}
          title="No club workspace"
          description="Create a club from Team Pro to link squads, academy profiles, and club-wide updates."
          action={
            canEdit ? (
              <Button variant="primary" href={ROUTES.subscribe}>
                Get Team Pro
              </Button>
            ) : undefined
          }
        />
      </PageShell>
    );
  }

  if (!club) return null;

  const LinkTeamPanel = canEdit ? (
    <Card>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Link a team</h3>
      <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", marginTop: 0 }}>
        Connect squads you captain or admin under this club.
      </p>
      {linkableTeams.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-sm)", margin: 0 }}>
            {myTeams.length === 0
              ? "Create a team first, then link it here."
              : "All of your managed teams are already linked."}
          </p>
          <Button variant="secondary" size="sm" href={ROUTES.createTeam}>
            Create team
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <select
            value={teamToLink}
            onChange={(e) => setTeamToLink(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--pro-surface-2)",
              border: "1px solid var(--pro-border)",
              color: "var(--pro-text)",
            }}
          >
            <option value="">Select a team…</option>
            {linkableTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.sport}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={13} />}
            disabled={!teamToLink || linkTeamMutation.isPending}
            onClick={() => linkTeamMutation.mutate()}
          >
            {linkTeamMutation.isPending ? "Linking…" : "Link team"}
          </Button>
        </div>
      )}
    </Card>
  ) : null;

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
          {canEdit && (
            <Button variant="secondary" size="sm" fullWidth leadingIcon={<Plus size={13} />} onClick={() => setTab("teams")}>
              Link team
            </Button>
          )}
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
          {canEdit && <Button variant="primary" leadingIcon={<Plus size={14} />} onClick={() => setTab("teams")}>Link team</Button>}
        </>
      }
      rightPanel={RightPanel}
    >
      <ContextBar
        context={canEdit
          ? <>This is your club's command center. Add teams, develop academy talent, manage staff and post club-wide updates.</>
          : <>Public-facing view of {club.name}. Owners and admins can edit teams, academy, staff and club-wide settings.</>}
        actions={[
          { key: "add-team",       label: "Link team",      icon: <Plus size={12} />,         variant: "primary", disabled: !canEdit, hidden: !canEdit, onClick: () => setTab("teams") },
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
        <StatCard label="Teams"     value={club.teams}    icon={<Shield size={12} />} />
        <StatCard label="Members"   value={club.members}  icon={<Users size={12} />} />
        <StatCard label="Academy"   value={academy.length} icon={<GraduationCap size={12} />} />
        <StatCard label="Trophies"  value={club.trophies} icon={<Trophy size={12} />} />
      </div>

      <Tabs<ClubTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "overview",      label: "Overview" },
          { key: "teams",         label: "Teams",         icon: <Shield size={13} />,        count: teams.length },
          { key: "academy",       label: "Academy",       icon: <GraduationCap size={13} />, count: academy.length },
          { key: "staff",         label: "Staff",         icon: <Users size={13} /> },
          { key: "announcements", label: "Announcements", icon: <Megaphone size={13} /> },
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
            {teamsLoading ? (
              <p className="pro-text-muted" style={{ padding: "14px 18px", fontSize: "var(--pro-fs-sm)" }}>Loading teams…</p>
            ) : teams.filter((t) => t.category === "Senior").length === 0 ? (
              <EmptyState
                icon={<Shield size={16} />}
                title="No senior teams linked"
                description="Link a team from the Teams tab to see it here."
                action={canEdit ? <Button variant="secondary" size="sm" onClick={() => setTab("teams")}>Link team</Button> : undefined}
              />
            ) : (
              teams.filter((t) => t.category === "Senior").map((t, i) => (
                <div key={t.id} className="pro-row" style={{
                  padding: "12px 18px", gap: 10,
                  borderTop: i === 0 ? "1px solid var(--pro-border)" : "1px solid var(--pro-border-soft)",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pro-surface-3)", color: "var(--pro-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{t.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--pro-fs-sm)" }}>{t.name}</div>
                    <div className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)" }}>{t.members} members · {t.sport}</div>
                  </div>
                  <StatusTag s={t.status} />
                  <button
                    type="button"
                    className="pro-icon-btn"
                    aria-label="Open team"
                    style={{ width: 28, height: 28 }}
                    onClick={() => setLocation(`/team/${t.id}`)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))
            )}
          </Card>

          <Card padded={false}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--pro-border)" }}>
              <h3 style={{ margin: 0 }}>Academy pathway</h3>
              <p className="pro-text-muted" style={{ fontSize: "var(--pro-fs-xs)", marginTop: 2 }}>Players closest to first-team selection</p>
            </div>
            {academyLoading ? (
              <p className="pro-text-muted" style={{ padding: "14px 18px", fontSize: "var(--pro-fs-sm)" }}>Loading academy…</p>
            ) : academy.length === 0 ? (
              <EmptyState
                icon={<GraduationCap size={16} />}
                title="No academy profiles yet"
                description="Add players from recruitment or trials to track their pathway."
                action={<Button variant="secondary" size="sm" href="/pro/recruitment">Open recruitment</Button>}
              />
            ) : (
              academy.slice(0, 4).map((p, i) => (
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
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "teams" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {LinkTeamPanel}
          {teamsLoading ? (
            <Card><p className="pro-text-muted" style={{ margin: 0 }}>Loading teams…</p></Card>
          ) : teams.length === 0 ? (
            <EmptyState
              icon={<Shield size={18} />}
              title="No teams linked yet"
              description="Link squads you manage to organize them under this club."
            />
          ) : (
            <Card padded={false}>
              <div style={{ overflowX: "auto" }}>
                <table className="pro-table">
                  <thead>
                    <tr><th>Team</th><th>Category</th><th>Sport</th><th>Members</th><th>Status</th><th style={{ width: 100 }}>Actions</th></tr>
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
                        <td className="pro-text-muted">{t.sport}</td>
                        <td className="pro-text-muted">{t.members}</td>
                        <td><StatusTag s={t.status} /></td>
                        <td>
                          <Button variant="ghost" size="sm" trailingIcon={<ArrowRight size={12} />} href={`/team/${t.id}`}>Open</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "academy" && (
        academyLoading ? (
          <Card><p className="pro-text-muted" style={{ margin: 0 }}>Loading academy…</p></Card>
        ) : academy.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={18} />}
            title="No academy profiles"
            description="Trial intakes and recruitment add players to your club pathway."
            action={<Button variant="primary" href="/pro/recruitment">Open recruitment</Button>}
          />
        ) : (
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
        )
      )}

      {tab === "staff" && (
        <EmptyState
          icon={<Users size={18} />}
          title="No staff listed yet"
          description="Club staff roles will appear here once you assign coaches and admins across linked teams."
          action={<Button variant="secondary" href="/pro/settings">Manage in settings</Button>}
        />
      )}

      {tab === "announcements" && (
        <EmptyState
          icon={<Megaphone size={18} />}
          title="No club announcements yet"
          description="Post updates for all linked teams from team workspaces, or use club-wide messaging when available."
          action={canAnnounce ? <Button variant="primary" href={ROUTES.messages}>Open messages</Button> : undefined}
        />
      )}

      {tab === "settings" && (
        <Card><EmptyState icon={<Settings size={18} />} title="Club settings" description="Branding, visibility, billing owner and admins live here." action={<Button variant="primary" href="/pro/settings">Open settings</Button>} /></Card>
      )}
    </PageShell>
  );
}
