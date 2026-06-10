import { useEffect } from "react";
import { X, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import NotificationsPanel from "./NotificationsPanel";

interface NotificationPeekSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPeekSheet({ open, onClose }: NotificationPeekSheetProps) {
  const [, navigate] = useLocation();
  const unreadCount = useUnreadNotificationCount(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[480px] flex-col overflow-hidden"
        style={{
          background: "var(--surna-bg-elevated)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "78dvh",
          boxShadow: "0 -4px 40px rgba(0,0,0,0.35)",
          animation: "notifPeekUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5">
          <div
            className="h-1 w-9 rounded-full"
            style={{ background: "var(--surna-separator)" }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pt-2 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Bell size={17} style={{ color: "var(--surna-text)" }} />
            <span className="text-[15px] font-bold truncate" style={{ color: "var(--surna-text)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
                style={{ background: "var(--surna-story-ring, #DC2626)" }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full active:scale-95"
            style={{ background: "var(--surna-bg-highlight)" }}
          >
            <X size={15} style={{ color: "var(--surna-text-secondary)" }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <NotificationsPanel
            compact
            peekCount={8}
            onSeeAll={() => {
              onClose();
              navigate("/notifications");
            }}
          />
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
