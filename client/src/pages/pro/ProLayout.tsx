import { useState, useEffect, useRef, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Calendar, MessageSquare, BarChart3,
  Megaphone, Settings, LifeBuoy, Building2, Search, Bell, Plus,
  ChevronLeft, Menu, X, ChevronsLeft, ChevronsRight,
  Dumbbell, Swords, Package, ClipboardCheck, Command, Trophy,
  ArrowRight, UserPlus, CalendarPlus, MessageSquarePlus, Megaphone as MegaphoneIcon,
  Activity, Briefcase,
} from "lucide-react";
import "./pro-theme.css";
import "./pro-components.css";
import { useAuth } from "@/hooks/useAuth";
import { useProRole, ROLE_LABELS, ROLE_DESCRIPTIONS, type ProRole, type ProAction } from "./components/useProRole";
import { useApprovals, useProWorkflowStream } from "./components/proWorkflowApi";
import ProTeamChip from "./components/ProTeamChip";
import { useProTeam } from "./components/ProTeamContext";
import { Check } from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  count?: number;
  section?: string;
};

const navItems: NavItem[] = [
  { path: "/pro",             label: "Dashboard",   icon: LayoutDashboard, exact: true, section: "Overview" },
  { path: "/pro/approvals",   label: "Approvals",   icon: ClipboardCheck,               section: "Overview" },
  { path: "/pro/activity",    label: "Activity",    icon: Activity,                     section: "Overview" },
  { path: "/pro/club",        label: "Club",        icon: Building2,                    section: "Identity" },
  { path: "/pro/roster",      label: "Teams",       icon: Users,                        section: "Identity" },
  { path: "/pro/schedule",    label: "Events",      icon: Calendar,                     section: "Operations" },
  { path: "/pro/comms",       label: "Messages",    icon: MessageSquare,                section: "Operations" },
  { path: "/pro/training",    label: "Training",    icon: Dumbbell,                     section: "Operations" },
  { path: "/pro/squad-health", label: "Squad health", icon: Activity,                    section: "Operations" },
  { path: "/pro/match-day",   label: "Match Day",   icon: Swords,                       section: "Operations" },
  { path: "/pro/tournament",  label: "Tournaments", icon: Trophy,                       section: "Operations" },
  { path: "/pro/inventory",   label: "Inventory",   icon: Package,                      section: "Operations" },
  { path: "/pro/recruitment", label: "Recruitment", icon: Briefcase,                    section: "Growth" },
  { path: "/pro/stats",       label: "Analytics",   icon: BarChart3,                    section: "Growth" },
  { path: "/pro/settings",    label: "Settings",    icon: Settings,                     section: "Account" },
];

type ShortcutAction =
  | { kind: "nav"; keys: string; label: string; path: string }
  | { kind: "action"; keys: string; label: string; action: "search" | "create" | "shortcuts" | "close" };

const shortcuts: ShortcutAction[] = [
  { kind: "action", keys: "⌘K  /",  label: "Focus search",       action: "search" },
  { kind: "nav",    keys: "G  D",   label: "Go to Dashboard",    path: "/pro" },
  { kind: "nav",    keys: "G  C",   label: "Go to Club",         path: "/pro/club" },
  { kind: "nav",    keys: "G  T",   label: "Go to Teams",        path: "/pro/roster" },
  { kind: "nav",    keys: "G  E",   label: "Go to Events",       path: "/pro/schedule" },
  { kind: "nav",    keys: "G  M",   label: "Go to Messages",     path: "/pro/comms" },
  { kind: "nav",    keys: "G  S",   label: "Go to Analytics",    path: "/pro/stats" },
  { kind: "nav",    keys: "G  R",   label: "Go to Recruitment",  path: "/pro/recruitment" },
  { kind: "action", keys: "N",      label: "Quick create",       action: "create" },
  { kind: "action", keys: "?",      label: "Show shortcuts",     action: "shortcuts" },
  { kind: "action", keys: "Esc",    label: "Close overlay",      action: "close" },
];

