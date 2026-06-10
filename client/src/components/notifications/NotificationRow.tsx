import { useState } from "react";
import { Check, Trash2, ChevronDown } from "lucide-react";
import type { NotifAction, SurnaNotification } from "@/lib/notifications";
import { accentColor } from "@/lib/notifications";

type NotificationRowProps = {
  notif: SurnaNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAction: (notif: SurnaNotification, action: NotifAction) => void;
  onOpen: (notif: SurnaNotification) => void;
};

function AvatarBubble({ notif }: { notif: SurnaNotification }) {
  const color = notif.avatarColor;
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: `${color}18`,
        border: `2px solid ${color}40`,
        color,
      }}
    >
      {notif.avatarEmoji || notif.avatar}
      {!notif.read && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2"
          style={{
            background: accentColor(notif.accent),
            borderColor: "var(--surna-bg-elevated)",
          }}
        />
      )}
    </div>
  );
}

export function NotificationRow({
  notif,
  onRead,
  onDismiss,
  onAction,
  onOpen,
}: NotificationRowProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {swipeX > 30 && (
        <div
          className="absolute inset-y-0 left-0 z-0 flex items-center pl-3"
          style={{ width: swipeX, background: "rgba(48,209,88,0.15)" }}
        >
          <Check size={16} className="text-[#30D158]" />
        </div>
      )}
      {swipeX < -30 && (
        <div
          className="absolute inset-y-0 right-0 z-0 flex items-center justify-end pr-3"
          style={{ width: -swipeX, background: "rgba(255,69,58,0.15)" }}
        >
          <Trash2 size={16} className="text-[#FF453A]" />
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        className="relative z-[1] mb-2 rounded-2xl px-3.5 py-3 transition-transform active:scale-[0.99]"
        style={{
          transform: `translateX(${swipeX}px)`,
          background: notif.read ? "transparent" : "var(--surna-bg-highlight)",
          border: `1px solid ${notif.read ? "transparent" : "var(--surna-border)"}`,
        }}
        onClick={() => onOpen(notif)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(notif);
          }
        }}
        onTouchStart={(e) => setStartX(e.touches[0].clientX)}
        onTouchMove={(e) => {
          if (startX !== null) setSwipeX(e.touches[0].clientX - startX);
        }}
        onTouchEnd={() => {
          if (swipeX > 60) onRead(notif.id);
          else if (swipeX < -60) onDismiss(notif.id);
          setSwipeX(0);
          setStartX(null);
        }}
      >
        <div className="flex items-start gap-3">
          <AvatarBubble notif={notif} />
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-[13px] font-bold" style={{ color: "var(--surna-text)" }}>
                {notif.title}
              </span>
              {notif.grouped && notif.groupCount != null && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((v) => !v);
                  }}
                  className="ml-auto flex items-center gap-0.5 text-[11px] font-semibold"
                  style={{ color: "var(--surna-text-muted)" }}
                >
                  {notif.groupCount}
                  <ChevronDown
                    size={12}
                    style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
                  />
                </button>
              )}
            </div>
            <p className="text-[13px] leading-snug line-clamp-2" style={{ color: "var(--surna-text-secondary)" }}>
              {notif.body}
            </p>
            <span className="mt-1 block text-[11px]" style={{ color: "var(--surna-text-muted)" }}>
              {notif.time}
            </span>

            {notif.actions && notif.actions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {notif.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(notif, action);
                    }}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-bold active:scale-95 transition-transform"
                    style={
                      action.variant === "primary"
                        ? { background: "var(--surna-text)", color: "var(--surna-base)" }
                        : {
                            background: "var(--surna-bg-press)",
                            color: "var(--surna-text)",
                            border: "1px solid var(--surna-border)",
                          }
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
