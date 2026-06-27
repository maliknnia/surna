import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  Users,
  Zap,
  Target,
  MapPin,
  Camera,
  Radio,
  Inbox,
  MessageCircle,
  Building2,
} from "lucide-react";
import { ROUTES } from "@/navigation";
import type { MyHubSummary } from "@/features/my-hub/hooks/useMyHubSummary";

export type CreateOptionId =
  | "event"
  | "team"
  | "pickup"
  | "challenge"
  | "place"
  | "post"
  | "live";

export interface CreateOption {
  id: CreateOptionId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  route: string;
  /** Where the user manages this after creation */
  manageRoute: string;
  manageLabel: string;
  /** Rough time to finish */
  eta: string;
  stepLabels: string[];
  badge?: string;
}

export interface CreateSection {
  id: string;
  title: string;
  subtitle: string;
  options: CreateOption[];
}

export const CREATE_SECTIONS: CreateSection[] = [
  {
    id: "community",
    title: "Bring people together",
    subtitle: "Events, teams, and pickup games",
    options: [
      {
        id: "event",
        title: "Event",
        subtitle: "Tournament, meetup, or training session with RSVP",
        icon: Calendar,
        route: ROUTES.createEvent,
        manageRoute: ROUTES.myHubEvents,
        manageLabel: "Manage events",
        eta: "3 min",
        stepLabels: ["Photo & basics", "When", "Where", "Details", "Publish"],
        badge: "Popular",
      },
      {
        id: "team",
        title: "Team",
        subtitle: "Permanent squad with roster, goals, and chat",
        icon: Users,
        route: ROUTES.createTeam,
        manageRoute: ROUTES.myHubTeams,
        manageLabel: "Manage teams",
        eta: "4 min",
        stepLabels: ["Photo & basics", "Details", "Goals", "Launch"],
      },
      {
        id: "pickup",
        title: "Pickup game",
        subtitle: "Find players for a game starting soon",
        icon: Zap,
        route: ROUTES.createInstantTeam,
        manageRoute: ROUTES.instantJoin,
        manageLabel: "Your games",
        eta: "1 min",
        stepLabels: ["Photo & sport", "Players", "Go live"],
        badge: "Fast",
      },
    ],
  },
  {
    id: "compete",
    title: "Compete",
    subtitle: "Challenge athletes or teams",
    options: [
      {
        id: "challenge",
        title: "Challenge",
        subtitle: "Head-to-head match with stakes and rules",
        icon: Target,
        route: ROUTES.createChallenge,
        manageRoute: `${ROUTES.challenges}?tab=mine`,
        manageLabel: "My challenges",
        eta: "2 min",
        stepLabels: ["Photo & basics", "Rules", "Confirm"],
      },
    ],
  },
  {
    id: "places",
    title: "Places & venues",
    subtitle: "List courts, gyms, and fields on the map",
    options: [
      {
        id: "place",
        title: "Venue / place",
        subtitle: "Add a sports location others can discover",
        icon: MapPin,
        route: ROUTES.createPlace,
        manageRoute: ROUTES.myHubPlaces,
        manageLabel: "Manage places",
        eta: "5 min",
        stepLabels: ["Photos & info", "Location", "Hours & publish"],
      },
    ],
  },
  {
    id: "content",
    title: "Share on feed",
    subtitle: "Posts, stories, and live streams",
    options: [
      {
        id: "post",
        title: "Post or story",
        subtitle: "Photo, video, or update for your followers",
        icon: Camera,
        route: ROUTES.feed,
        manageRoute: ROUTES.feed,
        manageLabel: "Your feed",
        eta: "30 sec",
        stepLabels: ["Capture", "Caption", "Share"],
      },
      {
        id: "live",
        title: "Go live",
        subtitle: "Stream from Events — share a link and go",
        icon: Radio,
        route: `${ROUTES.events}?live=1`,
        manageRoute: ROUTES.myHubEvents,
        manageLabel: "Manage events",
        eta: "1 min",
        stepLabels: ["Title", "Stream URL", "Broadcast"],
      },
    ],
  },
];

const ALL_OPTIONS = CREATE_SECTIONS.flatMap((s) => s.options);

export function getCreateOption(id: string): CreateOption | undefined {
  return ALL_OPTIONS.find((o) => o.id === id);
}

export function createHubPath(type?: CreateOptionId | string): string {
  if (!type) return ROUTES.create;
  return `${ROUTES.create}?type=${encodeURIComponent(type)}`;
}

export type HubManageItem = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  countKey?: keyof Pick<MyHubSummary, "upcomingEvents" | "activeTeams" | "activePlaces" | "activeChallenges">;
  badgeKey?: keyof Pick<MyHubSummary, "pendingRequests" | "unreadMessages">;
  testId?: string;
};

/** Manage destinations paired with create options — shown in Create Hub & My Hub. */
export const HUB_MANAGE_ITEMS: HubManageItem[] = [
  {
    id: "events",
    title: "Events",
    description: "Edit, cancel, or share what you host",
    icon: Calendar,
    route: ROUTES.myHubEvents,
    countKey: "upcomingEvents",
    testId: "hub-manage-events",
  },
  {
    id: "teams",
    title: "Teams",
    description: "Roster, posts, and join requests",
    icon: Users,
    route: ROUTES.myHubTeams,
    countKey: "activeTeams",
    badgeKey: "pendingRequests",
    testId: "hub-manage-teams",
  },
  {
    id: "places",
    title: "Places",
    description: "Venues you own on the map",
    icon: Building2,
    route: ROUTES.myHubPlaces,
    countKey: "activePlaces",
    testId: "hub-manage-places",
  },
  {
    id: "challenges",
    title: "Challenges",
    description: "Matches you created or joined",
    icon: Target,
    route: `${ROUTES.challenges}?tab=mine`,
    countKey: "activeChallenges",
    testId: "hub-manage-challenges",
  },
  {
    id: "pickup",
    title: "Pickup games",
    description: "Active games you’re hosting",
    icon: Zap,
    route: ROUTES.instantJoin,
    testId: "hub-manage-pickup",
  },
  {
    id: "requests",
    title: "Requests",
    description: "Invites and join requests",
    icon: Inbox,
    route: ROUTES.myHubRequests,
    badgeKey: "pendingRequests",
    testId: "hub-manage-requests",
  },
  {
    id: "messages",
    title: "Messages",
    description: "Chats for your teams and events",
    icon: MessageCircle,
    route: ROUTES.messages,
    badgeKey: "unreadMessages",
    testId: "hub-manage-messages",
  },
];
