import { useEffect } from "react";
import {
  X,
  Settings,
  User,
  Users,
  Calendar,
  MapPin,
  ShoppingBag,
  MessageCircle,
  HelpCircle,
  Info,
  Sun,
  Moon,
  LogOut,
  Map,
  PlusCircle,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { logout } from "@/lib/auth";
import { ROUTES } from "@/navigation";
import { mapPath } from "@/lib/mapNavigation";

type FeedMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Settings;
  path: string;
};

const DISCOVER_ITEMS: MenuItem[] = [
  { id: "teams", label: "Teams", icon: Users, path: ROUTES.teams },
  { id: "events", label: "Events", icon: Calendar, path: ROUTES.events },
  { id: "map", label: "Map", icon: Map, path: mapPath() },
  { id: "places", label: "Places", icon: MapPin, path: ROUTES.places },
  { id: "shop", label: "Marketplace", icon: ShoppingBag, path: ROUTES.marketplace },
  { id: "messages", label: "Messages", icon: MessageCircle, path: ROUTES.messages },
];

const SUPPORT_ITEMS: MenuItem[] = [
  { id: "help", label: "Help", icon: HelpCircle, path: ROUTES.help },
  { id: "about", label: "About SURNA", icon: Info, path: ROUTES.about },
];

function MenuRow({
  item,
  onPick,
}: {
  item: MenuItem;
  onPick: (path: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(item.path)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:scale-[0.98] transition-transform"
      style={{ background: "var(--surna-bg-highlight)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--surna-bg-press)" }}
      >
        <Icon size={17} style={{ color: "var(--surna-text)" }} />
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
        {item.label}
      </span>
    </button>
  );
}

export function FeedMenuSheet({ open, onClose, onNavigate }: FeedMenuSheetProps) {
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const go = (path: string) => {
    onClose();
    onNavigate(path);
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } catch {
      window.location.href = "/landing";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] overflow-hidden"
        style={{
          background: "var(--surna-bg-elevated)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "82dvh",
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

        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <h2 className="text-base font-bold" style={{ color: "var(--surna-text)" }}>
            Menu
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full active:scale-95 transition-transform"
            style={{ background: "var(--surna-bg-highlight)" }}
          >
            <X size={16} style={{ color: "var(--surna-text-secondary)" }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] space-y-5">
          <div className="space-y-2">
            <p
              className="px-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--surna-text-muted)" }}
            >
              Account
            </p>
            <MenuRow item={{ id: "profile", label: "My profile", icon: User, path: ROUTES.profile }} onPick={go} />
            <MenuRow item={{ id: "settings", label: "Settings", icon: Settings, path: ROUTES.settings }} onPick={go} />
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left active:scale-[0.98] transition-transform"
              style={{ background: "var(--surna-bg-highlight)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--surna-bg-press)" }}
                >
                  {isDark ? (
                    <Sun size={17} style={{ color: "var(--surna-text)" }} />
                  ) : (
                    <Moon size={17} style={{ color: "var(--surna-text)" }} />
                  )}
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--surna-text)" }}>
                  {isDark ? "Light mode" : "Dark mode"}
                </span>
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--surna-text-muted)" }}>
                {isDark ? "On" : "Off"}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <p
              className="px-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--surna-text-muted)" }}
            >
              Create
            </p>
            <MenuRow
              item={{ id: "create", label: "Create on SURNA", icon: PlusCircle, path: ROUTES.create }}
              onPick={go}
            />
          </div>

          <div className="space-y-2">
            <p
              className="px-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--surna-text-muted)" }}
            >
              Discover
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DISCOVER_ITEMS.map((item) => (
                <MenuRow key={item.id} item={item} onPick={go} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p
              className="px-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--surna-text-muted)" }}
            >
              Support
            </p>
            {SUPPORT_ITEMS.map((item) => (
              <MenuRow key={item.id} item={item} onPick={go} />
            ))}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
            style={{
              background: "var(--surna-accent-soft)",
              color: "var(--surna-accent)",
            }}
          >
            <LogOut size={16} />
            Log out
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
