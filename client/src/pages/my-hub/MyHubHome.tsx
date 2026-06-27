import { Link } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Inbox,
  MessageCircle,
  Plus,
  PlusCircle,
  Building2,
  Trophy,
} from "lucide-react";
import {
  SummaryChipRow,
  SectionHeader,
  QuickActionBar,
  EmptyState,
  UpgradePromptCard,
  type SummaryChip,
  type QuickAction,
} from "@/features/my-hub/components";
import { useMyHubSummary } from "@/features/my-hub/hooks/useMyHubSummary";
import { createHubPath } from "@/lib/createHub";
import { ROUTES } from "@/navigation";
import { HubManagePanel } from "@/components/create/HubManagePanel";

export default function MyHubHome() {
  const { data, isLoading } = useMyHubSummary();

  const chips: SummaryChip[] = [
    {
      key: "events",
      label: "Upcoming",
      value: data?.upcomingEvents ?? 0,
      icon: Calendar,
      href: "/calendar",
    },
    {
      key: "requests",
      label: "Requests",
      value: data?.pendingRequests ?? 0,
      icon: Inbox,
      emphasis: (data?.pendingRequests ?? 0) > 0,
    },
    {
      key: "messages",
      label: "Unread",
      value: data?.unreadMessages ?? 0,
      icon: MessageCircle,
      emphasis: (data?.unreadMessages ?? 0) > 0,
    },
    {
      key: "challenges",
      label: "Challenges",
      value: data?.activeChallenges ?? 0,
      icon: Trophy,
      href: `${ROUTES.challenges}?tab=mine`,
    },
    {
      key: "teams",
      label: "Teams",
      value: data?.activeTeams ?? 0,
      icon: Users,
    },
    {
      key: "places",
      label: "Places",
      value: data?.activePlaces ?? 0,
      icon: Building2,
    },
  ];

  const quickActions: QuickAction[] = [
    { key: "create-all", label: "Create", icon: PlusCircle, href: ROUTES.create },
    { key: "create-event", label: "New Event", icon: Calendar, href: createHubPath("event") },
    { key: "create-team", label: "New Team", icon: Users, href: createHubPath("team") },
    { key: "add-place", label: "Add Place", icon: MapPin, href: createHubPath("place") },
    { key: "view-requests", label: "Requests", icon: Inbox, href: "/my-hub/requests" },
  ];

  const hasNothing =
    !isLoading &&
    data &&
    data.upcomingEvents === 0 &&
    data.activeChallenges === 0 &&
    data.activeTeams === 0 &&
    data.activePlaces === 0 &&
    data.pendingRequests === 0 &&
    data.unreadMessages === 0;

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--surna-void)" }}
      data-testid="my-hub-page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 glass-effect"
        style={{
          background: "var(--glass-bg, rgba(0,0,0,0.7))",
          borderBottom: "0.5px solid var(--surna-border)",
        }}
      >
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/profile">
            <button
              className="p-2 rounded-xl transition-all active:scale-95"
              data-testid="back-button"
            >
              <ArrowLeft
                className="w-5 h-5"
                style={{ color: "var(--surna-text)" }}
              />
            </button>
          </Link>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--surna-text)" }}
          >
            My Hub
          </h1>
          <Link href={ROUTES.create}>
            <button
              className="p-2 rounded-xl transition-all active:scale-95"
              data-testid="create-shortcut"
              aria-label="Create"
            >
              <PlusCircle
                className="w-5 h-5"
                style={{ color: "var(--surna-text)" }}
              />
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-6">
        {/* Intro */}
        <div>
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--surna-text)" }}
          >
            Manage your sport.
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--surna-text-secondary)" }}
          >
            A light control center for what you run and where you play.
          </p>
        </div>

        {/* Summary chips */}
        <SummaryChipRow chips={chips} loading={isLoading} />

        {/* Manage everything you create */}
        <HubManagePanel showMyHubLink={false} />

        {/* Quick create shortcuts */}
        <div>
          <SectionHeader title="Quick create" />
          <QuickActionBar actions={quickActions} />
        </div>

        {/* First-run / empty */}
        {hasNothing && (
          <EmptyState
            icon={PlusCircle}
            title="Nothing here yet"
            description="Create your first event, start a team, or add a place to get going."
            ctaLabel="Create an event"
            ctaHref={ROUTES.create}
            testId="hub-empty-state"
          />
        )}

        {/* Pro upgrade placeholder (final wiring in #41) */}
        <UpgradePromptCard />

        <div className="h-4" />
      </div>
    </div>
  );
}
