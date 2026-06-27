import { useLocation, Link } from "wouter";
import { useSmartBack } from "@/lib/navigation";
import { useUserPrivacy } from "@/hooks/useUserPrivacy";
import { useMessengerSettings, useUpdateMessengerSettings } from "@/hooks/useMessengerSettings";
import {
  ArrowLeft,
  MapPin,
  User,
  Users,
  MessageCircle,
  Calendar,
  Shield,
  Eye,
  ChevronRight,
  Download,
  Trash2,
  Monitor,
  LogOut,
  Flag,
  Wallet,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { UserPrivacySettings, PrivacyAudience, FollowAudience } from "@shared/userPrivacy";
import { MAP_AUDIENCE_LABELS, MAP_LOCATION_AUDIENCES, type MapLocationAudience } from "@shared/mapSettings";

const PAGE_BG = "#121212";
const TEXT = "#ffffff";
const MUTED = "#B3B3B3";
const SECTION = "#6a6a6a";
const ROW_BORDER = "1px solid rgba(255,255,255,0.06)";

const inter = (extra?: CSSProperties): CSSProperties => ({
  fontFamily: "Inter, sans-serif",
  ...extra,
});

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pt-6 pb-2" style={inter({ fontSize: 11, fontWeight: 700, color: SECTION, letterSpacing: "0.08em", textTransform: "uppercase" })}>
      {children}
    </p>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-11 h-6 rounded-full transition-colors"
      style={{ background: checked ? "#1DB954" : "#535353" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );
}

function PrivacyRow({
  icon: Icon,
  title,
  subtitle,
  right,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5 transition-colors"
      style={{ borderBottom: ROW_BORDER }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
        <Icon size={18} color={TEXT} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={inter({ fontSize: 14, fontWeight: 600, color: TEXT })}>{title}</p>
        {subtitle && (
          <p className="mt-0.5 leading-snug" style={inter({ fontSize: 12, fontWeight: 400, color: MUTED })}>
            {subtitle}
          </p>
        )}
      </div>
      {right ?? (onClick ? <ChevronRight size={18} color={MUTED} /> : null)}
    </Wrapper>
  );
}

function AudiencePicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
          style={{
            background: value === opt.id ? "rgba(29,185,84,0.2)" : "rgba(255,255,255,0.06)",
            border: value === opt.id ? "1px solid rgba(29,185,84,0.5)" : "1px solid rgba(255,255,255,0.08)",
            color: value === opt.id ? TEXT : MUTED,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const AUDIENCE_OPTS = [
  { id: "everyone", label: "Everyone" },
  { id: "friends", label: "Friends Only" },
  { id: "nobody", label: "Nobody" },
];

export default function PrivacySettingsPage() {
  const goBack = useSmartBack({ fallback: "/settings" });
  const [, navigate] = useLocation();
  const { settings, isLoading, patch, savedFlash } = useUserPrivacy();
  const { data: messengerSettings, isLoading: messengerLoading } = useMessengerSettings();
  const updateMessenger = useUpdateMessengerSettings();

  if (isLoading || messengerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <p style={inter({ color: MUTED })}>Loading privacy settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: PAGE_BG }}>
      <header className="sticky top-0 z-40 px-4 h-14 flex items-center gap-3" style={{ background: PAGE_BG, borderBottom: ROW_BORDER }}>
        <button type="button" onClick={goBack} className="p-2 -ml-2" aria-label="Go back">
          <ArrowLeft size={20} color={TEXT} />
        </button>
        <h1 className="flex-1" style={inter({ fontSize: 17, fontWeight: 700, color: TEXT })}>
          Privacy
        </h1>
        {savedFlash && (
          <span style={inter({ fontSize: 12, fontWeight: 600, color: "#1DB954" })}>Saved</span>
        )}
      </header>

      <SectionHeader>Location privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        {MAP_LOCATION_AUDIENCES.map((aud) => (
          <PrivacyRow
            key={aud}
            icon={MapPin}
            title={MAP_AUDIENCE_LABELS[aud].title}
            subtitle={MAP_AUDIENCE_LABELS[aud].description}
            right={
              <span
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: settings.mapLocationAudience === aud && !settings.ghostMode ? "#1DB954" : "#535353",
                  background: settings.mapLocationAudience === aud && !settings.ghostMode ? "#1DB954" : "transparent",
                }}
              >
                {settings.mapLocationAudience === aud && !settings.ghostMode && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
            }
            onClick={() => void patch({ mapLocationAudience: aud as MapLocationAudience, ghostMode: false })}
          />
        ))}
        <PrivacyRow
          icon={Eye}
          title="Ghost mode"
          subtitle="Disappear from the map completely"
          right={<Toggle checked={settings.ghostMode} onChange={(v) => void patch({ ghostMode: v })} />}
        />
        <PrivacyRow
          icon={MapPin}
          title="Blur my location"
          subtitle="Show approximate position, not exact"
          right={<Toggle checked={settings.blurLocation} onChange={(v) => void patch({ blurLocation: v })} />}
        />
        <PrivacyRow
          icon={MapPin}
          title="Show when I am active"
          subtitle="Green dot on your map pin"
          right={<Toggle checked={settings.showActiveOnMap} onChange={(v) => void patch({ showActiveOnMap: v })} />}
        />
      </div>

      <SectionHeader>Profile privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can see my profile</p>
        <AudiencePicker
          value={settings.profileVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ profileVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can see my stats</p>
        <AudiencePicker
          value={settings.statsVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ statsVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can see my teams</p>
        <AudiencePicker
          value={settings.teamsVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ teamsVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Weekly training load</p>
        <AudiencePicker
          value={settings.healthWeeklyLoadVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ healthWeeklyLoadVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Monthly activity trend</p>
        <AudiencePicker
          value={settings.healthMonthlyTrendVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ healthMonthlyTrendVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Activity streak</p>
        <AudiencePicker
          value={settings.healthStreakVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ healthStreakVisibility: v as PrivacyAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Personal bests</p>
        <AudiencePicker
          value={settings.healthPersonalBestsVisibility}
          options={AUDIENCE_OPTS}
          onChange={(v) => void patch({ healthPersonalBestsVisibility: v as PrivacyAudience })}
        />
        <PrivacyRow
          icon={User}
          title="Show me in search results"
          subtitle="Appear when others search SURNA"
          right={<Toggle checked={settings.showInSearch} onChange={(v) => void patch({ showInSearch: v })} />}
        />
        <PrivacyRow
          icon={User}
          title="Show my sport and position"
          subtitle="Display on your public profile"
          right={<Toggle checked={settings.showSportAndPosition} onChange={(v) => void patch({ showSportAndPosition: v })} />}
        />
      </div>

      <SectionHeader>Social privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can follow me</p>
        <AudiencePicker
          value={settings.whoCanFollow}
          options={[
            { id: "everyone", label: "Everyone" },
            { id: "approval", label: "Approval required" },
          ]}
          onChange={(v) => void patch({ whoCanFollow: v as FollowAudience })}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can message me</p>
        <AudiencePicker value={settings.whoCanMessage} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanMessage: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can challenge me</p>
        <AudiencePicker value={settings.whoCanChallenge} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanChallenge: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can tag me in posts</p>
        <AudiencePicker value={settings.whoCanTag} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanTag: v as PrivacyAudience })} />
        <PrivacyRow
          icon={Users}
          title="Show me in People Nearby"
          subtitle="Discover tab and map people lists"
          right={<Toggle checked={settings.showInPeopleNearby} onChange={(v) => void patch({ showInPeopleNearby: v })} />}
        />
      </div>

      <SectionHeader>Event and activity privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <PrivacyRow
          icon={Calendar}
          title="Show me in attendee circles on cards"
          subtitle="Stacked faces on events, games and teams"
          right={<Toggle checked={settings.showInAttendeeLists} onChange={(v) => void patch({ showInAttendeeLists: v })} />}
        />
        <PrivacyRow
          icon={User}
          title="Show my profile photo in attendee lists"
          subtitle="When off, initials are shown instead"
          right={<Toggle checked={settings.showPhotoInAttendeeLists} onChange={(v) => void patch({ showPhotoInAttendeeLists: v })} />}
        />
        <PrivacyRow
          icon={Eye}
          title="Show my activity in feed"
          subtitle="Workouts, RSVPs and achievements"
          right={<Toggle checked={settings.showActivityInFeed} onChange={(v) => void patch({ showActivityInFeed: v })} />}
        />
        <PrivacyRow
          icon={Users}
          title="Show when I joined a team"
          subtitle="Team join announcements"
          right={<Toggle checked={settings.showTeamJoinActivity} onChange={(v) => void patch({ showTeamJoinActivity: v })} />}
        />
        <PrivacyRow
          icon={Calendar}
          title="Show when I attended an event"
          subtitle="Event attendance in activity"
          right={<Toggle checked={settings.showEventAttendance} onChange={(v) => void patch({ showEventAttendance: v })} />}
        />
      </div>

      <SectionHeader>Messenger privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <PrivacyRow
          icon={MessageCircle}
          title="Read receipts"
          subtitle="Show when you have read messages"
          right={
            <Toggle
              checked={messengerSettings?.read_receipts ?? true}
              onChange={(v) => void updateMessenger.mutate({ read_receipts: v })}
            />
          }
        />
        <PrivacyRow
          icon={Eye}
          title="Online status"
          subtitle="Show when you are active"
          right={<Toggle checked={settings.showOnlineStatus} onChange={(v) => void patch({ showOnlineStatus: v })} />}
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can add me to group chats</p>
        <AudiencePicker value={settings.whoCanAddToGroups} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanAddToGroups: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Message requests from strangers</p>
        <PrivacyRow
          icon={MessageCircle}
          title="Allow message requests"
          subtitle="People you do not follow can request to chat"
          right={
            <Toggle
              checked={messengerSettings?.allow_message_requests ?? true}
              onChange={(v) => void updateMessenger.mutate({ allow_message_requests: v })}
            />
          }
        />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can call me</p>
        <AudiencePicker
          value={messengerSettings?.call_permission ?? "following"}
          options={[
            { id: "everyone", label: "Everyone" },
            { id: "following", label: "People I follow" },
            { id: "none", label: "Nobody" },
          ]}
          onChange={(v) =>
            void updateMessenger.mutate({
              call_permission: v as "everyone" | "following" | "none",
            })
          }
        />
      </div>

      <SectionHeader>Content privacy</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can see my posts</p>
        <AudiencePicker value={settings.postsVisibility} options={AUDIENCE_OPTS} onChange={(v) => void patch({ postsVisibility: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can comment on my posts</p>
        <AudiencePicker value={settings.whoCanComment} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanComment: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can share my posts</p>
        <AudiencePicker value={settings.whoCanShare} options={AUDIENCE_OPTS} onChange={(v) => void patch({ whoCanShare: v as PrivacyAudience })} />
        <p className="px-4 pt-2 pb-1 text-[12px]" style={{ color: MUTED }}>Who can see my marketplace listings</p>
        <AudiencePicker
          value={settings.marketplaceVisibility}
          options={[
            { id: "everyone", label: "Everyone" },
            { id: "friends", label: "Friends Only" },
          ]}
          onChange={(v) => void patch({ marketplaceVisibility: v as UserPrivacySettings["marketplaceVisibility"] })}
        />
      </div>

      <SectionHeader>Payments</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <PrivacyRow
          icon={Wallet}
          title="Payment history"
          subtitle="Marketplace, bills, bookings, tournaments"
          onClick={() => navigate("/payment-history")}
        />
      </div>

      <SectionHeader>Blocking and reporting</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <PrivacyRow icon={Shield} title="Blocked users" subtitle="Manage blocked accounts" onClick={() => navigate("/security")} />
        <PrivacyRow icon={Users} title="Restricted users" subtitle="Limited profile visibility" onClick={() => navigate("/security")} />
        <PrivacyRow icon={Flag} title="Report a problem" subtitle="Safety and abuse reports" onClick={() => navigate("/security")} />
      </div>

      <SectionHeader>Data and account</SectionHeader>
      <div style={{ background: "#1a1a1a" }}>
        <PrivacyRow icon={Download} title="Download my data" subtitle="GDPR data export" onClick={() => navigate("/security")} />
        <PrivacyRow icon={Trash2} title="Delete my account" subtitle="Permanent account removal" onClick={() => navigate("/security")} />
        <PrivacyRow icon={Monitor} title="Active sessions" subtitle="Devices logged into SURNA" onClick={() => navigate("/security")} />
        <Link href="/api/auth/logout">
          <PrivacyRow icon={LogOut} title="Log out of all devices" subtitle="Sign out everywhere" />
        </Link>
      </div>
    </div>
  );
}
