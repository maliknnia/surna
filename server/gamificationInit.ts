import { db } from "./db";
import { badgeDefinitions } from "../shared/schema";
import { eq } from "drizzle-orm";

// Initialize default badge definitions
export async function initializeGamificationData(): Promise<void> {
  try {
    console.log("ðŸ† Initializing gamification data...");

    const defaultBadges = [
      {
        name: "first_post",
        title: "First Steps",
        description: "Create your first post and join the community",
        iconEmoji: "ðŸŽ¯",
        category: "social",
        tier: "bronze",
        pointsAwarded: 25,
        requirementType: "count",
        requirementValue: 1,
        requirementData: { metric: "posts_created", value: 1 },
        rarity: "common",
      },
      {
        name: "social_butterfly",
        title: "Social Butterfly",
        description: "Create 10 posts and connect with the community",
        iconEmoji: "ðŸ¦‹",
        category: "social",
        tier: "silver",
        pointsAwarded: 100,
        requirementType: "count",
        requirementValue: 10,
        requirementData: { metric: "posts_created", value: 10 },
        rarity: "rare",
      },
      {
        name: "content_creator",
        title: "Content Creator",
        description: "Share 50 posts and become a community influencer",
        iconEmoji: "â­",
        category: "social",
        tier: "gold",
        pointsAwarded: 500,
        requirementType: "count",
        requirementValue: 50,
        requirementData: { metric: "posts_created", value: 50 },
        rarity: "epic",
      },
      {
        name: "event_organizer",
        title: "Event Organizer",
        description: "Create 5 events and bring people together",
        iconEmoji: "ðŸŽª",
        category: "events",
        tier: "silver",
        pointsAwarded: 200,
        requirementType: "count",
        requirementValue: 5,
        requirementData: { metric: "events_created", value: 5 },
        rarity: "rare",
      },
      {
        name: "team_player",
        title: "Team Player",
        description: "Join 3 teams and collaborate with others",
        iconEmoji: "ðŸ¤",
        category: "teams",
        tier: "bronze",
        pointsAwarded: 150,
        requirementType: "count",
        requirementValue: 3,
        requirementData: { metric: "teams_joined", value: 3 },
        rarity: "common",
      },
      {
        name: "coach_seeker",
        title: "Coach Seeker",
        description: "Book 10 coaching sessions to improve your skills",
        iconEmoji: "ðŸ‹ï¸",
        category: "coaching",
        tier: "gold",
        pointsAwarded: 300,
        requirementType: "count",
        requirementValue: 10,
        requirementData: { metric: "coach_sessions", value: 10 },
        rarity: "epic",
      },
      {
        name: "streak_master",
        title: "Streak Master",
        description: "Login daily for 7 consecutive days",
        iconEmoji: "ðŸ”¥",
        category: "general",
        tier: "silver",
        pointsAwarded: 100,
        requirementType: "streak",
        requirementValue: 7,
        requirementData: { metric: "daily_login", value: 7 },
        rarity: "rare",
      },
      {
        name: "level_up",
        title: "Level Up",
        description: "Reach level 5 and show your dedication",
        iconEmoji: "ðŸ“ˆ",
        category: "general",
        tier: "gold",
        pointsAwarded: 250,
        requirementType: "milestone",
        requirementValue: 5,
        requirementData: { metric: "level_reached", value: 5 },
        rarity: "epic",
      },
      {
        name: "point_collector",
        title: "Point Collector",
        description: "Accumulate 1000 total points",
        iconEmoji: "ðŸ’Ž",
        category: "general",
        tier: "gold",
        pointsAwarded: 200,
        requirementType: "milestone",
        requirementValue: 1000,
        requirementData: { metric: "total_points", value: 1000 },
        rarity: "epic",
      },
      {
        name: "early_bird",
        title: "Early Bird",
        description: "Be among the first 100 users to join",
        iconEmoji: "ðŸ¦",
        category: "general",
        tier: "platinum",
        pointsAwarded: 1000,
        requirementType: "special",
        requirementValue: 1,
        requirementData: { metric: "early_adopter", value: 1 },
        rarity: "legendary",
      },
    ];

    // Check if badges already exist, if not, create them
    for (const badge of defaultBadges) {
      const existing = await db
        .select()
        .from(badgeDefinitions)
        .where(eq(badgeDefinitions.name, badge.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(badgeDefinitions).values({
          name: badge.name,
          description: badge.description,
          category: badge.category,
          tier: badge.tier,
          requirements: {
            title: badge.title,
            iconEmoji: badge.iconEmoji,
            pointsAwarded: badge.pointsAwarded,
            requirementType: badge.requirementType,
            requirementValue: badge.requirementValue,
            requirementData: badge.requirementData,
            rarity: badge.rarity,
          },
        });
        console.log(`âœ… Created badge: ${badge.title}`);
      }
    }

    console.log("ðŸ† Gamification data initialized successfully");
  } catch (error) {
    console.error("âŒ Error initializing gamification data:", error);
  }
}
