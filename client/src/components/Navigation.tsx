import { useState, useEffect, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Icon, type IconName } from "@/components/Icon";
import SurnaLogo from "@/components/SurnaLogo";
import { ThemeToggle } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface NavigationProps {
  onMessengerClick?: () => void;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}

export default function Navigation({
  onMessengerClick,
  onMenuClick,
  onNotificationClick,
  unreadMessages = 0,
  unreadNotifications = 0,
}: NavigationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { user } = useAuth();
  const [location] = useLocation();

  const isMapPage = location === "/events";

  useEffect(() => {
    if (isMapPage) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMapPage]);

  if (isMapPage) {
    return (
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none p-4 flex justify-between items-start">
        <a
          href="/profile"
          className="pointer-events-auto relative"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/profile";
          }}
        >
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
            <img
              src={user?.profileImageUrl || ""}
              alt="Me"
              className="w-10 h-10 rounded-full object-cover bg-secondary border-2 border-background"
            />
          </div>
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-surna-red text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </a>

        <a
          href="/search"
          className="pointer-events-auto p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/search";
          }}
        >
          <Icon name="magnifying-glass" size="md" weight="regular" className="text-white" />
        </a>
      </div>
    );
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "-translate-y-full",
        "bg-background/80 backdrop-blur-xl backdrop-saturate-150 border-b border-border/50",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = "/";
          }}
        >
          <SurnaLogo size="md" showText={true} />
        </a>

        <div className="flex items-center gap-0.5">
          <NavButton active={location === "/profile"} href="/profile" icon="user" label="Profile" />
          <NavButton
            active={location === "/teams" || location.startsWith("/teams/")}
            href="/teams"
            icon="users"
            label="Teams"
          />
          <NavButton
            active={location === "/messages"}
            onClick={onMessengerClick}
            icon="chat-circle"
            label="Messages"
            badge={unreadMessages > 0 ? unreadMessages : undefined}
          />
          {onNotificationClick && (
            <NavButton
              onClick={onNotificationClick}
              icon="bell"
              label="Notifications"
              badge={unreadNotifications > 0 ? unreadNotifications : undefined}
            />
          )}
          <NavButton active={location === "/search"} href="/search" icon="shopping-bag" label="Shop" />
          <NavButton onClick={onMenuClick} icon="dots-three-vertical" label="Menu" />
          <div className="ml-1 pl-1 border-l border-border">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  active,
  href,
  onClick,
  icon,
  label,
  badge,
}: {
  active?: boolean;
  href?: string;
  onClick?: () => void;
  icon: IconName;
  label: string;
  badge?: number;
}) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (href) {
      e.preventDefault();
      window.location.href = href;
    }
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative p-2.5 rounded-xl transition-all duration-200",
        "hover:bg-accent active:scale-95",
        active && "bg-accent",
      )}
      aria-label={label}
    >
      <Icon
        name={icon}
        size="md"
        weight={active ? "fill" : "regular"}
        className={cn(
          "transition-colors",
          active ? "text-surna-red" : "text-muted-foreground hover:text-foreground",
        )}
      />

      {active && (
        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-surna-red" />
      )}

      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-surna-red text-white text-[10px] font-bold border-2 border-background">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
