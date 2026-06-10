import { useState } from "react";
import { Link } from "wouter";
import {
  Users,
  Pencil,
  MessageCircle,
  Eye,
  ChevronRight,
  Megaphone,
  UserCheck,
  ShieldCheck,
  BarChart3,
  ListChecks,
  CalendarRange,
  Bell,
  Filter,
  LayoutDashboard,
  Trophy,
} from "lucide-react";
import { LockedAction } from "./LockedAction";
import { StatusPill } from "./StatusPill";

export interface MyHubTeam {
  id: string;
  name: string;
  slug?: string | null;
  sport?: string | null;
  location?: string | null;
  city?: string | null;
  logo?: string | null;
  cover?: string | null;
  description?: string | null;
  isPublic?: boolean | null;
  captainId?: string | null;
  currentMembers?: number | null;
  maxMembers?: number | null;
  myRole?: string | null;
  pendingRequestsCount?: number;
  lastActivityAt?: string | null;
}

interface Props {
  team: MyHubTeam;
  onEdit: (team: MyHubTeam) => void;
  onPostUpdate: (team: MyHubTeam) => void;
  onReviewRequests: (team: MyHubTeam) => void;
  canEdit: boolean;
}

function formatRelative(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export function MyHubTeamCard({ team, onEdit, onPostUpdate, onReviewRequests, canEdit }: Props) {
  const [proOpen, setProOpen] = useState(false);
  const members = team.currentMembers ?? 0;
  const cap = team.maxMembers ?? null;
  const pending = team.pendingRequestsCount ?? 0;
  const role = team.myRole ?? "member";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid={`my-hub-team-${team.id}`}
    >
      {/* Top row */}
      <div className="p-4 flex gap-3">
        <div
          className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          {team.logo ? (
            <img
              src={team.logo}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Trophy className="w-6 h-6" style={{ color: "var(--surna-text-secondary)" }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-semibold leading-snug line-clamp-2"
              style={{ color: "var(--surna-text)" }}
            >
              {team.name}
            </h3>
            <div className="flex-shrink-0 flex items-center gap-1.5" data-testid={`team-role-${team.id}`}>
              {pending > 0 && <StatusPill count={pending} label="pending" tone="alert" />}
              <StatusPill label={role.replace("-", " ")} />
            </div>
          </div>
          {team.sport && (
            <div
              className="flex items-center gap-1 mt-1 text-[11px]"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              <Trophy className="w-3 h-3" />
              <span className="truncate">{team.sport}</span>
              {team.city || team.location ? (
                <>
                  <span>·</span>
                  <span className="truncate">{team.city || team.location}</span>
                </>
              ) : null}
            </div>
          )}
          <div
            className="flex items-center gap-1 mt-0.5 text-[11px]"
            style={{ color: "var(--surna-text-muted)" }}
          >
            <Users className="w-3 h-3" />
            <span>
              {members}{cap ? ` / ${cap}` : ""} members · active {formatRelative(team.lastActivityAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div
        className="px-3 py-2 flex items-center gap-1 overflow-x-auto"
        style={{ borderTop: "0.5px solid var(--surna-border)" }}
      >
        <Link href={`/teams/${team.id}`}>
          <ActionChip icon={Eye} label="Open" testId={`team-open-${team.id}`} />
        </Link>
        {canEdit && (
          <ActionChip
            icon={Pencil}
            label="Edit"
            onClick={() => onEdit(team)}
            testId={`team-edit-${team.id}`}
          />
        )}
        <Link href={`/teams/${team.id}#members`}>
          <ActionChip icon={Users} label="Members" testId={`team-members-${team.id}`} />
        </Link>
        <Link href={`/messages?context=team&id=${team.id}`}>
          <ActionChip icon={MessageCircle} label="Chat" testId={`team-chat-${team.id}`} />
        </Link>
        <ActionChip
          icon={UserCheck}
          label={pending > 0 ? `Requests · ${pending}` : "Requests"}
          tone={pending > 0 ? "danger" : undefined}
          onClick={() => onReviewRequests(team)}
          testId={`team-requests-${team.id}`}
        />
        <ActionChip
          icon={Megaphone}
          label="Post"
          onClick={() => onPostUpdate(team)}
          testId={`team-post-${team.id}`}
        />
      </div>

      {/* Pro tools */}
      <div className="px-4 py-3" style={{ borderTop: "0.5px solid var(--surna-border)" }}>
        <button
          onClick={() => setProOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[12px] font-semibold"
          style={{ color: "var(--surna-text-secondary)" }}
          data-testid={`team-pro-toggle-${team.id}`}
        >
          <span>Pro tools</span>
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ transform: proOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>
        {proOpen && (
          <div className="mt-3 space-y-2" data-testid={`team-pro-actions-${team.id}`}>
            <LockedAction
              icon={ShieldCheck}
              label="Role hierarchy"
              description="Custom roles, scoped permissions"
              featureKey="teams.roles"
              fromSurface="my-hub-teams"
              testId={`team-locked-roles-${team.id}`}
            />
            <LockedAction
              icon={ListChecks}
              label="Advanced join rules"
              description="Application forms, auto-approval rules"
              featureKey="teams.joinRules"
              fromSurface="my-hub-teams"
              testId={`team-locked-joinrules-${team.id}`}
            />
            <LockedAction
              icon={BarChart3}
              label="Team analytics"
              description="Engagement, retention, performance"
              featureKey="teams.analytics"
              fromSurface="my-hub-teams"
              testId={`team-locked-analytics-${team.id}`}
            />
            <LockedAction
              icon={CalendarRange}
              label="Attendance tracking"
              description="Per-event roster + history"
              featureKey="teams.attendance"
              fromSurface="my-hub-teams"
              testId={`team-locked-attendance-${team.id}`}
            />
            <LockedAction
              icon={Bell}
              label="Recruitment & advanced announcements"
              description="Targeted recruiting + scheduled posts"
              featureKey="teams.recruitment"
              fromSurface="my-hub-teams"
              testId={`team-locked-recruit-${team.id}`}
            />
            <LockedAction
              icon={LayoutDashboard}
              label="Multi-team dashboard"
              description="Manage all your teams in one view"
              featureKey="teams.multiTeam"
              fromSurface="my-hub-teams"
              testId={`team-locked-multi-${team.id}`}
            />
            <LockedAction
              icon={Filter}
              label="Deep member filters"
              description="Filter by skill, attendance, role, more"
              featureKey="teams.memberFilters"
              fromSurface="my-hub-teams"
              testId={`team-locked-filters-${team.id}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  tone,
  testId,
}: {
  icon: typeof Eye;
  label: string;
  onClick?: () => void;
  tone?: "danger";
  testId?: string;
}) {
  const isDanger = tone === "danger";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all active:scale-95"
      style={{
        background: isDanger ? "var(--surna-text)" : "var(--surna-bg-highlight)",
        color: isDanger ? "var(--surna-bg)" : "var(--surna-text)",
      }}
      data-testid={testId}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}
