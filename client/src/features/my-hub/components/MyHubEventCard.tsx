import { useState } from "react";
import { Link } from "wouter";
import {
  Calendar,
  MapPin,
  Users,
  Pencil,
  Share2,
  MessageCircle,
  Eye,
  XCircle,
  ChevronRight,
  BarChart3,
  Repeat,
  Bell,
  Megaphone,
  ShieldCheck,
  Send,
} from "lucide-react";
import { LockedAction } from "./LockedAction";
import { StatusPill } from "./StatusPill";

export interface MyHubEvent {
  id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  visibility?: string | null;
  capacity?: number | null;
  cover_url?: string | null;
  cover_thumb_url?: string | null;
  going_count?: number;
  interested_count?: number;
  chat_group_id?: string | null;
  featured_highlight_ids?: string[];
}

interface Props {
  ev: MyHubEvent;
  variant: "upcoming" | "past" | "drafts" | "cancelled";
  onEdit: (ev: MyHubEvent) => void;
  onCancel: (ev: MyHubEvent) => void;
  onShare: (ev: MyHubEvent) => void;
  onManageHighlights?: (ev: MyHubEvent) => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MyHubEventCard({ ev, variant, onEdit, onCancel, onShare, onManageHighlights }: Props) {
  const [proOpen, setProOpen] = useState(false);
  const cover = ev.cover_thumb_url || ev.cover_url || null;
  const going = ev.going_count ?? 0;
  const interested = ev.interested_count ?? 0;
  const isPast = variant === "past";
  const isCancelled = variant === "cancelled";
  const isDraft = variant === "drafts";

  const statusLabel =
    variant === "upcoming"
      ? ev.visibility === "private"
        ? "Private"
        : "Live"
      : isPast
      ? "Past"
      : isDraft
      ? "Draft"
      : "Cancelled";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--surna-elevated)",
        border: "1px solid var(--surna-border)",
      }}
      data-testid={`my-hub-event-${ev.id}`}
    >
      {/* Top row */}
      <div className="p-4 flex gap-3">
        <div
          className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--surna-bg-highlight)" }}
        >
          {cover ? (
            <img
              src={cover}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Calendar
              className="w-6 h-6"
              style={{ color: "var(--surna-text-secondary)" }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-semibold leading-snug line-clamp-2"
              style={{ color: "var(--surna-text)" }}
            >
              {ev.title}
            </h3>
            <div className="flex-shrink-0" data-testid={`event-status-${ev.id}`}>
              <StatusPill
                label={statusLabel}
                tone={isCancelled || isDraft || isPast ? "default" : "alert"}
              />
            </div>
          </div>
          <div
            className="flex items-center gap-1 mt-1 text-[11px]"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            <Calendar className="w-3 h-3" />
            <span className="truncate">{formatDateTime(ev.starts_at)}</span>
          </div>
          {ev.location && (
            <div
              className="flex items-center gap-1 mt-0.5 text-[11px]"
              style={{ color: "var(--surna-text-secondary)" }}
            >
              <MapPin className="w-3 h-3" />
              <span className="truncate">{ev.location}</span>
            </div>
          )}
          <div
            className="flex items-center gap-1 mt-0.5 text-[11px]"
            style={{ color: "var(--surna-text-muted)" }}
          >
            <Users className="w-3 h-3" />
            <span>
              {going} going{interested ? ` · ${interested} interested` : ""}
              {ev.capacity ? ` · cap ${ev.capacity}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div
        className="px-3 py-2 flex items-center gap-1 overflow-x-auto"
        style={{ borderTop: "0.5px solid var(--surna-border)" }}
      >
        <Link href={`/events/${ev.id}`}>
          <ActionChip icon={Eye} label="Open" testId={`event-open-${ev.id}`} />
        </Link>
        {!isPast && !isCancelled && (
          <ActionChip
            icon={Pencil}
            label="Edit"
            onClick={() => onEdit(ev)}
            testId={`event-edit-${ev.id}`}
          />
        )}
        <Link href={`/events/${ev.id}#attendees`}>
          <ActionChip icon={Users} label="Attendees" testId={`event-attendees-${ev.id}`} />
        </Link>
        <ActionChip
          icon={Share2}
          label="Share"
          onClick={() => onShare(ev)}
          testId={`event-share-${ev.id}`}
        />
        <Link href={ev.chat_group_id ? `/messages?groupId=${encodeURIComponent(ev.chat_group_id)}` : `/events/${ev.id}`}>
          <ActionChip icon={MessageCircle} label="Chat" testId={`event-chat-${ev.id}`} />
        </Link>
        {!isPast && !isCancelled && onManageHighlights && (
          <ActionChip
            icon={Megaphone}
            label="Highlights"
            onClick={() => onManageHighlights(ev)}
            testId={`event-highlights-${ev.id}`}
          />
        )}
        {!isPast && !isCancelled && (
          <ActionChip
            icon={XCircle}
            label="Cancel"
            tone="danger"
            onClick={() => onCancel(ev)}
            testId={`event-cancel-${ev.id}`}
          />
        )}
      </div>

      {/* Pro tools */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "0.5px solid var(--surna-border)" }}
      >
        <button
          onClick={() => setProOpen((v) => !v)}
          className="w-full flex items-center justify-between text-[12px] font-semibold"
          style={{ color: "var(--surna-text-secondary)" }}
          data-testid={`event-pro-toggle-${ev.id}`}
        >
          <span>Pro tools</span>
          <ChevronRight
            className="w-4 h-4 transition-transform"
            style={{ transform: proOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>
        {proOpen && (
          <div className="mt-3 space-y-2" data-testid={`event-pro-actions-${ev.id}`}>
            <LockedAction
              icon={BarChart3}
              label="Event analytics"
              description="Attendance trends, no-shows, conversions"
              featureKey="events.analytics"
              fromSurface="my-hub-events"
              testId={`event-locked-analytics-${ev.id}`}
            />
            <LockedAction
              icon={Repeat}
              label="Recurring & series"
              description="Run weekly leagues without rebuilding"
              featureKey="events.recurring"
              fromSurface="my-hub-events"
              testId={`event-locked-recurring-${ev.id}`}
            />
            <LockedAction
              icon={Bell}
              label="Automated reminders"
              description="Nudge attendees before kickoff"
              featureKey="events.reminders"
              fromSurface="my-hub-events"
              testId={`event-locked-reminders-${ev.id}`}
            />
            <LockedAction
              icon={Send}
              label="Bulk messaging"
              description="Message all attendees at once"
              featureKey="events.bulkMessaging"
              fromSurface="my-hub-events"
              testId={`event-locked-bulk-${ev.id}`}
            />
            <LockedAction
              icon={ShieldCheck}
              label="Advanced organizer roles"
              description="Co-hosts, scanners, finance leads"
              featureKey="events.organizerRoles"
              fromSurface="my-hub-events"
              testId={`event-locked-roles-${ev.id}`}
            />
            <LockedAction
              icon={Megaphone}
              label="Promote this event"
              description="Boost visibility on the discover map"
              featureKey="events.promote"
              fromSurface="my-hub-events"
              testId={`event-locked-promote-${ev.id}`}
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
