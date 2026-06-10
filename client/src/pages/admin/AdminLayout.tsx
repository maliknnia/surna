import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  Calendar,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  Activity,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Subset of the AdminHealthPage HealthSnapshot — only the fields the indicator
// actually reads. Keeping it local avoids a circular import on the page that
// embeds this layout.
interface HealthSnapshotLite {
  degraded: boolean;
  breaches: string[];
}

function HeaderHealthIndicator() {
  // Reuses the same queryKey as AdminHealthPage so when an admin opens the
  // full dashboard the cache is shared (no double polling). The slow 60s
  // interval matches "small status dot" intent — the dashboard itself polls
  // every 15s when actually open.
  const { data, isLoading, isError } = useQuery<HealthSnapshotLite>({
    queryKey: ["/api/admin/health-metrics"],
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    // Don't blow up the header if the endpoint returns 401/500 a few times.
    retry: 1,
  });

  let color = "bg-emerald-500"; // healthy
  let label = "Healthy";
  let tooltip: string | string[] = "All SLOs within target.";

  if (isLoading && !data) {
    color = "bg-zinc-500";
    label = "Checking";
    tooltip = "Fetching health snapshot…";
  } else if (isError && !data) {
    color = "bg-amber-500";
    label = "Unknown";
    tooltip = "Health endpoint unreachable.";
  } else if (data?.degraded) {
    color = "bg-red-500";
    label = "Degraded";
    tooltip = data.breaches.length
      ? data.breaches
      : "Service degraded — open the dashboard for details.";
  }

  // The dot shows an `animate-ping` ring only when degraded so it draws the
  // eye without being distracting at rest.
  const isDegraded = !!data?.degraded;
  const [, setLocation] = useLocation();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        {/*
          asChild forwards Radix's ref/props directly onto the anchor below.
          We deliberately avoid wrapping wouter's <Link> here — Link is a
          higher-order component that doesn't always forward refs cleanly,
          which makes Radix tooltip triggers flaky. Using a plain <a> with
          setLocation keeps both behaviors intact (real anchor semantics +
          reliable tooltip trigger).
        */}
        <TooltipTrigger asChild>
          <a
            href="/admin/health"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              setLocation("/admin/health");
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            data-testid="header-health-indicator"
            aria-label={`System status: ${label}`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isDegraded && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--surna-text-secondary)' }}
            >
              {label}
            </span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          {Array.isArray(tooltip) ? (
            <div className="space-y-1">
              <p className="font-semibold text-red-300">SLO breaches</p>
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                {tooltip.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="text-[10px] opacity-70 pt-1">Click to open the health dashboard.</p>
            </div>
          ) : (
            <p className="text-xs">{tooltip}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: FileText, label: "Content", path: "/admin/content" },
  { icon: Shield, label: "Teams", path: "/teams" },
  { icon: Calendar, label: "Events", path: "/events" },
  { icon: Building2, label: "Places", path: "/places" },
  { icon: ShoppingBag, label: "Marketplace", path: "/marketplace" },
  { icon: CreditCard, label: "Payments", path: "/billing" },
  { icon: Activity, label: "Health", path: "/admin/health" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surna-base)' }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: 'var(--surna-elevated)' }}
        data-testid="admin-sidebar"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b" style={{ borderColor: 'var(--surna-border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--surna-text)' }}>SURNA Admin</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" style={{ color: 'var(--surna-text)' }} />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 font-medium"
                        : ""
                    }`}
                    style={{ color: active ? 'var(--surna-text)' : 'var(--surna-text-secondary)' }}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t" style={{ borderColor: 'var(--surna-border)' }}>
          <Link href="/">
            <a className="flex items-center gap-2 text-sm" style={{ color: 'var(--surna-text-secondary)' }}>
              ← Back to SURNA
            </a>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 px-6 border-b" style={{ background: 'var(--surna-elevated)', borderColor: 'var(--surna-border)' }}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <Menu className="h-5 w-5" style={{ color: 'var(--surna-text)' }} />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <HeaderHealthIndicator />
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: 'var(--surna-text)' }}>Admin Panel</p>
              <p className="text-xs" style={{ color: 'var(--surna-text-secondary)' }}>Secure Access</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6" style={{ background: 'var(--surna-base)' }}>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
