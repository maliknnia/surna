import { useEffect, useState } from "react";
import { X, Lock, ChevronRight, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  type ActivityPerson,
  fetchEventPeople,
  fetchTeamPeople,
} from "@/lib/activityPeople";
import { AvatarStack } from "./AvatarStack";

export type ActivityPeopleSheetProps = {
  open: boolean;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
  kind: "team" | "event";
  entityId: string;
  title: string;
  subtitle?: string;
  route: string;
  previewPeople?: ActivityPerson[];
  /** Shown in header when known (e.g. from card). Falls back to loaded list length. */
  peopleCount?: number;
};

export function ActivityPeopleSheet({
  open,
  onClose,
  onOpenChange,
  kind,
  entityId,
  title,
  subtitle,
  route,
  previewPeople = [],
  peopleCount,
}: ActivityPeopleSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, setLocation] = useLocation();
  const [people, setPeople] = useState<ActivityPerson[]>(previewPeople);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !entityId) return;
    let cancelled = false;
    setLoading(true);
    setPeople(previewPeople);

    const load = kind === "team" ? fetchTeamPeople : fetchEventPeople;
    void load(entityId).then((list) => {
      if (!cancelled) setPeople(list);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, entityId, kind]);

  if (!open) return null;

  const sheetBg = isDark ? "#121212" : "#ffffff";
  const handleBg = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const label = kind === "team" ? "Members" : "Attending";
  const count = peopleCount ?? people.length;
  const countLabel =
    kind === "team"
      ? count === 1
        ? "1 member"
        : `${count} members`
      : count === 1
        ? "1 person going"
        : `${count} people going`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: sheetBg,
          borderRadius: "24px 24px 0 0",
          maxHeight: "min(88dvh, 720px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "notifPeekUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 5, borderRadius: 99, background: handleBg }} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "8px 16px 12px",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--surna-text-muted)",
                }}
              >
                {label}
              </span>
              {count > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                    color: "var(--surna-text)",
                  }}
                >
                  {countLabel}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--surna-text)", lineHeight: 1.25 }}>{title}</h2>
            {subtitle && (
              <p style={{ fontSize: 13, color: "var(--surna-text-secondary)", marginTop: 6, lineHeight: 1.4 }}>{subtitle}</p>
            )}
            {people.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <AvatarStack people={people} max={5} size={36} overlap={14} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} style={{ color: "var(--surna-text-muted)" }} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0 12px 8px" }}>
          {people.length > 0 && (
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--surna-text-muted)",
                padding: "4px 4px 10px",
              }}
            >
              {kind === "team" ? "Roster" : "Who's going"}
            </p>
          )}
          {loading && people.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--surna-text-muted)", fontSize: 13 }}>
              Loading…
            </div>
          ) : people.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--surna-text-muted)", fontSize: 13 }}>
              <Users size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              No one listed yet — be the first.
            </div>
          ) : (
            people.map((person) => (
              <PersonRow key={person.id} person={person} onNavigate={() => { onClose(); setLocation(`/person/${person.id}`); }} />
            ))
          )}
        </div>

        <div style={{ padding: "14px 16px calc(20px + env(safe-area-inset-bottom, 0px))", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
          <button
            type="button"
            onClick={() => {
              onClose();
              setLocation(route);
            }}
            className="w-full py-3 rounded-xl text-sm font-bold active:scale-[0.99] transition-transform"
            style={{ background: "var(--surna-text)", color: "var(--surna-base)" }}
          >
            {kind === "team" ? "Open team" : "Open event"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes notifPeekUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PersonRow({ person, onNavigate }: { person: ActivityPerson; onNavigate: () => void }) {
  const canView = !person.isPrivate;

  return (
    <button
      type="button"
      onClick={() => canView && onNavigate()}
      disabled={!canView}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:scale-[0.99]"
      style={{
        background: "var(--surna-elevated)",
        marginBottom: 8,
        opacity: canView ? 1 : 0.72,
        cursor: canView ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          background: "var(--surna-surface)",
        }}
      >
        {person.isPrivate ? (
          <div className="w-full h-full flex items-center justify-center">
            <Lock size={18} style={{ color: "var(--surna-text-muted)" }} />
          </div>
        ) : person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: "var(--surna-text-secondary)" }}>
            {person.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: "var(--surna-text)" }}>
          {person.isPrivate ? "Private profile" : person.name}
        </p>
        <p className="text-[12px] truncate" style={{ color: "var(--surna-text-muted)" }}>
          {person.isPrivate
            ? "This athlete keeps their profile private"
            : person.username
              ? `@${person.username.replace(/^@+/, "")}`
              : person.sport || person.role || "Athlete"}
        </p>
      </div>
      {canView && <ChevronRight size={18} style={{ color: "var(--surna-text-muted)", flexShrink: 0 }} />}
    </button>
  );
}
