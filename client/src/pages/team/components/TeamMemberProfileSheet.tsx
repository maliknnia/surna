import { User, Users, X } from "lucide-react";
import { createPortal } from "react-dom";

export type TeamMemberRow = {
  id: string;
  userId: string;
  role?: string | null;
  gamesPlayed?: number | null;
  skillLevel?: string | null;
  user?: {
    id?: string;
    username?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
    sport?: string | null;
  } | null;
};

function memberName(member: TeamMemberRow): string {
  const u = member.user;
  if (u?.displayName?.trim()) return u.displayName.trim();
  if (u?.username?.trim()) return u.username.trim();
  const full = `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim();
  return full || "Member";
}

function memberAvatar(member: TeamMemberRow): string | null {
  return member.user?.profileImageUrl ?? null;
}

export default function TeamMemberProfileSheet({
  open,
  member,
  teamName,
  onClose,
  onPersonalProfile,
  onTeamProfile,
}: {
  open: boolean;
  member: TeamMemberRow | null;
  teamId: string;
  teamName?: string;
  onClose: () => void;
  onPersonalProfile: (userId: string) => void;
  onTeamProfile: (userId: string) => void;
}) {
  if (!open || !member) return null;

  const userId = member.userId || member.user?.id;
  if (!userId) return null;

  const name = memberName(member);
  const avatar = memberAvatar(member);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-5 pb-8 bg-background border-t border-border animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted/40 shrink-0">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Users size={22} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold text-foreground truncate">{name}</h3>
              <p className="text-[13px] text-muted-foreground capitalize">{member.role || "member"}</p>
              {teamName ? (
                <p className="text-[12px] text-muted-foreground mt-0.5 truncate">Plays for {teamName}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/40 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onPersonalProfile(userId)}
            className="w-full h-12 rounded-2xl px-4 flex items-center gap-3 bg-muted/30 text-foreground font-semibold text-[14px] active:scale-[0.98] transition-transform"
          >
            <User size={18} />
            <span className="text-left">
              <span className="block">Personal profile</span>
              <span className="block text-[11px] font-normal text-muted-foreground">Main Surna page & posts</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTeamProfile(userId)}
            className="w-full h-12 rounded-2xl px-4 flex items-center gap-3 bg-muted/30 text-foreground font-semibold text-[14px] active:scale-[0.98] transition-transform"
          >
            <Users size={18} />
            <span className="text-left">
              <span className="block">Team roster profile</span>
              <span className="block text-[11px] font-normal text-muted-foreground">Role & stats on this team</span>
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