function NavRow({ item, currentPath, collapsed }: { item: NavItem; currentPath: string; collapsed: boolean }) {
  const isActive = item.exact ? currentPath === item.path : currentPath.startsWith(item.path);
  const Icon = item.icon;
  return (
    <Link href={item.path}>
      <div
        className={`pro-nav-item ${isActive ? "pro-nav-item--active" : ""}`}
        title={collapsed ? item.label : undefined}
        data-testid={`pro-nav-${item.label.toLowerCase()}`}
      >
        <span className="pro-nav-item__icon"><Icon size={17} strokeWidth={2.2} /></span>
        {!collapsed && <span>{item.label}</span>}
        {!collapsed && item.count !== undefined && <span className="pro-nav-item__count">{item.count}</span>}
      </div>
    </Link>
  );
}

function Sidebar({ collapsed, onToggle, currentPath }: { collapsed: boolean; onToggle: () => void; currentPath: string }) {
  const { teamId: rawTeamId } = useProTeam();
  const teamId = rawTeamId ?? undefined;
  const { data: approvals } = useApprovals(teamId);
  const pendingCount = (approvals ?? []).filter((a) => a.status === "pending").length;
  const decoratedNav = navItems.map((it) =>
    it.path === "/pro/approvals" && pendingCount > 0 ? { ...it, count: pendingCount } : it,
  );
  const grouped: Record<string, NavItem[]> = {};
  for (const item of decoratedNav) {
    const sec = item.section || "More";
    (grouped[sec] = grouped[sec] || []).push(item);
  }
  return (
    <aside className="pro-sidebar">
      <div className="pro-sidebar__brand">
        <span className="pro-sidebar__brand-mark">S</span>
        {!collapsed && <span className="pro-sidebar__brand-text">SURNA Pro</span>}
        <button
          onClick={onToggle}
          className="pro-icon-btn"
          style={{ marginLeft: "auto", width: 28, height: 28 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-testid="button-toggle-sidebar"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>
      <nav className="pro-sidebar__nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            {!collapsed && <div className="pro-nav-section">{section}</div>}
            {items.map((item) => (
              <NavRow key={item.path} item={item} currentPath={currentPath} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
      <div className="pro-sidebar__footer">
        <Link href="/">
          <div className="pro-nav-item" title={collapsed ? "Back to SURNA" : undefined}>
            <ChevronLeft size={16} />
            {!collapsed && <span>Back to SURNA</span>}
          </div>
        </Link>
      </div>
    </aside>
  );
}

function MobileDrawer({ open, onClose, currentPath }: { open: boolean; onClose: () => void; currentPath: string }) {
  if (!open) return null;
  return (
    <div className="pro-mobile-drawer" onClick={onClose}>
      <div className="pro-mobile-drawer__panel" onClick={(e) => e.stopPropagation()}>
        <div className="pro-sidebar__brand">
          <span className="pro-sidebar__brand-mark">S</span>
          <span className="pro-sidebar__brand-text">SURNA Pro</span>
          <button onClick={onClose} className="pro-icon-btn" style={{ marginLeft: "auto", width: 30, height: 30 }} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>
        <nav className="pro-sidebar__nav">
          {navItems.map((item) => (
            <NavRow key={item.path} item={item} currentPath={currentPath} collapsed={false} />
          ))}
        </nav>
        <div className="pro-sidebar__footer">
          <Link href="/">
            <div className="pro-nav-item">
              <ChevronLeft size={16} />
              <span>Back to SURNA</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function pageTitleFor(path: string): string {
  const item = navItems.find((n) => (n.exact ? n.path === path : path.startsWith(n.path)));
  return item ? item.label : "SURNA Pro";
}

function RoleSwitcher() {
  const { role, setRole } = useProRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const roles: ProRole[] = ["owner", "admin", "coach", "manager", "member"];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="pro-role-badge"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="button-role-switcher"
        title="Switch role context"
      >
        <span className="pro-role-badge__dot" />
        {ROLE_LABELS[role]}
      </button>
      {open && (
        <div className="pro-role-menu" role="menu">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitem"
              onClick={() => { setRole(r); setOpen(false); }}
              className={`pro-role-menu__item ${r === role ? "pro-role-menu__item--active" : ""}`}
              data-testid={`role-option-${r}`}
            >
              <span className="pro-role-menu__item-label">
                <span>{ROLE_LABELS[r]}</span>
                {r === role && <Check size={13} />}
              </span>
              <span className="pro-role-menu__item-desc">{ROLE_DESCRIPTIONS[r]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar({
  onMenu, title, searchRef, onShowShortcuts, onQuickCreate, onNotifications,
}: {
  onMenu: () => void; title: string;
  searchRef: React.RefObject<HTMLInputElement>;
  onShowShortcuts: () => void;
  onQuickCreate: () => void;
  onNotifications: () => void;
}) {
  const { user } = useAuth();
  const initial = (user?.displayName || user?.firstName || user?.username || "U").charAt(0).toUpperCase();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <>
      <div className="pro-mobile-bar">
        <button className="pro-icon-btn" onClick={onMenu} aria-label="Open menu" data-testid="button-open-menu">
          <Menu size={18} />
        </button>
        <div style={{ fontWeight: 800, fontSize: 14 }}>SURNA Pro</div>
        <button className="pro-icon-btn" aria-label="Notifications" onClick={onNotifications}>
          <Bell size={18} />
        </button>
      </div>
      <div className="pro-topbar">
        <div className="pro-topbar__title-row">
          <div className="pro-topbar__title">{title}</div>
          <ProTeamChip />
        </div>
        <div className="pro-topbar__search">
          <Search size={14} />
          <input ref={searchRef} placeholder="Search teams, members, events…" data-testid="input-pro-search" />
          <kbd className="pro-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </div>
        <div className="pro-topbar__actions">
          <RoleSwitcher />
          <button className="pro-icon-btn" aria-label="Quick create" onClick={onQuickCreate} data-testid="button-quick-create"><Plus size={17} /></button>
          <button className="pro-icon-btn" aria-label="Notifications" onClick={onNotifications} data-testid="button-pro-notifications">
            <Bell size={17} />
            <span className="pro-icon-btn__dot" />
          </button>
          <button className="pro-icon-btn" aria-label="Keyboard shortcuts" onClick={onShowShortcuts} data-testid="button-pro-shortcuts"><Command size={17} /></button>
          <Link href="/help" className="pro-icon-btn" aria-label="Help" data-testid="button-pro-help"><LifeBuoy size={17} /></Link>
          <div className="pro-account" data-testid="button-pro-account">
            <span className="pro-account__avatar">{initial}</span>
            <span className="pro-account__name" style={{ marginRight: 4 }}>{user?.displayName || user?.firstName || user?.username || "Account"}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function ShortcutSheet({
  open, onClose, onAction, onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (a: "search" | "create" | "shortcuts" | "close") => void;
  onNavigate: (path: string) => void;
}) {
  if (!open) return null;
  const handleClick = (s: ShortcutAction) => {
    if (s.kind === "nav") { onNavigate(s.path); onClose(); }
    else { onAction(s.action); if (s.action !== "shortcuts") onClose(); }
  };
  return (
    <div className="pro-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pro-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pro-sheet__header">
          <h3 style={{ margin: 0 }}>Command palette</h3>
          <button className="pro-icon-btn" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30 }}><X size={14} /></button>
        </div>
        <div className="pro-sheet__body" style={{ padding: 0 }}>
          {shortcuts.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => handleClick(s)}
              className="pro-cmd-row"
              data-testid={`cmd-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="pro-cmd-row__label">
                {s.kind === "nav" ? <ArrowRight size={13} style={{ opacity: 0.55 }} /> : <Command size={13} style={{ opacity: 0.55 }} />}
                {s.label}
              </span>
              <span className="pro-cmd-row__keys">
                {s.keys.split(/\s+/).map((k, i) => <kbd key={i} className="pro-kbd">{k}</kbd>)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickCreateSheet({
  open, onClose, onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const { can, role } = useProRole();
  if (!open) return null;
  const allItems: Array<{
    icon: typeof UserPlus; label: string; sub: string; path: string; needs: ProAction;
  }> = [
    { icon: UserPlus,          label: "Add member",      sub: "Invite a player or staff to a roster",  path: "/pro/roster",      needs: "members.invite" },
    { icon: CalendarPlus,      label: "Create event",    sub: "Match, training session or meeting",    path: "/pro/schedule",    needs: "events.create" },
    { icon: MessageSquarePlus, label: "New message",     sub: "Start a thread with a team or member",  path: "/pro/comms",       needs: "messages.announce" },
    { icon: ClipboardCheck,    label: "Open recruitment",sub: "Post a position or shortlist talent",   path: "/pro/recruitment", needs: "recruitment.post" },
    { icon: MegaphoneIcon,     label: "Settings",        sub: "Billing, roles and integrations",       path: "/pro/settings",    needs: "club.settings" },
  ];
  const items = allItems.filter((it) => can(it.needs));
  return (
    <div className="pro-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pro-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pro-sheet__header">
          <h3 style={{ margin: 0 }}>Quick create</h3>
          <button className="pro-icon-btn" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30 }}><X size={14} /></button>
        </div>
        <div className="pro-sheet__body" style={{ padding: 0 }}>
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                onClick={() => { onNavigate(it.path); onClose(); }}
                className="pro-cmd-row"
                data-testid={`quick-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="pro-cmd-row__label" style={{ alignItems: "flex-start" }}>
                  <span className="pro-quick-icon"><Icon size={15} /></span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                    <span style={{ fontWeight: 600 }}>{it.label}</span>
                    <span style={{ fontSize: 12, color: "var(--pro-text-muted)" }}>{it.sub}</span>
                  </span>
                </span>
                <ArrowRight size={14} style={{ opacity: 0.45 }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [location, navigate] = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const { teamId: rawTeamId } = useProTeam();
  const teamId = rawTeamId ?? undefined;
  useProWorkflowStream(teamId);

  const handleAction = (a: "search" | "create" | "shortcuts" | "close") => {
    if (a === "search") { setTimeout(() => { searchRef.current?.focus(); searchRef.current?.select(); }, 0); }
    else if (a === "create") { setShowQuickCreate(true); }
    else if (a === "shortcuts") { setShowShortcuts(true); }
    else if (a === "close") { setShowShortcuts(false); setShowQuickCreate(false); setMobileOpen(false); }
  };

  // Scroll to top on route change
  useEffect(() => {
    const main = document.querySelector(".pro-main__content");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location]);

  // Keyboard shortcuts
  useEffect(() => {
    const goMap: Record<string, string> = {
      d: "/pro", t: "/pro/roster", e: "/pro/schedule",
      m: "/pro/comms", s: "/pro/stats", c: "/pro/club", r: "/pro/recruitment",
    };
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const isTyping = (el: EventTarget | null) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — focus search (always)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      // Esc — clear overlays / blur search
      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showQuickCreate) { setShowQuickCreate(false); return; }
        if (mobileOpen) { setMobileOpen(false); return; }
        if (document.activeElement === searchRef.current) (document.activeElement as HTMLElement).blur();
        return;
      }
      if (isTyping(e.target)) return;

      // "/" — focus search
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); return; }
      // "?" — show shortcuts
      if (e.key === "?") { e.preventDefault(); setShowShortcuts(true); return; }
      // "n" — quick create
      if (e.key.toLowerCase() === "n") { e.preventDefault(); setShowQuickCreate(true); return; }
      // "g <key>" navigation
      if (pendingG) {
        const target = goMap[e.key.toLowerCase()];
        if (target) { e.preventDefault(); navigate(target); }
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        pendingG = true;
        gTimer = setTimeout(() => { pendingG = false; }, 900);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [navigate, mobileOpen, showShortcuts, showQuickCreate]);

  return (
      <div className={`pro-app pro-shell${collapsed ? " pro-shell--collapsed" : ""}`}>
        <div className="pro-cinematic-ambient" aria-hidden />
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} currentPath={location} />
        <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} currentPath={location} />
        <div className="pro-main">
          <Topbar
            onMenu={() => setMobileOpen(true)}
            title={pageTitleFor(location)}
            searchRef={searchRef}
            onShowShortcuts={() => setShowShortcuts(true)}
            onQuickCreate={() => setShowQuickCreate(true)}
            onNotifications={() => navigate("/notifications")}
          />
          <main className="pro-main__content" key={location}>
            <div className="pro-page-fade">{children}</div>
          </main>
        </div>
        <ShortcutSheet
          open={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          onAction={handleAction}
          onNavigate={(p) => navigate(p)}
        />
        <QuickCreateSheet
          open={showQuickCreate}
          onClose={() => setShowQuickCreate(false)}
          onNavigate={(p) => navigate(p)}
        />
      </div>
  );
}
