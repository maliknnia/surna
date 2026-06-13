/**
 * CENTRALIZED ROUTE CONFIGURATION
 * 
 * Single source of truth for all routes in the application.
 * Never hardcode paths - import from here.
 */

export const ROUTES = {
  // Core
  home: '/',
  landing: '/landing',
  
  // Profile & Settings
  profile: '/profile',
  profileEdit: '/profile/edit',
  settings: '/settings',
  security: '/security',
  privacySettings: '/privacy-settings',
  
  // Feed & Social
  feed: '/feed',
  search: '/search',
  messages: '/messages',
  create: '/create',
  myHub: '/my-hub',
  myHubEvents: '/my-hub/events',
  myHubTeams: '/my-hub/teams',
  myHubPlaces: '/my-hub/places',
  myHubRequests: '/my-hub/requests',
  instantJoin: '/instant-join',
  
  // Discovery
  discover: '/discover',
  discoverPeople: '/discover/people',
  map: '/map',
  sports: '/sports',
  person: (id: string) => `/person/${id}`,
  
  // Sports Hub
  places: '/places',
  createPlace: '/places/create',
  place: (id: string) => `/places/${id}`,
  managePlace: (id: string) => `/places/${id}/manage`,
  
  teams: '/teams',
  createTeam: '/teams/create',
  createInstantTeam: '/instant-teams/create',
  team: (id: string) => `/teams/${id}`,
  manageTeam: '/teams/manage',
  
  coaches: '/coaches',
  coach: (id: string) => `/coaches/${id}`,
  coachSchedule: '/coach/schedule',
  coachProfileEdit: '/coach/profile',
  
  events: '/events',
  createEvent: '/events/create',
  event: (id: string) => `/events/${id}`,
  eventRoute: (id: string) => `/events/${id}/route`,
  
  // Challenges
  challenges: '/challenges',
  createChallenge: '/challenges/create',
  challenge: (id: string) => `/challenges/${id}`,
  
  // Marketplace
  marketplace: '/marketplace',
  shop: (id: string) => `/marketplace/shop/${id}`,
  product: (id: string) => `/marketplace/product/${id}`,
  cart: '/marketplace/cart',
  checkout: '/marketplace/checkout',
  wishlist: '/wishlist',
  
  // Performance & Analytics
  performance: '/performance',
  analytics: '/analytics',
  leaderboards: '/leaderboards',
  rewards: '/rewards',
  goals: '/goals',
  schedule: '/schedule',
  
  // Admin
  admin: '/admin',
  adminUsers: '/admin/users',
  adminContent: '/admin/content',
  
  // Misc
  help: '/help',
  about: '/about',
  contact: '/contact',
  billing: '/billing',
  subscribe: '/subscribe',
} as const;

export type RouteKey = keyof typeof ROUTES;
