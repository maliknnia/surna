export const flags = {
  hubEnabled: true,
  placesEnabled: true,
  teamsEnabled: true,
  mapEnabled: true,
  coachesEnabled: true,
  eventsEnabled: true,
  menu: {
    leaderboards: true,
    create: true,
    challenge: true,
    calendar: true,
    joinUs: true,
  },
  // New features - Phase rollout
  stripeCheckout: true,  // Phase 1: Complete Stripe payments
  pushNotifications: true,  // Phase 2: Web push notifications
  videoContent: true,  // Phase 3: Video uploads and playback
  liveStreaming: true,  // Phase 4: Live streaming capability
  aiRecommendations: true,  // Phase 5: AI-powered suggestions
} as const;