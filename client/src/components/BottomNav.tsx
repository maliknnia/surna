import { useLocation } from "wouter";
import { Icon, type IconName } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { shouldShowAppShell, isTabActive } from "@/lib/appShell";

const TABS: Array<{
  path: string;
  icon: IconName;
  label: string;
  isCenter?: boolean;
  navigateTo?: string;
}> = [
  { path: "/", icon: "house", label: "Home" },
  { path: "/search", icon: "magnifying-glass", label: "Search" },
  { path: "/create", icon: "plus", label: "", isCenter: true, navigateTo: "/create" },
  { path: "/teams", icon: "users", label: "Teams" },
  { path: "/profile", icon: "user", label: "Profile" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  if (!shouldShowAppShell(location)) return null;

  return (
    <nav
      className="surna-bottom-nav"
      aria-label="Main navigation"
    >
      <div className="surna-bottom-nav__row">
        {TABS.map((tab) => {
          const target = tab.navigateTo ?? tab.path;
          const isActive = tab.isCenter
            ? location === "/create" || location.startsWith("/events/create") || location.startsWith("/teams/create") || location.startsWith("/places/create") || location.startsWith("/challenges/create") || location.startsWith("/instant-teams/create")
            : isTabActive(location, tab.path);

          if (tab.isCenter) {
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => setLocation(target)}
                className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 border-4 border-background"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 20px rgba(124,58,237,0.45)" }}
                aria-label="Create"
              >
                <Icon name="plus" size="lg" weight="regular" className="text-white" />
              </button>
            );
          }

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => setLocation(target)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all duration-200 active:scale-95",
                isActive ? "text-surna-red" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name={tab.icon} size="md" weight={isActive ? "fill" : "regular"} />
              {tab.label ? (
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              ) : null}
              {isActive ? (
                <span className="absolute inset-0 bg-surna-red/10 rounded-xl -z-10" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
