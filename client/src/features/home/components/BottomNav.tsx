import { Icon } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { MOBILE_SHELL_PANELS } from "@/features/home/constants/mobilePanels";

interface BottomNavProps {
  activeIndex?: number;
  onNavClick?: (index: number) => void;
  hidden?: boolean;
  onInstantJoin?: () => void;
}

function hapticLight() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export function BottomNav({
  activeIndex = 0,
  onNavClick,
  hidden = false,
}: BottomNavProps) {
  return (
    <nav
      className="surna-bottom-nav"
      style={{
        transform: hidden ? "translateY(120px)" : "translateY(0)",
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
      }}
      aria-label="Main navigation"
    >
      {MOBILE_SHELL_PANELS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              hapticLight();
              onNavClick?.(index);
            }}
            className={cn("nav-item", isActive && "active")}
            aria-current={isActive ? "page" : undefined}
            aria-label={tab.label}
          >
            <Icon
              name={tab.icon}
              size="md"
              weight={isActive ? "fill" : "regular"}
              className="leading-none"
            />
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
