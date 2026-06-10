import { useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROUTES } from '@/navigation/routes';
import { getQueryFn } from '@/lib/queryClient';
import { useProEntitlement, isProEntitlementActive } from '@/hooks/useProEntitlement';
import {
  User,
  Settings,
  Moon,
  Sun,
  Bell,
  Shield,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Bookmark,
  Trophy,
  BarChart3,
  LayoutGrid,
  Crown,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type MenuItem = {
  icon: LucideIcon;
  label: string;
  description?: string;
  path: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

export default function LeftDrawer({ isOpen, onClose }: LeftDrawerProps) {
  const { user } = useAuth() as { user: any };
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  const userId = user?.id as string | undefined;

  const { data: userStats } = useQuery<{
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
    primarySport?: string;
    sport?: string;
  }>({
    queryKey: [`/api/users/${userId}`],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId && isOpen,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startX.current - e.touches[0].clientX;
    if (diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${-diff}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endX = e.changedTouches[0]?.clientX ?? startX.current;
    const diff = startX.current - endX;
    if (diff > 80) onClose();
    if (drawerRef.current) drawerRef.current.style.transform = '';
  };

  const navigate = (path: string) => {
    onClose();
    setTimeout(() => setLocation(path), 150);
  };

  const displayName =
    user?.displayName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user?.email?.split('@')[0] ||
    'User';

  const username = user?.username || user?.email?.split('@')[0] || 'user';
  const sport = userStats?.primarySport || userStats?.sport;
  const { data: proEntitlement } = useProEntitlement();
  const isPro = isProEntitlementActive(proEntitlement);

  const stats = [
    { value: formatCount(userStats?.postsCount ?? 0), label: 'Posts' },
    { value: formatCount(userStats?.followersCount ?? 0), label: 'Followers' },
    { value: formatCount(userStats?.followingCount ?? 0), label: 'Following' },
  ];

  const menuSections: MenuSection[] = [
    {
      title: 'Profile',
      items: [
        { icon: User, label: 'My profile', description: 'View and edit your page', path: ROUTES.profile },
        { icon: LayoutGrid, label: 'My Hub', description: 'Events, teams, and places you manage', path: ROUTES.myHub },
        { icon: Bookmark, label: 'Saved posts', description: 'Posts you bookmarked', path: '/saved' },
      ],
    },
    {
      title: 'Activity',
      items: [
        { icon: Trophy, label: 'Achievements', description: 'Badges and milestones', path: '/gamification' },
        { icon: BarChart3, label: 'Performance', description: 'Stats and progress', path: ROUTES.performance },
        ...(isPro
          ? [{ icon: Crown, label: 'Pro dashboard', description: 'Roster, match day, and club tools', path: '/pro' }]
          : [{ icon: Crown, label: 'SURNA Pro', description: 'Unlock advanced club tools', path: '/subscribe' }]),
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Settings, label: 'Settings', description: 'Profile, privacy, and app prefs', path: ROUTES.settings },
        { icon: Bell, label: 'Notifications', description: 'Alerts and activity', path: '/notifications' },
        { icon: Shield, label: 'Privacy & security', description: 'Password and data', path: ROUTES.security },
        { icon: CreditCard, label: 'Billing', description: 'Plans and payments', path: ROUTES.billing },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & support', description: 'FAQ and contact', path: ROUTES.help },
      ],
    },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <div
        ref={drawerRef}
        className={`fixed inset-y-0 left-0 z-[95] w-full max-w-sm transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--surna-void)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Profile menu"
      >
        <div className="flex flex-col h-full">
          <div
            className="flex flex-col h-full px-4"
            style={{ paddingTop: 'max(2.5rem, calc(env(safe-area-inset-top) + 0.5rem))' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute z-10 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{
                top: 'max(0.5rem, env(safe-area-inset-top))',
                right: '0.75rem',
                color: 'var(--surna-text-secondary)',
                background: 'var(--surna-surface)',
              }}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-3 mb-4 text-left active:opacity-90 rounded-2xl p-2 -mx-2"
              onClick={() => navigate(ROUTES.profile)}
            >
              <Avatar className="w-12 h-12 shrink-0 ring-1 ring-white/10">
                <AvatarImage src={user?.profileImageUrl} alt={displayName} />
                <AvatarFallback
                  className="text-sm font-bold"
                  style={{ background: 'var(--surna-surface)', color: 'var(--surna-text)' }}
                >
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="font-semibold text-base truncate" style={{ color: 'var(--surna-text)' }}>
                  {displayName}
                </h3>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--surna-text-secondary)' }}>
                  @{username}
                </p>
                {sport && (
                  <span
                    className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--surna-elevated)', color: 'var(--surna-text-muted)' }}
                  >
                    {sport}
                  </span>
                )}
                {isPro && (
                  <span
                    className="inline-block mt-1.5 ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: 'var(--surna-text)', color: 'var(--surna-bg)' }}
                  >
                    Pro
                  </span>
                )}
              </div>
              <ChevronRight size={16} style={{ color: 'var(--surna-text-muted)' }} />
            </button>

            <div
              className="grid grid-cols-3 gap-1 w-full py-3 mb-2 rounded-2xl"
              style={{ background: 'var(--surna-surface)', border: '1px solid var(--surna-border)' }}
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center px-1">
                  <span className="text-base font-bold tabular-nums block" style={{ color: 'var(--surna-text)' }}>
                    {stat.value}
                  </span>
                  <span className="text-[11px] mt-0.5 block" style={{ color: 'var(--surna-text-secondary)' }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 pb-2">
              {menuSections.map((section) => (
                <div key={section.title} className="mb-3">
                  <p
                    className="text-[11px] font-bold uppercase tracking-wider px-2 mb-1.5"
                    style={{ color: 'var(--surna-text-muted)' }}
                  >
                    {section.title}
                  </p>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--surna-surface)', border: '1px solid var(--surna-border)' }}
                  >
                    {section.items.map((item, iIdx) => (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors active:opacity-90 min-h-[52px]"
                        style={{
                          color: 'var(--surna-text)',
                          borderTop: iIdx > 0 ? '1px solid var(--surna-border)' : undefined,
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--surna-elevated)' }}
                        >
                          <item.icon size={17} style={{ color: 'var(--surna-text-secondary)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          {item.description && (
                            <span className="block text-[11px] truncate mt-0.5" style={{ color: 'var(--surna-text-muted)' }}>
                              {item.description}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--surna-text-muted)' }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mb-3">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider px-2 mb-1.5"
                  style={{ color: 'var(--surna-text-muted)' }}
                >
                  Appearance
                </p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surna-surface)', border: '1px solid var(--surna-border)' }}
                >
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-3 min-h-[52px]"
                    style={{ color: 'var(--surna-text)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surna-elevated)' }}
                    >
                      {theme === 'dark' ? (
                        <Sun size={17} style={{ color: 'var(--surna-text-secondary)' }} />
                      ) : (
                        <Moon size={17} style={{ color: 'var(--surna-text-secondary)' }} />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="block text-sm font-semibold">
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                      </span>
                      <span className="block text-[11px] mt-0.5" style={{ color: 'var(--surna-text-muted)' }}>
                        Tap to switch theme
                      </span>
                    </div>
                    <div
                      className="w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0"
                      style={{ background: theme === 'dark' ? 'var(--surna-text)' : 'var(--surna-elevated)', border: '1px solid var(--surna-border)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-full absolute top-0.5 transition-all duration-200"
                        style={{
                          background: theme === 'dark' ? 'var(--surna-base)' : 'var(--surna-text)',
                          left: theme === 'dark' ? '20px' : '2px',
                        }}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => { window.location.href = '/api/logout'; }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--surna-surface)',
                  color: 'var(--surna-text-secondary)',
                  border: '1px solid var(--surna-border)',
                }}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
