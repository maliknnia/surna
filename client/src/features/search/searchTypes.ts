import type { User, Team, EventWithOrganizer } from "@shared/schema";

export interface SearchCoach {
  id: string;
  userId?: string;
  hourlyRate?: string | null;
  profileImageUrl?: string | null;
  sport?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}

export interface SearchPlace {
  id: string;
  name: string;
  city?: string | null;
  sports?: string[] | null;
  averageRating?: string | null;
}

export interface SearchProduct {
  id: string;
  name: string;
  price?: string | number | null;
  imageUrl?: string | null;
  brand?: string | null;
}

export interface SearchTeam extends Team {
  memberCount?: number;
  isInstant?: boolean;
}

export interface SearchRoute {
  id: string;
  title: string;
  sport?: string | null;
  location?: string | null;
  startsAt?: string | null;
}

export interface UnifiedSearchResults {
  users: User[];
  teams: SearchTeam[];
  events: EventWithOrganizer[];
  coaches: SearchCoach[];
  places: SearchPlace[];
  products: SearchProduct[];
  /** Grouped aliases from GET /api/search */
  players?: User[];
  venues?: SearchPlace[];
  routes?: SearchRoute[];
}

export interface SearchAd {
  id: string;
  brandName: string;
  title: string;
  imageUrl: string;
  ctaUrl: string;
  ctaLabel?: string;
}

export interface UndiscoveredItem {
  id: string;
  type: "event" | "team" | "coach";
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  sport?: string | null;
}
