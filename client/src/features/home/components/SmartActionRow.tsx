import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { Icon, type IconName } from "@/components/Icon";
import { Plus, X } from "lucide-react";
import { ROUTES } from "@/navigation";
import {
  markNavReturn,
  mobilePanelReturnPath,
  type MobilePanelId,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ItemId =
  | "instant"
  | "calendar"
  | "sports"
  | "challenges"
  | "venues"
  | "rewards"
  | "market"
  | "feed"
  | "coaches";

type ShortcutItem = {
  id: ItemId;
  icon: IconName;
  label: string;
  panel?: MobilePanelId;
  route?: string;
};

const ALL_ITEMS: ShortcutItem[] = [
  { id: "calendar", icon: "calendar", label: "Calendar", route: "/calendar" },
  { id: "venues", icon: "buildings", label: "Venues", panel: "venues" },
  { id: "instant", icon: "lightning", label: "Instant", route: ROUTES.instantJoin },
  { id: "sports", icon: "fire", label: "Sports", route: ROUTES.sports },
  { id: "challenges", icon: "trophy", label: "Challenges", route: ROUTES.challenges },
  { id: "rewards", icon: "gift", label: "Rewards", route: ROUTES.rewards },
  { id: "market", icon: "shopping-bag", label: "Market", route: ROUTES.marketplace },
  { id: "feed", icon: "paper-plane-right", label: "Feed", route: ROUTES.feed },
  { id: "coaches", icon: "user-circle", label: "Coaches", route: ROUTES.coaches },
];

/** Always the same four shortcuts on home — no random reordering. */
const PRIMARY_SHORTCUTS: ItemId[] = ["calendar", "instant", "challenges", "market"];

const PRO_ITEM = {
  id: "pro",
  icon: "crown" as IconName,
  label: "Pro",
} as const;

const CHIP_BG = "var(--surna-elevated)";
const CHIP_BORDER = "var(--surna-border, rgba(128, 128, 128, 0.22))";
const CHIP_ICON = "var(--surna-text)";
const BOTTOM_NAV_CLEARANCE = "calc(54px + env(safe-area-inset-bottom, 0px) + 12px)";

const ITEM_MAP = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i])) as Record<ItemId, ShortcutItem>;

interface SmartActionRowProps {
  onProPress?: () => void;
  onSheetOpenChange?: (open: boolean) => void;
  onPanelSelect?: (panel: MobilePanelId) => void;
}

function MoreBottomSheet({
  isDark,
  onSelect,
  onProPress,
  onClose,
}: {
  isDark: boolean;
  onSelect: (item: ShortcutItem) => void;
  onProPress?: () => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 12);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const pick = (item: ShortcutItem) => {
    setVisible(false);
    setTimeout(() => onSelect(item), 280);
  };

  const pickPro = () => {
    setVisible(false);
    setTimeout(() => onProPress?.(), 280);
  };

  return (
    <div
      className="fixed inset-0 z-[80]"
      style={{
        background: `rgba(0,0,0,${visible ? 0.55 : 0})`,
        transition: "background 260ms ease",
      }}
      onClick={close}
    >
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto",
          "bg-card text-card-foreground border-t border-border",
          "rounded-t-3xl shadow-2xl",
        )}
        style={{
          paddingBottom: BOTTOM_NAV_CLEARANCE,
          transform: `translateY(${visible ? 0 : "100%"})`,
          transition: "transform 300ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-5 mb-4">
          <div>
            <p className="text-lg font-bold text-foreground">Quick links</p>
            <p className="text-xs text-muted-foreground mt-0.5">Jump to any part of SURNA</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Close"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 px-4 pb-2">
          {ALL_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => pick(item)}
              className="flex flex-col items-center gap-2 rounded-2xl p-3 bg-muted/50 active:scale-[0.97] transition-transform"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: CHIP_BG, border: `1px solid ${CHIP_BORDER}` }}
              >
                <Icon name={item.icon} size="md" weight="regular" color={CHIP_ICON} />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">{item.label}</span>
            </button>
          ))}
          {onProPress && (
            <button
              type="button"
              onClick={pickPro}
              className="flex flex-col items-center gap-2 rounded-2xl p-3 bg-muted/50 active:scale-[0.97] transition-transform border border-border"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: CHIP_BG, border: `1px solid ${CHIP_BORDER}` }}
              >
                <Icon name={PRO_ITEM.icon} size="md" weight="fill" color={CHIP_ICON} />
              </div>
              <span className="text-xs font-semibold text-foreground">{PRO_ITEM.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SmartActionRow({ onProPress, onSheetOpenChange, onPanelSelect }: SmartActionRowProps) {
  const [, setLocation] = useLocation();
  const { isDark } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  useEffect(() => {
    onSheetOpenChange?.(showMore);
  }, [showMore, onSheetOpenChange]);

  const openShortcut = (item: ShortcutItem) => {
    if (item.panel) {
      if (onPanelSelect) {
        onPanelSelect(item.panel);
        return;
      }
      setLocation(mobilePanelReturnPath(item.panel));
      return;
    }

    if (item.route) {
      markNavReturn("/");
      setLocation(item.route);
    }
  };

  const openMore = () => setShowMore(true);
  const closeMore = () => setShowMore(false);

  return (
    <>
      <div className="flex items-stretch gap-2 px-4">
        {PRIMARY_SHORTCUTS.map((id) => {
          const item = ITEM_MAP[id];
          if (!item) return null;
          const isPressed = pressedId === id;

          return (
            <button
              key={id}
              type="button"
              onPointerDown={() => setPressedId(id)}
              onPointerUp={() => setPressedId(null)}
              onPointerLeave={() => setPressedId(null)}
              onClick={() => openShortcut(item)}
              className={cn(
                "flex-1 min-w-0 h-11 rounded-2xl flex items-center justify-center border active:scale-[0.96] transition-transform",
                isPressed && "scale-[0.96]",
              )}
              style={{
                background: CHIP_BG,
                borderColor: CHIP_BORDER,
              }}
              aria-label={item.label}
              title={item.label}
            >
              <Icon name={item.icon} size="md" weight="regular" color={CHIP_ICON} />
            </button>
          );
        })}

        {onProPress && (
          <button
            type="button"
            onPointerDown={() => setPressedId("pro")}
            onPointerUp={() => setPressedId(null)}
            onPointerLeave={() => setPressedId(null)}
            onClick={() => onProPress()}
            className={cn(
              "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
              "border active:scale-[0.96] transition-transform",
              pressedId === "pro" && "scale-[0.96]",
            )}
            style={{ background: CHIP_BG, borderColor: CHIP_BORDER }}
            aria-label="SURNA Pro"
            title="Pro"
            data-testid="button-open-pro"
          >
            <Icon name="crown" size="md" weight="fill" color={CHIP_ICON} />
          </button>
        )}

        <button
          type="button"
          onPointerDown={() => setPressedId("more")}
          onPointerUp={() => setPressedId(null)}
          onPointerLeave={() => setPressedId(null)}
          onClick={openMore}
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center",
            "bg-muted/50 border border-border/50 active:scale-[0.96] transition-transform",
            pressedId === "more" && "scale-[0.96]",
          )}
          aria-label="More features"
          title="More"
        >
          <Plus size={18} className="text-muted-foreground" />
        </button>
      </div>

      {showMore && (
        <MoreBottomSheet
          isDark={isDark}
          onSelect={openShortcut}
          onProPress={onProPress}
          onClose={closeMore}
        />
      )}
    </>
  );
}
