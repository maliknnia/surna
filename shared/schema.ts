import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  serial,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// Core user table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  username: varchar("username").unique(),
  displayName: varchar("display_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  sport: varchar("sport"),
  primarySport: text("primary_sport"),
  position: text("position"),
  skillLevel: text("skill_level"), // beginner/intermediate/advanced/elite
  availability: text("availability"),
  lookingFor: text("looking_for"), // fun/competitive/training/coaching
  location: varchar("location"),
  dateOfBirth: timestamp("date_of_birth"),
  preferredLanguage: varchar("preferred_language", { length: 5 }).default("en"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  dateFormat: varchar("date_format", { length: 20 }).default("MM/dd/yyyy"),
  timeFormat: varchar("time_format", { length: 5 }).default("12"),
  wallpaperEnabled: boolean("wallpaper_enabled").default(false),
  wallpaperUrl: text("wallpaper_url"),
  wallpaperPages: text("wallpaper_pages").array().default(sql`ARRAY[]::text[]`),
  isAdmin: boolean("is_admin").default(false), // Package #12: Admin role for analytics
  adminRole: varchar("admin_role", { length: 50 }), // Package #13: super_admin|moderator|finance_admin|event_admin|support
  require2FA: boolean("require_2fa").default(false), // Package #13: Enforce 2FA for admin access
  banned: boolean("banned").default(false), // Package #13: User moderation
  bannedReason: text("banned_reason"), // Package #13: Ban reason
  bannedUntil: timestamp("banned_until"), // Package #13: Temporary ban expiry
  verified: boolean("verified").default(false), // Package #13: User verification
  emailVerified: boolean("email_verified").default(false),
  emailVerificationCode: varchar("email_verification_code", { length: 6 }),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordHash: varchar("password_hash"),
  points: integer("points").default(0),
  currentWinStreak: integer("current_win_streak").default(0),
  longestWinStreak: integer("longest_win_streak").default(0),
  activityStreak: integer("activity_streak").default(0),
  longestActivityStreak: integer("longest_activity_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  profileJson: jsonb("profile_json"),
  profileType: varchar("profile_type").default("normal"),
  sportIdentity: jsonb("sport_identity").default(sql`'{}'::jsonb`),
  heightCm: integer("height_cm"),
  preferredFoot: varchar("preferred_foot"),
  clubHistory: text("club_history"),
  weightClass: varchar("weight_class"),
  fightRecordWins: integer("fight_record_wins").default(0),
  fightRecordLosses: integer("fight_record_losses").default(0),
  fightRecordDraws: integer("fight_record_draws").default(0),
  fightRecordKos: integer("fight_record_kos").default(0),
  stance: varchar("stance"),
  amateurOrPro: varchar("amateur_or_pro"),
  iabaNumber: varchar("iaba_number"),
  medicalClearanceExpiry: timestamp("medical_clearance_expiry"),
  gymAffiliation: varchar("gym_affiliation"),
  pushSubscription: text("push_subscription"), // Web Push subscription JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  mediaType: varchar("media_type").default("text"), // 'text', 'image', 'video'
  sport: varchar("sport"),
  location: varchar("location"), // Location tagging for posts
  taggedUsers: text("tagged_users").array().default(sql`ARRAY[]::text[]`), // Array of user IDs
  hashtags: text("hashtags").array().default(sql`ARRAY[]::text[]`), // Array of hashtags
  visibility: varchar("visibility").default("public"), // 'public', 'friends', 'private'
  postType: varchar("post_type").default("text"), // 'text', 'image', 'video', 'event'
  eventData: jsonb("event_data"), // Store event-specific data
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  flagged: boolean("flagged").default(false), // Package #13: Content moderation
  removed: boolean("removed").default(false), // Package #13: Content moderation
  removedReason: text("removed_reason"), // Package #13: Removal reason
  removedAt: timestamp("removed_at"), // Package #13: When content was removed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  authorCreatedIdx: index("posts_author_created_idx").on(table.authorId, table.createdAt),
  createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
}));

// Post likes
export const postLikes = pgTable("post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postUserIdx: index("post_likes_post_user_idx").on(table.postId, table.userId),
  userCreatedIdx: index("post_likes_user_created_idx").on(table.userId, table.createdAt),
}));

// Post comments
export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  parentId: varchar("parent_id"), // For nested comments - self reference added via SQL
  flagged: boolean("flagged").default(false), // Package #13: Content moderation
  removed: boolean("removed").default(false), // Package #13: Content moderation
  removedReason: text("removed_reason"), // Package #13: Removal reason
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  postCreatedIdx: index("post_comments_post_created_idx").on(table.postId, table.createdAt),
  authorCreatedIdx: index("post_comments_author_created_idx").on(table.authorId, table.createdAt),
}));
export const postShares = pgTable("post_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  shareType: varchar("share_type").default("default"), // 'story', 'message', 'copy_link', 'default'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postUserIdx: index("post_shares_post_user_idx").on(table.postId, table.userId),
  userCreatedIdx: index("post_shares_user_created_idx").on(table.userId, table.createdAt),
}));

// Teams table - Package #4: Extended for Team Profiles
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique(), // URL-friendly identifier
  description: text("description"),
  sport: varchar("sport").notNull(),
  location: varchar("location"),
  city: varchar("city"), // Package #4: Separate city field
  captainId: varchar("captain_id").notNull().references(() => users.id),
  placeId: varchar("place_id").references(() => places.id), // Home gym/venue
  logo: text("logo"), // Package #4: Team logo URL
  cover: text("cover"), // Package #4: Cover image URL
  verified: boolean("verified").default(false), // Package #4: Verified badge
  rating: decimal("rating").default("0"), // Package #4: Aggregate rating
  ratingCount: integer("rating_count").default(0), // Package #4: Number of ratings
  followersCount: integer("followers_count").default(0), // Package #4: Follow count
  sponsors: jsonb("sponsors"), // Package #4: Sponsor array [{id, name, logo, link, tier}]
  isPublic: boolean("is_public").default(true),
  /** open | approval | invite_only */
  joinPolicy: varchar("join_policy").default("open"),
  /** Optional join fee (display + acknowledge for v1; cents) */
  joinFeeCents: integer("join_fee_cents").default(0),
  joinFeeNote: text("join_fee_note"),
  /** Pre-join questions + agreement documents configured by captain */
  joinRequirements: jsonb("join_requirements").default({ questions: [], documents: [] }),
  /** Curated highlight video post ids (captain-managed; Pro can extend later) */
  featuredHighlightIds: text("featured_highlight_ids").array().default(sql`ARRAY[]::text[]`),
  maxMembers: integer("max_members").default(20),
  currentMembers: integer("current_members").default(1),
  currentWinStreak: integer("current_win_streak").default(0),
  longestWinStreak: integer("longest_win_streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members with enhanced role management
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").default("member"), // 'captain', 'co-captain', 'member'
  status: varchar("status").default("pending"), // 'pending', 'active', 'inactive', 'banned'
  joinedAt: timestamp("joined_at").defaultNow(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  skillLevel: varchar("skill_level"), // 'beginner', 'intermediate', 'advanced', 'expert'
  attendance: integer("attendance").default(0),
  gamesPlayed: integer("games_played").default(0),
  lastActive: timestamp("last_active").defaultNow(),
}, (table) => ({
  teamUserIdx: index("team_members_team_user_idx").on(table.teamId, table.userId),
  userIdx: index("team_members_user_idx").on(table.userId),
}));
export const teamJoinRequests = pgTable("team_join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message"),
  answers: jsonb("answers").default({}),
  agreedDocuments: jsonb("agreed_documents").default([]),
  /** not_required | acknowledged | paid */
  paymentStatus: varchar("payment_status").default("not_required"),
  /** self | invite */
  source: varchar("source").default("self"),
  invitedBy: varchar("invited_by").references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  teamUserIdx: index("team_join_requests_team_user_idx").on(table.teamId, table.userId),
  teamCreatedIdx: index("team_join_requests_team_created_idx").on(table.teamId, table.createdAt),
}));
export const teamMemberInvites = pgTable("team_member_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // pending | accepted | declined | cancelled
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  userStatusIdx: index("team_member_invites_user_status_idx").on(table.userId, table.status),
  teamStatusIdx: index("team_member_invites_team_status_idx").on(table.teamId, table.status),
}));
export const teamStats = pgTable("team_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  gamesPlayed: integer("games_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  totalEvents: integer("total_events").default(0),
  avgAttendance: decimal("avg_attendance").default("0"),
  topPlayerId: varchar("top_player_id").references(() => users.id),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

/** Logged friendly/competitive games for consumer teams */
export const teamGames = pgTable("team_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  loggedBy: varchar("logged_by").notNull().references(() => users.id),
  opponentName: varchar("opponent_name").notNull(),
  /** win | loss | draw */
  result: varchar("result").notNull(),
  ourScore: integer("our_score"),
  theirScore: integer("their_score"),
  playedAt: timestamp("played_at").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamGameParticipants = pgTable("team_game_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => teamGames.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  showOnProfile: boolean("show_on_profile").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userShowIdx: index("team_game_participants_user_idx").on(table.userId, table.showOnProfile),
}));

// User follows (social connections) — legacy; Phase 3 uses `follows` table
export const userFollows = pgTable("user_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followedId: varchar("followed_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id),
  followingId: varchar("following_id").notNull(),
  followingType: varchar("following_type").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userBlocks = pgTable("user_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedId: varchar("blocked_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentReports = pgTable("content_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  contentType: varchar("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  reason: varchar("reason").notNull(),
  description: text("description"),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User performance metrics
export const userPerformance = pgTable("user_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: varchar("sport").notNull(),
  metrics: jsonb("metrics").notNull(), // Store various performance metrics
  recordDate: timestamp("record_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point transactions (gamification)
export const pointTransactions = pgTable("point_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  action: varchar("action").notNull(), // 'post_created', 'like_given', 'comment_made', etc.
  description: text("description"),
  relatedEntityType: varchar("related_entity_type"), // 'post', 'comment', 'event', etc.
  relatedEntityId: varchar("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userCreatedIdx: index("point_transactions_user_created_idx").on(table.userId, table.createdAt),
}));
export const badgeDefinitions = pgTable("badge_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description").notNull(),
  iconUrl: varchar("icon_url"),
  category: varchar("category").notNull(), // 'social', 'performance', 'community', 'special'
  tier: varchar("tier").default("bronze"), // 'bronze', 'silver', 'gold', 'platinum'
  requirements: jsonb("requirements").notNull(), // Dynamic requirements
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges (earned badges)
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badgeDefinitions.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  progress: jsonb("progress").default({}), // Track progress toward badge
  isDisplayed: boolean("is_displayed").default(true), // User can choose to display or hide
});

// User levels and XP
export const userLevels = pgTable("user_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  level: integer("level").default(1),
  totalPoints: integer("total_points").default(0),
  pointsToNextLevel: integer("points_to_next_level").default(100),
  sport: varchar("sport"), // Level can be sport-specific or general
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User streaks (consecutive activity)
export const userStreaks = pgTable("user_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'daily_login', 'workout', 'posting', etc.
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gamification leaderboards (points, levels, etc.)
export const leaderboards = pgTable("leaderboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  metric: varchar("metric").notNull(),
  value: integer("value").notNull().default(0),
  rank: integer("rank").notNull(),
  timeframe: varchar("timeframe").notNull().default("all_time"),
  sport: varchar("sport"),
  region: varchar("region"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Leaderboard = typeof leaderboards.$inferSelect;
export type InsertLeaderboard = typeof leaderboards.$inferInsert;

/** Phase 4 competitive badges (user_id, badge_type, awarded_at). */
export const competitiveBadges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeType: varchar("badge_type").notNull(),
  awardedAt: timestamp("awarded_at").defaultNow(),
});

export const weeklyChallenges = pgTable("weekly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  sport: varchar("sport"),
  requirement: jsonb("requirement").default({}),
  bonusPoints: integer("bonus_points").default(75),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyChallengeCompletions = pgTable("weekly_challenge_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weeklyChallengeId: varchar("weekly_challenge_id").notNull().references(() => weeklyChallenges.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  completedAt: timestamp("completed_at").defaultNow(),
  pointsAwarded: integer("points_awarded").default(0),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'like', 'comment', 'follow', 'team_invite', etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("related_entity_type"), // 'post', 'user', 'team', etc.
  relatedEntityId: varchar("related_entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userCreatedIdx: index("notifications_user_created_idx").on(table.userId, table.createdAt),
  userReadIdx: index("notifications_user_read_idx").on(table.userId, table.isRead),
}));

// Session storage table (for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Type exports for core tables
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// Image variant URLs attached by the API serializer. The resize worker writes
// `_thumb` (256w) and `_medium` (1024w) JPEGs plus WebP/AVIF siblings, and
// the server derives these sibling URLs from the stored `imageUrl` so list
// surfaces can request the small variant and detail surfaces the large one.
// All fields are optional — pre-worker uploads only have the legacy `imageUrl`.
export interface ImageVariantUrls {
  thumbUrl?: string;
  mediumUrl?: string;
  thumbWebpUrl?: string;
  mediumWebpUrl?: string;
  thumbAvifUrl?: string;
  mediumAvifUrl?: string;
}

export type PostWithAuthor = Post & { author: User } & ImageVariantUrls;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;
export type UserPerformance = typeof userPerformance.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;

// Post media table
export const postMedia = pgTable("post_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  mediaUrl: varchar("media_url").notNull(),
  mediaType: varchar("media_type").notNull(), // 'image', 'video', 'audio'
  thumbnailUrl: varchar("thumbnail_url"),
  altText: text("alt_text"),
  fileSize: integer("file_size"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"), // For videos/audio in seconds
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postCreatedIdx: index("post_media_post_created_idx").on(table.postId, table.createdAt),
}));
export const hashtags = pgTable("hashtags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tag: varchar("tag").notNull().unique(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add missing exports to fix import issues
export const contentFilters = pgTable("content_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  pattern: text("pattern").notNull(),
  type: varchar("type").notNull(), // 'spam', 'profanity', 'hate_speech', etc.
  action: varchar("action").default("flag"), // 'flag', 'auto_remove', 'shadow_ban'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'discount', 'freebie', 'bonus_points'
  value: decimal("value", { precision: 10, scale: 2 }),
  code: varchar("code").unique(),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add this to fix the storage.ts error
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  type: varchar("type").notNull(), // 'daily', 'weekly', 'monthly', 'seasonal'
  challengeType: varchar("challenge_type").default("open"), // 'open', 'structured', 'contact'
  category: varchar("category"), // 'social', 'fitness', 'engagement', 'learning'
  requirements: jsonb("requirements").notNull(), // Dynamic requirements object
  rewards: jsonb("rewards").notNull(), // Points, badges, etc.
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  participantLimit: integer("participant_limit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userChallenges = pgTable("user_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  status: varchar("status").default("active"), // 'active', 'completed', 'failed', 'abandoned'
  progress: jsonb("progress").default({}), // Track completion progress
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Package #10: Competitive Matches (1v1, Team vs Team, Open, Solo)
export const competitiveMatches = pgTable("competitive_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  type: varchar("type").notNull(), // 'solo', 'player1v1', 'teamVsTeam', 'open'
  challengeType: varchar("challenge_type").default("open"), // 'open', 'structured', 'contact'
  sport: varchar("sport").notNull(),
  creatorType: varchar("creator_type").notNull(), // 'user', 'team'
  creatorId: varchar("creator_id").notNull(),
  opponentType: varchar("opponent_type"), // 'user', 'team' (null for open/solo)
  opponentId: varchar("opponent_id"),
  rules: text("rules"),
  visibility: varchar("visibility").default("public"), // 'public', 'private', 'invite'
  location: jsonb("location"), // { lat, lng, address, private }
  timeStart: timestamp("time_start"),
  timeEnd: timestamp("time_end"),
  entryFee: jsonb("entry_fee"), // { amount, currency }
  reward: varchar("reward").default("xp"), // 'xp', 'badge', 'cash', 'none'
  capacity: integer("capacity"), // for open challenges
  status: varchar("status").default("pending"), // 'draft', 'pending', 'invited', 'accepted', 'live', 'completed', 'disputed', 'cancelled'
  sponsored: boolean("sponsored").default(false),
  messengerGroupId: varchar("messenger_group_id"), // Package #10: Auto-created group thread for participants
  coverMediaId: varchar("cover_media_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Package #10: Match Participants
export const matchParticipants = pgTable("match_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => competitiveMatches.id, { onDelete: 'cascade' }),
  participantType: varchar("participant_type").notNull(), // 'user', 'team'
  participantId: varchar("participant_id").notNull(),
  role: varchar("role"), // 'host', 'guest', null for open
  managerConsent: boolean("manager_consent").default(false),
  status: varchar("status").default("pending"), // 'pending', 'accepted', 'declined', 'checkedIn'
  checkedInAt: timestamp("checked_in_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Package #10: Match Results (dual confirmation required)
export const matchResults = pgTable("match_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull().references(() => competitiveMatches.id, { onDelete: 'cascade' }),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  hostScore: integer("host_score"),
  guestScore: integer("guest_score"),
  outcome: varchar("outcome").notNull(), // 'hostWin', 'guestWin', 'draw', 'forfeit'
  stats: jsonb("stats"), // Additional match stats
  attachments: text("attachments").array(), // Proof photos/videos
  notes: text("notes"),
  confirmedById: varchar("confirmed_by_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  refereeId: varchar("referee_id").references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'rejected', 'disputed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Package #10: Rating History (ELO tracking per sport)
export const ratingHistory = pgTable("rating_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // 'user', 'team'
  entityId: varchar("entity_id").notNull(),
  sport: varchar("sport").notNull(),
  delta: integer("delta").notNull(), // Rating change (+/-)
  newRating: integer("new_rating").notNull(),
  matchId: varchar("match_id").references(() => competitiveMatches.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat rooms for messaging
export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull().default("direct"), // 'direct', 'group', 'team'
  name: varchar("name"),
  description: text("description"),
  isPrivate: boolean("is_private").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat room participants
export const chatRoomParticipants = pgTable("chat_room_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => chatRooms.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").default("member"), // 'member', 'admin', 'moderator'
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

// Type exports
export type Challenge = typeof challenges.$inferSelect;
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;
export type InsertUserChallenge = typeof userChallenges.$inferInsert;
export type CompetitiveMatch = typeof competitiveMatches.$inferSelect;
export type InsertCompetitiveMatch = typeof competitiveMatches.$inferInsert;
export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type InsertMatchParticipant = typeof matchParticipants.$inferInsert;
export type MatchResult = typeof matchResults.$inferSelect;
export type InsertMatchResult = typeof matchResults.$inferInsert;
export type RatingHistory = typeof ratingHistory.$inferSelect;
export type InsertRatingHistory = typeof ratingHistory.$inferInsert;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatRoomParticipant = typeof chatRoomParticipants.$inferSelect;
export type Hashtag = typeof hashtags.$inferSelect;

// Enhanced PostWithAuthor to include like status
export type PostWithAuthorEnhanced = PostWithAuthor & {
  isLiked?: boolean;
};

// Coach profiles table
export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  specialties: text("specialties").array(),
  experience: text("experience"),
  certifications: text("certifications").array(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  /** Weekly windows for booking (JSON); null uses server default Mon–Fri 9–17 */
  weeklyAvailability: jsonb("weekly_availability"),
  /** Showcase: achievements, media, pricing plans, booking mode */
  profileJson: jsonb("profile_json"),
  bio: text("bio"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Coach = typeof coaches.$inferSelect;
export type CoachWithUser = Coach & { user: User };

export type CoachWithProfile = CoachWithUser & {
  profile: import("./coachProfile").CoachProfileExtras;
};

// Event participants
export const eventParticipants = pgTable("event_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'declined', 'waitlist'
  rsvpDate: timestamp("rsvp_date").defaultNow(),
  registeredAt: timestamp("registered_at").defaultNow(),
  skillLevel: varchar("skill_level"),
  notes: text("notes"),
  checkedIn: boolean("checked_in").default(false),
  checkedInAt: timestamp("checked_in_at"),
}, (table) => ({
  eventUserIdx: index("event_participants_event_user_idx").on(table.eventId, table.userId),
  userIdx: index("event_participants_user_idx").on(table.userId),
}));
export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'attending', 'not_attending', 'maybe'
  responseDate: timestamp("response_date").defaultNow(),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventUserIdx: index("event_rsvps_event_user_idx").on(table.eventId, table.userId),
  eventCreatedIdx: index("event_rsvps_event_created_idx").on(table.eventId, table.createdAt),
}));
export const eventUpdates = pgTable("event_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").default("announcement"), // 'announcement', 'update', 'cancellation'
  priority: varchar("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  eventCreatedIdx: index("event_updates_event_created_idx").on(table.eventId, table.createdAt),
}));
export const recurringEvents = pgTable("recurring_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentEventId: varchar("parent_event_id").notNull().references(() => events.id),
  recurrencePattern: varchar("recurrence_pattern").notNull(), // 'daily', 'weekly', 'monthly'
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceEnd: timestamp("recurrence_end"),
  maxOccurrences: integer("max_occurrences"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team chat channels
export const teamChannels = pgTable("team_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  description: text("description"),
  channelType: varchar("channel_type").default("general"), // 'general', 'announcements', 'events', 'strategy'
  isPrivate: boolean("is_private").default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team channel messages
export const teamChannelMessages = pgTable("team_channel_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => teamChannels.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // 'text', 'image', 'file', 'announcement'
  priority: varchar("priority").default("normal"), // 'normal', 'high', 'urgent'
  metadata: jsonb("metadata"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event analytics
export const eventAnalytics = pgTable("event_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  totalRsvps: integer("total_rsvps").default(0),
  confirmedAttendees: integer("confirmed_attendees").default(0),
  actualAttendees: integer("actual_attendees").default(0),
  avgEngagement: decimal("avg_engagement").default("0"),
  feedbackScore: decimal("feedback_score").default("0"),
  noShowRate: decimal("no_show_rate").default("0"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  paymentMethod: varchar("payment_method"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  paymentMethod: varchar("payment_method"), // 'stripe', 'paypal', 'apple_pay', etc.
  transactionId: varchar("transaction_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventParticipant = typeof eventParticipants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type InsertPayment = typeof payments.$inferInsert;

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").notNull(), // 'training', 'competition', 'social', 'workshop'
  sport: varchar("sport"),
  location: varchar("location"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  maxParticipants: integer("max_participants"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  placeId: varchar("place_id").references(() => places.id), // Venue/location
  isPublic: boolean("is_public").default(true),
  registrationDeadline: timestamp("registration_deadline"),
  approved: boolean("approved").default(true), // Package #13: Event moderation
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  locationDetail: jsonb("location_detail"),
  /** GPS track for cycling/running/hiking events — [[lat, lng], ...] */
  routeCoordinates: jsonb("route_coordinates"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  organizerCreatedIdx: index("events_organizer_created_idx").on(table.organizerId, table.createdAt),
  createdAtIdx: index("events_created_at_idx").on(table.createdAt),
  startDateIdx: index("events_start_date_idx").on(table.startDate),
  latLngIdx: index("events_lat_lng_idx").on(table.lat, table.lng),
}));  
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").references(() => users.id), // Link to shop owner
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category"), // 'equipment', 'apparel', 'nutrition', 'accessories'
  brand: varchar("brand"),
  imageUrl: varchar("image_url"),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rewards table
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  category: varchar("category").notNull(), // 'badge', 'cosmetic', 'premium', 'physical', 'experience'
  availability: varchar("availability").default("unlimited"), // 'unlimited', 'limited', 'seasonal', 'exclusive'
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  requiredLevel: integer("required_level"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User rewards (redemption history)
export const userRewards = pgTable("user_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id").notNull().references(() => rewards.id),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
  status: varchar("status").default("pending"), // 'pending', 'fulfilled', 'shipped', 'completed'
  deliveryInfo: jsonb("delivery_info"),
});

export type Event = typeof events.$inferSelect;
export type EventWithOrganizer = Event & { organizer: User };
export type InsertEvent = typeof events.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type UserReward = typeof userRewards.$inferSelect;
export type PerformanceData = {
  totalPoints: number;
  eventsAttended: number;
  teamsJoined: number;
  challengesCompleted: number;
  milestonesReached: any[];
  currentLevel: number;
  recentTransactions?: PointTransaction[];
  availableRewards?: Reward[];
  userRewards?: UserReward[];
};

// Messages table for direct messaging
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").references(() => users.id),
  roomId: varchar("room_id").references(() => chatRooms.id),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // 'text', 'image', 'file', 'system'
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type MessageWithSender = Message & { sender: User };
export type InsertMessage = typeof messages.$inferInsert;

// Analytics tables
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type").notNull(),
  eventName: varchar("event_name").notNull(), // Added missing column
  eventData: jsonb("event_data"),
  sessionId: varchar("session_id"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  /** Denormalized target for aggregation queries (e.g. popular content). */
  entityType: varchar("entity_type"),
  entityId: varchar("entity_id"),
  timestamp: timestamp("timestamp").defaultNow(), // Added missing timestamp
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  activeUsers: integer("active_users").default(0),
  newUsers: integer("new_users").default(0),
  postsCreated: integer("posts_created").default(0),
  eventsCreated: integer("events_created").default(0),
  teamsCreated: integer("teams_created").default(0),
  totalLikes: integer("total_likes").default(0),
  totalComments: integer("total_comments").default(0),
  avgSessionLength: integer("avg_session_length").default(0),
  engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull().default(sql`gen_random_uuid()`),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  pageViews: integer("page_views").default(0),
  actions: integer("actions").default(0),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  isActive: boolean("is_active").default(true),
});

export const popularContent = pgTable(
  "popular_content",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    contentType: varchar("content_type").notNull(), // 'post', 'event', 'team'
    contentId: varchar("content_id").notNull(),
    viewCount: integer("view_count").default(0),
    likeCount: integer("like_count").default(0),
    commentCount: integer("comment_count").default(0),
    shareCount: integer("share_count").default(0),
    engagementScore: decimal("engagement_score", { precision: 10, scale: 2 }),
    timeframe: varchar("timeframe").notNull(), // 'daily', 'weekly', 'monthly'
    date: timestamp("date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("popular_content_type_id_timeframe_uidx").on(
      t.contentType,
      t.contentId,
      t.timeframe,
    ),
  ],
);

// Recommendation service tables
export const recommendationCache = pgTable("recommendation_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  algorithm: varchar("algorithm").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userInteractions = pgTable("user_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  interactionType: varchar("interaction_type").notNull(), // 'view', 'like', 'share', 'comment'
  targetType: varchar("target_type").notNull(), // 'post', 'event', 'team', 'user'
  targetId: varchar("target_id").notNull(),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.0"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recommendationFeedback = pgTable("recommendation_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recommendationId: varchar("recommendation_id").notNull(),
  feedback: varchar("feedback").notNull(), // 'positive', 'negative', 'not_interested'
  reason: varchar("reason"), // 'relevant', 'irrelevant', 'seen_before', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Push notification tokens for Phase 2
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceType: varchar("device_type"), // 'mobile', 'desktop', 'tablet'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
});

// Schema types for recommendation service
export type UserInteraction = typeof userInteractions.$inferSelect;
export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type InsertUserInteraction = typeof userInteractions.$inferInsert;
export type InsertRecommendationFeedback = typeof recommendationFeedback.$inferInsert;

// Drizzle-zod schema exports for validation
// Client → POST /api/posts (authorId and counters are set server-side)
export const insertPostSchema = createInsertSchema(posts)
  .omit({
    id: true,
    authorId: true,
    likesCount: true,
    commentsCount: true,
    sharesCount: true,
    flagged: true,
    removed: true,
    removedReason: true,
    removedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    content: z.string().max(5000).optional().default(""),
    imageUrl: z.string().nullable().optional(),
    videoUrl: z.string().nullable().optional(),
    sport: z.string().nullable().optional(),
    location: z.string().max(256).optional(),
  })
  .refine(
    (data) => Boolean(data.content?.trim()) || Boolean(data.imageUrl) || Boolean(data.videoUrl),
    { message: "Post must include text or media", path: ["content"] },
  );
export const insertTeamSchema = createInsertSchema(teams);
export const insertMessageSchema = createInsertSchema(messages);
export const insertEventSchema = createInsertSchema(events);
export const updateUserProfileSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const usernameSchema = createInsertSchema(users).pick({ firstName: true, lastName: true });
export const insertPaymentSchema = createInsertSchema(payments);
export const insertOrderSchema = createInsertSchema(orders);
export const insertUserInteractionSchema = createInsertSchema(userInteractions);
export const insertRecommendationFeedbackSchema = createInsertSchema(recommendationFeedback);
export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({ id: true, createdAt: true, lastUsed: true });

// Trending content table
export const trendingContent = pgTable("trending_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: varchar("content_type").notNull(), // 'post', 'event', 'team', 'user'
  contentId: varchar("content_id").notNull(),
  score: decimal("score", { precision: 10, scale: 2 }).notNull(),
  timeframe: varchar("timeframe").notNull(), // 'hourly', 'daily', 'weekly'
  calculatedAt: timestamp("calculated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  preferences: jsonb("preferences").notNull(), // Store user preferences as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Recommendation tables
export const userRecommendations = pgTable("user_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recommendedItemId: varchar("recommended_item_id").notNull(),
  itemType: varchar("item_type").notNull(), // 'post', 'event', 'coach', 'team', 'user'
  score: decimal("score", { precision: 5, scale: 3 }).notNull(),
  algorithm: varchar("algorithm").notNull(), // 'content_based', 'collaborative', 'hybrid'
  reason: text("reason"), // explanation for the recommendation
  isViewed: boolean("is_viewed").default(false),
  isClicked: boolean("is_clicked").default(false),
  isLiked: boolean("is_liked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const userAiPreferences = pgTable("user_ai_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  preferredSports: text("preferred_sports").array(),
  skillLevels: jsonb("skill_levels"), // { sport: level } mapping
  locationPreference: varchar("location_preference"), // 'local', 'regional', 'global'
  availabilityDays: text("availability_days").array(), // ['monday', 'tuesday', etc]
  availabilityTimes: jsonb("availability_times"), // time slots preference
  coachingStyle: varchar("coaching_style"), // 'intensive', 'casual', 'competitive'
  budgetRange: jsonb("budget_range"), // { min: number, max: number }
  personalityTraits: text("personality_traits").array(),
  goals: text("goals").array(),
  experienceLevel: varchar("experience_level"), // 'beginner', 'intermediate', 'advanced', 'expert'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  context: jsonb("context"), // conversation context and history
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiChatSessions.id),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // 'text', 'recommendation', 'action'
  metadata: jsonb("metadata"), // additional data like recommendations, actions
  createdAt: timestamp("created_at").defaultNow(),
});

export const engagementPredictions = pgTable("engagement_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  predictionType: varchar("prediction_type").notNull(), // 'churn_risk', 'engagement_score', 'activity_likelihood'
  score: decimal("score", { precision: 5, scale: 3 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 3 }).notNull(),
  factors: jsonb("factors"), // contributing factors to the prediction
  recommendations: text("recommendations").array(), // suggested actions
  calculatedAt: timestamp("calculated_at").defaultNow(),
  validUntil: timestamp("valid_until").notNull(),
});

export const smartMatches = pgTable("smart_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchType: varchar("match_type").notNull(), // 'event', 'team', 'coach', 'training_partner'
  matchId: varchar("match_id").notNull(),
  compatibilityScore: decimal("compatibility_score", { precision: 5, scale: 3 }).notNull(),
  matchFactors: jsonb("match_factors"), // factors that contributed to the match
  isRecommended: boolean("is_recommended").default(true),
  userFeedback: varchar("user_feedback"), // 'interested', 'not_interested', 'contacted'
  createdAt: timestamp("created_at").defaultNow(),
});

// AI recommendation types
export type UserRecommendation = typeof userRecommendations.$inferSelect;
export type InsertUserRecommendation = typeof userRecommendations.$inferInsert;
export type UserAiPreferences = typeof userAiPreferences.$inferSelect;
export type InsertUserAiPreferences = typeof userAiPreferences.$inferInsert;
export type AiChatSession = typeof aiChatSessions.$inferSelect;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type EngagementPrediction = typeof engagementPredictions.$inferSelect;
export type SmartMatch = typeof smartMatches.$inferSelect;

// Missing schema exports for marketing, admin, and security modules
export const userReferrals = pgTable("user_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  referredId: varchar("referred_id").notNull().references(() => users.id),
  referralCode: varchar("referral_code").notNull(),
  status: varchar("status").default("pending"), // 'pending', 'completed', 'expired'
  rewardEarned: boolean("reward_earned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const adminMetrics = pgTable("admin_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: varchar("metric_type").notNull(), // 'user_activity', 'content_moderation', 'system_health'
  metricName: varchar("metric_name").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  timeframe: varchar("timeframe").notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
});

export const userPrivacySettings = pgTable("user_privacy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  profileVisibility: varchar("profile_visibility").default("public"), // 'public', 'friends', 'private'
  showEmail: boolean("show_email").default(false),
  showLocation: boolean("show_location").default(true),
  allowMessagesFrom: varchar("allow_messages_from").default("everyone"), // 'everyone', 'friends', 'none'
  allowTeamInvites: boolean("allow_team_invites").default(true),
  allowEventInvites: boolean("allow_event_invites").default(true),
  showOnlineStatus: boolean("show_online_status").default(true),
  analyticsOptOut: boolean("analytics_opt_out").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Export types for the new tables
export type UserReferral = typeof userReferrals.$inferSelect;
export type InsertUserReferral = typeof userReferrals.$inferInsert;
export type AdminMetric = typeof adminMetrics.$inferSelect;
export type InsertAdminMetric = typeof adminMetrics.$inferInsert;
export type UserPrivacySetting = typeof userPrivacySettings.$inferSelect;
export type InsertUserPrivacySetting = typeof userPrivacySettings.$inferInsert;

// Additional missing tables for marketing, admin, and security services
export const socialShares = pgTable("social_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  contentType: varchar("content_type").notNull(), // 'post', 'event', 'team'
  contentId: varchar("content_id").notNull(),
  platform: varchar("platform").notNull(), // 'facebook', 'twitter', 'instagram', etc.
  shareUrl: text("share_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'email', 'push', 'social', 'referral'
  status: varchar("status").default("draft"), // 'draft', 'active', 'paused', 'completed'
  targetAudience: jsonb("target_audience"), // criteria for targeting users
  content: jsonb("content"), // campaign content/templates
  metrics: jsonb("metrics"), // campaign performance metrics
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const flaggedContent = pgTable("flagged_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: varchar("content_type").notNull(), // 'post', 'comment', 'message', 'user_profile'
  contentId: varchar("content_id").notNull(),
  reportedBy: varchar("reported_by").notNull().references(() => users.id),
  reason: varchar("reason").notNull(), // 'spam', 'inappropriate', 'harassment', etc.
  description: text("description"),
  status: varchar("status").default("pending"), // 'pending', 'reviewed', 'action_taken', 'dismissed'
  moderatorId: varchar("moderator_id").references(() => users.id),
  moderatorNotes: text("moderator_notes"),
  actionTaken: varchar("action_taken"), // 'none', 'warning', 'content_removed', 'user_suspended'
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type").notNull(), // 'login_attempt', 'password_change', 'suspicious_activity'
  threatLevel: varchar("threat_level").default("low"), // 'low', 'medium', 'high', 'critical'
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  description: text("description"),
  metadata: jsonb("metadata"), // additional event data
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Export types for the additional tables
export type SocialShare = typeof socialShares.$inferSelect;
export type InsertSocialShare = typeof socialShares.$inferInsert;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = typeof marketingCampaigns.$inferInsert;
export type FlaggedContent = typeof flaggedContent.$inferSelect;
export type InsertFlaggedContent = typeof flaggedContent.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// Additional missing tables for remaining service modules
export const promotionViews = pgTable("promotion_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

export const userActions = pgTable("user_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actionType: varchar("action_type").notNull(), // 'login', 'logout', 'post_create', 'like', etc.
  entityType: varchar("entity_type"), // 'post', 'comment', 'team', etc.
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema validation exports
export const twoFactorSetupSchema = z.object({
  id: z.string(),
  secret: z.string(),
  backupCodes: z.array(z.string()).optional(),
});

export const changePasswordSchema = z.object({
  id: z.string(),
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

// Export types for the remaining tables
export type PromotionView = typeof promotionViews.$inferSelect;
export type InsertPromotionView = typeof promotionViews.$inferInsert;
export type UserAction = typeof userActions.$inferSelect;
export type InsertUserAction = typeof userActions.$inferInsert;

// Additional missing moderation tables
export const adminAlerts = pgTable("admin_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  severity: varchar("severity").default("medium"),
  relatedEntityType: varchar("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const moderationQueue = pgTable("moderation_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: varchar("content_type").notNull(),
  contentId: varchar("content_id").notNull(),
  flaggedContentId: varchar("flagged_content_id").references(() => flaggedContent.id),
  priority: integer("priority").default(1),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Export types for moderation tables
export type AdminAlert = typeof adminAlerts.$inferSelect;
export type InsertAdminAlert = typeof adminAlerts.$inferInsert;
export type ModerationQueue = typeof moderationQueue.$inferSelect;
export type InsertModerationQueue = typeof moderationQueue.$inferInsert;
export type ContentFilter = typeof contentFilters.$inferSelect;
export type InsertContentFilter = typeof contentFilters.$inferInsert;

// Stage 26: Advanced Marketplace Features & Dynamic Pricing Tables

// Dynamic pricing for products
export const productPricing = pgTable("product_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  discountType: varchar("discount_type").default("percentage"), // 'percentage', 'fixed', 'buy_one_get_one'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity"),
  userSpecific: boolean("user_specific").default(false),
  targetUserIds: text("target_user_ids").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product categories with hierarchical structure
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  parentCategoryId: varchar("parent_category_id"), // Self-reference handled via SQL
  imageUrl: varchar("image_url"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
});

// Enhanced product details with sports-specific attributes
export const productAttributes = pgTable("product_attributes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  attributeName: varchar("attribute_name").notNull(), // 'size', 'color', 'material', 'sport_type'
  attributeValue: varchar("attribute_value").notNull(),
  displayOrder: integer("display_order").default(0),
});

// Product reviews and ratings
export const productReviews = pgTable("product_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  reviewTitle: varchar("review_title"),
  reviewText: text("review_text"),
  isVerifiedPurchase: boolean("is_verified_purchase").default(false),
  helpfulVotes: integer("helpful_votes").default(0),
  reportedCount: integer("reported_count").default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Q&A system
export const productQuestions = pgTable("product_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  question: text("question").notNull(),
  isAnswered: boolean("is_answered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productAnswers = pgTable("product_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => productQuestions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  answer: text("answer").notNull(),
  isFromSeller: boolean("is_from_seller").default(false),
  helpfulVotes: integer("helpful_votes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User wishlists and favorites
export const userWishlists = pgTable("user_wishlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull().default("My Wishlist"),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wishlistId: varchar("wishlist_id").notNull().references(() => userWishlists.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  addedAt: timestamp("added_at").defaultNow(),
  notes: text("notes"),
});

// Inventory management and seller features
export const inventoryTracking = pgTable("inventory_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  currentStock: integer("current_stock").notNull(),
  reservedStock: integer("reserved_stock").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  restockDate: timestamp("restock_date"),
  supplierInfo: jsonb("supplier_info"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const productSellers = pgTable("product_sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  businessName: varchar("business_name"),
  businessType: varchar("business_type"), // 'coach', 'gym', 'retailer', 'manufacturer'
  description: text("description"),
  logoUrl: varchar("logo_url"),
  bannerUrl: varchar("banner_url"), // Shop cover/banner image
  location: varchar("location"), // Shop location
  city: varchar("city"),
  country: varchar("country"),
  email: varchar("email"), // Contact email
  phone: varchar("phone"), // Contact phone
  website: varchar("website"), // Shop website
  socialLinks: jsonb("social_links"), // {instagram, facebook, twitter, etc}
  operatingHours: jsonb("operating_hours"), // Business hours
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalSales: integer("total_sales").default(0),
  followersCount: integer("followers_count").default(0), // Shop followers count
  productsCount: integer("products_count").default(0), // Total products
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shop followers - users following shops
export const shopFollowers = pgTable("shop_followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => productSellers.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discount codes and promotions
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type").notNull(), // 'percentage', 'fixed', 'free_shipping'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  currentUses: integer("current_uses").default(0),
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  applicableProducts: text("applicable_products").array(),
  applicableCategories: text("applicable_categories").array(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-specific discount usage tracking
export const discountUsage = pgTable("discount_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discountCodeId: varchar("discount_code_id").notNull().references(() => discountCodes.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

// Product search analytics
export const productSearches = pgTable("product_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  searchQuery: varchar("search_query").notNull(),
  resultsCount: integer("results_count"),
  clickedProductId: varchar("clicked_product_id").references(() => products.id),
  sessionId: varchar("session_id"),
  searchedAt: timestamp("searched_at").defaultNow(),
});

// Personalized product recommendations
export const productRecommendations = pgTable("product_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  recommendationType: varchar("recommendation_type").notNull(), // 'collaborative', 'content_based', 'trending', 'personalized'
  score: decimal("score", { precision: 5, scale: 4 }).notNull(),
  reason: varchar("reason"), // 'bought_together', 'similar_users', 'browsing_history'
  metadata: jsonb("metadata"),
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Flash sales and limited-time offers
export const flashSales = pgTable("flash_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  maxQuantity: integer("max_quantity"),
  currentQuantity: integer("current_quantity").default(0),
  applicableProducts: text("applicable_products").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product view tracking for analytics
export const productViews = pgTable("product_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  viewDuration: integer("view_duration"), // in seconds
  referrerUrl: varchar("referrer_url"),
  deviceType: varchar("device_type"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Type exports for new Stage 26 tables
export type ProductPricing = typeof productPricing.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type ProductReview = typeof productReviews.$inferSelect;
export type ProductQuestion = typeof productQuestions.$inferSelect;
export type ProductAnswer = typeof productAnswers.$inferSelect;
export type UserWishlist = typeof userWishlists.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InventoryTracking = typeof inventoryTracking.$inferSelect;
export type ProductSeller = typeof productSellers.$inferSelect;
export type ShopFollower = typeof shopFollowers.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type DiscountUsage = typeof discountUsage.$inferSelect;
export type ProductSearch = typeof productSearches.$inferSelect;
export type ProductRecommendation = typeof productRecommendations.$inferSelect;
export type FlashSale = typeof flashSales.$inferSelect;
export type ProductView = typeof productViews.$inferSelect;

// Insert types for new tables
export type InsertProductPricing = typeof productPricing.$inferInsert;
export type InsertProductCategory = typeof productCategories.$inferInsert;
export type InsertProductAttribute = typeof productAttributes.$inferInsert;
export type InsertProductReview = typeof productReviews.$inferInsert;
export type InsertProductQuestion = typeof productQuestions.$inferInsert;
export type InsertProductAnswer = typeof productAnswers.$inferInsert;
export type InsertUserWishlist = typeof userWishlists.$inferInsert;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;
export type InsertInventoryTracking = typeof inventoryTracking.$inferInsert;
export type InsertProductSeller = typeof productSellers.$inferInsert;
export type InsertShopFollower = typeof shopFollowers.$inferInsert;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;
export type InsertDiscountUsage = typeof discountUsage.$inferInsert;
export type InsertProductSearch = typeof productSearches.$inferInsert;
export type InsertProductRecommendation = typeof productRecommendations.$inferInsert;
export type InsertFlashSale = typeof flashSales.$inferInsert;
export type InsertProductView = typeof productViews.$inferInsert;

// Stage 29: AI-Powered Skill Assessment & Training Recommendations

// Skill assessment videos and uploads
export const skillAssessments = pgTable("skill_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: varchar("sport").notNull(),
  skillType: varchar("skill_type").notNull(), // 'technique', 'fitness', 'accuracy', 'speed', 'form'
  videoUrl: varchar("video_url"),
  videoFileName: varchar("video_file_name"),
  videoFileSize: integer("video_file_size"), // in bytes
  videoDuration: integer("video_duration"), // in seconds
  status: varchar("status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }), // 0-100 score
  feedback: text("feedback"),
  analysisData: jsonb("analysis_data"), // detailed AI analysis results
  processingTime: integer("processing_time"), // in seconds
  coachReviewRequested: boolean("coach_review_requested").default(false),
  coachId: varchar("coach_id").references(() => users.id),
  coachFeedback: text("coach_feedback"),
  coachScore: decimal("coach_score", { precision: 5, scale: 2 }),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Detailed skill metrics from AI analysis
export const skillMetrics = pgTable("skill_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => skillAssessments.id),
  metricName: varchar("metric_name").notNull(), // 'form_consistency', 'speed', 'accuracy', 'balance', etc.
  score: decimal("score", { precision: 5, scale: 2 }).notNull(), // 0-100 score
  feedback: text("feedback"),
  improvementAreas: text("improvement_areas").array(),
  keyFrames: jsonb("key_frames"), // timestamps and analysis of key moments
  createdAt: timestamp("created_at").defaultNow(),
});

// Training recommendations generated by AI
export const trainingRecommendations = pgTable("training_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: varchar("sport").notNull(),
  skillArea: varchar("skill_area").notNull(), // area to improve
  recommendationType: varchar("recommendation_type").notNull(), // 'drill', 'exercise', 'tutorial', 'practice'
  title: varchar("title").notNull(),
  description: text("description"),
  difficulty: varchar("difficulty").default("beginner"), // 'beginner', 'intermediate', 'advanced'
  estimatedDuration: integer("estimated_duration"), // in minutes
  equipmentNeeded: text("equipment_needed").array(),
  videoUrl: varchar("video_url"),
  instructions: text("instructions"),
  frequency: varchar("frequency"), // 'daily', 'weekly', '3x_week', etc.
  priority: integer("priority").default(1), // 1-5 priority level
  sourceAssessmentId: varchar("source_assessment_id").references(() => skillAssessments.id),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  effectiveness: decimal("effectiveness", { precision: 3, scale: 2 }), // user rating 0-5
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// User skill profiles and progress tracking
export const userSkillProfiles = pgTable("user_skill_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: varchar("sport").notNull(),
  skillLevel: varchar("skill_level").default("beginner"), // 'beginner', 'intermediate', 'advanced', 'expert'
  overallRating: decimal("overall_rating", { precision: 5, scale: 2 }).default("0"),
  strengthAreas: text("strength_areas").array(),
  improvementAreas: text("improvement_areas").array(),
  recentAssessments: integer("recent_assessments").default(0),
  totalAssessments: integer("total_assessments").default(0),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }).default("0"),
  progressTrend: varchar("progress_trend").default("stable"), // 'improving', 'declining', 'stable'
  lastAssessmentDate: timestamp("last_assessment_date"),
  targetSkillLevel: varchar("target_skill_level"),
  targetDate: timestamp("target_date"),
  coachId: varchar("coach_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Skill progress history
export const skillProgressHistory = pgTable("skill_progress_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  skillProfileId: varchar("skill_profile_id").notNull().references(() => userSkillProfiles.id),
  assessmentId: varchar("assessment_id").notNull().references(() => skillAssessments.id),
  previousScore: decimal("previous_score", { precision: 5, scale: 2 }),
  newScore: decimal("new_score", { precision: 5, scale: 2 }).notNull(),
  improvement: decimal("improvement", { precision: 5, scale: 2 }), // positive or negative
  skillAreas: jsonb("skill_areas"), // detailed breakdown of improvements
  milestone: varchar("milestone"), // if a milestone was reached
  badgeEarned: varchar("badge_earned"), // if a badge was earned from this progress
  createdAt: timestamp("created_at").defaultNow(),
});

// Training sessions and practice logs
export const trainingSessions = pgTable("training_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recommendationId: varchar("recommendation_id").references(() => trainingRecommendations.id),
  sport: varchar("sport").notNull(),
  sessionType: varchar("session_type").notNull(), // 'practice', 'drill', 'assessment_prep', 'free_training'
  title: varchar("title").notNull(),
  duration: integer("duration").notNull(), // in minutes
  intensity: varchar("intensity"), // 'light', 'moderate', 'high'
  focusAreas: text("focus_areas").array(),
  notes: text("notes"),
  selfRating: decimal("self_rating", { precision: 3, scale: 2 }), // 0-5 user rating
  completed: boolean("completed").default(false),
  scheduledFor: timestamp("scheduled_for"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team skill matching and recommendations
export const teamSkillMatches = pgTable("team_skill_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(), // 0-100 compatibility score
  skillAlignment: jsonb("skill_alignment"), // detailed skill compatibility analysis
  recommendedRole: varchar("recommended_role"),
  strengthsMatch: text("strengths_match").array(),
  gapsToFill: text("gaps_to_fill").array(),
  status: varchar("status").default("suggested"), // 'suggested', 'invited', 'accepted', 'declined'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI analysis cache for performance optimization
export const aiAnalysisCache = pgTable("ai_analysis_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: varchar("cache_key").notNull(), // hash of input parameters
  analysisType: varchar("analysis_type").notNull(), // 'video_analysis', 'skill_assessment', 'recommendation'
  inputHash: varchar("input_hash").notNull(),
  resultData: jsonb("result_data").notNull(),
  modelVersion: varchar("model_version"),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  processingTime: integer("processing_time"), // in seconds
  hitCount: integer("hit_count").default(0),
  lastAccessed: timestamp("last_accessed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Type exports for Stage 29 tables
export type SkillAssessment = typeof skillAssessments.$inferSelect;
export type InsertSkillAssessment = typeof skillAssessments.$inferInsert;
export type SkillMetric = typeof skillMetrics.$inferSelect;
export type InsertSkillMetric = typeof skillMetrics.$inferInsert;
export type TrainingRecommendation = typeof trainingRecommendations.$inferSelect;
export type InsertTrainingRecommendation = typeof trainingRecommendations.$inferInsert;
export type UserSkillProfile = typeof userSkillProfiles.$inferSelect;
export type InsertUserSkillProfile = typeof userSkillProfiles.$inferInsert;
export type SkillProgressHistory = typeof skillProgressHistory.$inferSelect;
export type InsertSkillProgressHistory = typeof skillProgressHistory.$inferInsert;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;
export type TeamSkillMatch = typeof teamSkillMatches.$inferSelect;
export type InsertTeamSkillMatch = typeof teamSkillMatches.$inferInsert;
export type AiAnalysisCache = typeof aiAnalysisCache.$inferSelect;
export type InsertAiAnalysisCache = typeof aiAnalysisCache.$inferInsert;

// Coach bookings for Phase 1 (Stripe checkout)
export const coachBookings = pgTable("coach_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  coachId: varchar("coach_id").notNull().references(() => coaches.id),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").notNull(), // in minutes
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'completed', 'cancelled'
  paymentId: varchar("payment_id").references(() => payments.id),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  coachPayout: decimal("coach_payout", { precision: 10, scale: 2 }),
  reviewRating: integer("review_rating"),
  reviewText: text("review_text"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Premium subscriptions for Phase 1
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plan: varchar("plan").notNull(), // 'basic', 'pro', 'elite'
  status: varchar("status").default("active"), // 'active', 'cancelled', 'expired', 'past_due'
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Livestream sessions for Phase 4
export const streamSessions = pgTable("stream_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamerId: varchar("streamer_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  streamType: varchar("stream_type").default("event"), // 'event', 'training', 'game', 'practice'
  eventId: varchar("event_id").references(() => events.id),
  teamId: varchar("team_id").references(() => teams.id),
  streamUrl: varchar("stream_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  status: varchar("status").default("scheduled"), // 'scheduled', 'live', 'ended', 'cancelled'
  viewerCount: integer("viewer_count").default(0),
  peakViewers: integer("peak_viewers").default(0),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  teamCreatedIdx: index("stream_sessions_team_created_idx").on(table.teamId, table.createdAt),
  eventIdx: index("stream_sessions_event_idx").on(table.eventId),
}));

export const insertStreamSessionSchema = createInsertSchema(streamSessions).omit({ id: true, createdAt: true, viewerCount: true, peakViewers: true });

// Person Presence - tracks "who is here now" on the map
export const personPresence = pgTable("person_presence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  status: varchar("status").default("active"), // active, idle, offline
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  accuracyM: integer("accuracy_m"),
  visibility: varchar("visibility").default("public"), // public, followers, friends, family, team_only, ghost
  blurRadiusM: integer("blur_radius_m").default(0),
  city: varchar("city"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  latLngIdx: index("person_presence_lat_lng_idx").on(table.lat, table.lng),
  userIdx: index("person_presence_user_idx").on(table.userId),
}));

/** Inner circle for location sharing (e.g. family list — Snapchat-style). */
export const userLocationCircles = pgTable(
  "user_location_circles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    memberId: varchar("member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    circle: varchar("circle").notNull().default("family"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userMemberCircleUnique: uniqueIndex("user_location_circles_user_member_circle").on(
      table.userId,
      table.memberId,
      table.circle,
    ),
  }),
);

// Stories feature - Instagram-style stories with 24h expiry (extended for map entities)
export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ownerType: varchar("owner_type").default("person"), // person, team, place, event
  ownerId: varchar("owner_id"), // references the entity id (user_id for person, team_id for team, etc.)
  mediaUrl: varchar("media_url").notNull(),
  mediaType: varchar("media_type").notNull(), // 'image', 'video', 'text'
  thumbnailUrl: varchar("thumbnail_url"),
  caption: text("caption"),
  hasAudio: boolean("has_audio").default(false),
  duration: integer("duration").default(5), // seconds
  backgroundColor: varchar("background_color").default("#000000"), // for text stories
  visibility: varchar("visibility").default("public"), // 'public', 'followers', 'friends', 'team_only', 'attendees_only'
  viewCount: integer("view_count").default(0),
  expiresAt: timestamp("expires_at").notNull(), // 24h from creation
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userCreatedIdx: index("stories_user_created_idx").on(table.userId, table.createdAt),
}));
export const storyViewers = pgTable("story_viewers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => stories.id),
  viewerId: varchar("viewer_id").notNull().references(() => users.id),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Story replies/comments
export const storyReplies = pgTable("story_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storyId: varchar("story_id").notNull().references(() => stories.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved posts feature
export const savedPosts = pgTable("saved_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  postId: varchar("post_id").notNull().references(() => posts.id),
  collectionName: varchar("collection_name").default("saved"), // allow users to organize saved posts
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userCreatedIdx: index("saved_posts_user_created_idx").on(table.userId, table.createdAt),
  postIdx: index("saved_posts_post_idx").on(table.postId),
}));
export const streamViewers = pgTable("stream_viewers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streamSessions.id),
  viewerId: varchar("viewer_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
});

// Live stream comments
export const streamComments = pgTable("stream_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streamSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Live stream reactions (hearts, likes during stream)
export const streamReactions = pgTable("stream_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").notNull().references(() => streamSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reactionType: varchar("reaction_type").default("heart"), // 'heart', 'clap', 'fire', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// AI recommendations for Phase 5
export const aiRecommendations = pgTable("ai_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  recommendationType: varchar("recommendation_type").notNull(), // 'team', 'coach', 'event', 'training', 'product'
  recommendedEntityType: varchar("recommended_entity_type").notNull(), // 'team', 'coach', 'event', etc.
  recommendedEntityId: varchar("recommended_entity_id").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }).notNull(), // confidence score
  reasoning: text("reasoning"), // AI explanation for the recommendation
  metadata: jsonb("metadata"), // additional data
  status: varchar("status").default("active"), // 'active', 'dismissed', 'accepted'
  userFeedback: varchar("user_feedback"), // 'helpful', 'not_helpful', 'irrelevant'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// Places ecosystem - Facebook/Instagram-style business pages for gyms and venues
export const places = pgTable("places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // 'gym', 'court', 'field', 'studio', 'pool', 'track', 'other'
  sports: text("sports").array().default(sql`ARRAY[]::text[]`), // Array of sports offered
  bio: text("bio"),
  description: text("description"),
  profileImageUrl: varchar("profile_image_url"),
  coverImageUrl: varchar("cover_image_url"),
  email: varchar("email"),
  phone: varchar("phone"),
  website: varchar("website"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  country: varchar("country").default("USA"),
  zipCode: varchar("zip_code"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  hours: jsonb("hours"), // { monday: '9am-9pm', tuesday: '9am-9pm', ... }
  amenities: text("amenities").array().default(sql`ARRAY[]::text[]`), // ['parking', 'showers', 'equipment', etc]
  pricing: jsonb("pricing"), // flexible pricing structure
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  followersCount: integer("followers_count").default(0),
  reviewsCount: integer("reviews_count").default(0),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default('0'),
  bookingsCount: integer("bookings_count").default(0),
  viewsCount: integer("views_count").default(0),
  bookingMode: varchar("booking_mode").default("request"), // slots | membership | request | none
  slotDurationMinutes: integer("slot_duration_minutes").default(60),
  slotPrice: decimal("slot_price", { precision: 10, scale: 2 }),
  featuredHighlightIds: text("featured_highlight_ids").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  latLngIdx: index("places_lat_lng_idx").on(table.latitude, table.longitude),
  ownerCreatedIdx: index("places_owner_created_idx").on(table.ownerId, table.createdAt),
}));
export const placePhotos = pgTable("place_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: 'cascade' }),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Place followers (users who follow the place)
export const placeFollowers = pgTable("place_followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationsEnabled: boolean("notifications_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Place reviews
export const placeReviews = pgTable("place_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  content: text("content"),
  photos: text("photos").array().default(sql`ARRAY[]::text[]`),
  helpfulCount: integer("helpful_count").default(0),
  visitDate: timestamp("visit_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gym / club membership tiers (Venues V3)
export const placeMembershipPlans = pgTable("place_membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingInterval: varchar("billing_interval").notNull().default("monthly"), // monthly | annual | once
  features: text("features").array().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  stripePriceId: varchar("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  placeOrderIdx: index("place_membership_plans_place_order_idx").on(table.placeId, table.displayOrder),
}));

/** Owner-closed slots (maintenance, private event) — hidden from public availability. */
export const placeSlotBlocks = pgTable("place_slot_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  placeStartIdx: index("place_slot_blocks_place_start_idx").on(table.placeId, table.startTime),
}));

// Place bookings
export const placeBookings = pgTable("place_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  membershipPlanId: varchar("membership_plan_id").references(() => placeMembershipPlans.id, { onDelete: "set null" }),
  bookingType: varchar("booking_type").notNull(), // 'session', 'court', 'class', 'membership'
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status").default("pending"), // 'pending', 'confirmed', 'cancelled', 'completed'
  price: decimal("price", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status").default("unpaid"), // 'unpaid', 'paid', 'refunded'
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Place posts (posts made by the place, appear in feed with place branding)
export const placePosts = pgTable("place_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placeId: varchar("place_id").notNull().references(() => places.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id), // who created the post
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  videoUrl: varchar("video_url"),
  mediaType: varchar("media_type").default("text"), // 'text', 'image', 'video'
  postType: varchar("post_type").default("update"), // 'update', 'event', 'promotion', 'announcement'
  eventData: jsonb("event_data"),
  visibility: varchar("visibility").default("public"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  sharesCount: integer("shares_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const placePostLikes = pgTable("place_post_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placePostId: varchar("place_post_id").notNull().references(() => placePosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postUserIdx: index("place_post_likes_post_user_idx").on(table.placePostId, table.userId),
  postUserUnique: uniqueIndex("place_post_likes_post_user_unique").on(table.placePostId, table.userId),
}));

export const placePostComments = pgTable("place_post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placePostId: varchar("place_post_id").notNull().references(() => placePosts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  postCreatedIdx: index("place_post_comments_post_created_idx").on(table.placePostId, table.createdAt),
}));

// Places ecosystem types
export type Place = typeof places.$inferSelect;
export type InsertPlace = typeof places.$inferInsert;
export type PlacePhoto = typeof placePhotos.$inferSelect;
export type InsertPlacePhoto = typeof placePhotos.$inferInsert;
export type PlaceFollower = typeof placeFollowers.$inferSelect;
export type InsertPlaceFollower = typeof placeFollowers.$inferInsert;
export type PlaceReview = typeof placeReviews.$inferSelect;
export type InsertPlaceReview = typeof placeReviews.$inferInsert;
export type PlaceMembershipPlan = typeof placeMembershipPlans.$inferSelect;
export type InsertPlaceMembershipPlan = typeof placeMembershipPlans.$inferInsert;
export type PlaceSlotBlock = typeof placeSlotBlocks.$inferSelect;
export type InsertPlaceSlotBlock = typeof placeSlotBlocks.$inferInsert;
export type PlaceBooking = typeof placeBookings.$inferSelect;
export type InsertPlaceBooking = typeof placeBookings.$inferInsert;
export type PlacePost = typeof placePosts.$inferSelect;
export type InsertPlacePost = typeof placePosts.$inferInsert;

// Type exports for new tables
export type CoachBooking = typeof coachBookings.$inferSelect;
export type InsertCoachBooking = typeof coachBookings.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;
export type StreamSession = typeof streamSessions.$inferSelect;
export type InsertStreamSession = typeof streamSessions.$inferInsert;
export type AiRecommendation = typeof aiRecommendations.$inferSelect;
export type InsertAiRecommendation = typeof aiRecommendations.$inferInsert;

// Presence types
export type PersonPresence = typeof personPresence.$inferSelect;
export type InsertPersonPresence = typeof personPresence.$inferInsert;
export const insertPersonPresenceSchema = createInsertSchema(personPresence).omit({ id: true, updatedAt: true });
export type UserLocationCircle = typeof userLocationCircles.$inferSelect;
export type InsertUserLocationCircle = typeof userLocationCircles.$inferInsert;

// Stories and live streaming types
export type Story = typeof stories.$inferSelect;
export type InsertStory = typeof stories.$inferInsert;
export type StoryViewer = typeof storyViewers.$inferSelect;
export type StoryReply = typeof storyReplies.$inferSelect;
export type InsertStoryReply = typeof storyReplies.$inferInsert;
export type SavedPost = typeof savedPosts.$inferSelect;
export type InsertSavedPost = typeof savedPosts.$inferInsert;
export type StreamViewer = typeof streamViewers.$inferSelect;
export type StreamComment = typeof streamComments.$inferSelect;
export type InsertStreamComment = typeof streamComments.$inferInsert;
export type StreamReaction = typeof streamReactions.$inferSelect;
export type InsertStreamReaction = typeof streamReactions.$inferInsert;

// Enhanced story type with user info
export type StoryWithUser = Story & { user: User; viewedByCurrentUser?: boolean };

// Zod schemas for new features
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true, viewCount: true });
export const insertSavedPostSchema = createInsertSchema(savedPosts).omit({ id: true, createdAt: true });
export const insertStreamCommentSchema = createInsertSchema(streamComments).omit({ id: true, createdAt: true });
export const insertStreamReactionSchema = createInsertSchema(streamReactions).omit({ id: true, createdAt: true });

// Package #3: User live status for real-time player pins (opt-in)
export const userLiveStatus = pgTable("user_live_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  isLive: boolean("is_live").default(false), // User opt-in for live location
  currentCoords: jsonb("current_coords"), // { lat: number, lng: number } - rounded to 3 decimals
  currentActivity: varchar("current_activity"), // 'training', 'competing', 'coaching', etc.
  sport: varchar("sport"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-expire after inactivity
});

export type UserLiveStatus = typeof userLiveStatus.$inferSelect;
export type InsertUserLiveStatus = typeof userLiveStatus.$inferInsert;
export const insertUserLiveStatusSchema = createInsertSchema(userLiveStatus).omit({ 
  id: true, 
  lastUpdated: true
});

// Zod schemas for Places ecosystem
export const insertPlaceSchema = createInsertSchema(places).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  followersCount: true,
  reviewsCount: true,
  averageRating: true,
  bookingsCount: true,
  viewsCount: true,
  ownerId: true,
});
export const insertPlacePhotoSchema = createInsertSchema(placePhotos).omit({ id: true, createdAt: true });
export const insertPlaceFollowerSchema = createInsertSchema(placeFollowers).omit({ id: true, createdAt: true });
export const insertPlaceReviewSchema = createInsertSchema(placeReviews).omit({ id: true, createdAt: true, updatedAt: true, helpfulCount: true });
export const insertPlaceMembershipPlanSchema = createInsertSchema(placeMembershipPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPlaceSlotBlockSchema = createInsertSchema(placeSlotBlocks).omit({
  id: true,
  createdAt: true,
});
export const insertPlaceBookingSchema = createInsertSchema(placeBookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlacePostSchema = createInsertSchema(placePosts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  likesCount: true,
  commentsCount: true,
  sharesCount: true
});

// Package #10: Competitive Challenges Zod schemas
export const insertCompetitiveMatchSchema = createInsertSchema(competitiveMatches).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertMatchParticipantSchema = createInsertSchema(matchParticipants).omit({ 
  id: true, 
  createdAt: true 
});
export const insertMatchResultSchema = createInsertSchema(matchResults).omit({ 
  id: true, 
  createdAt: true 
});
export const insertRatingHistorySchema = createInsertSchema(ratingHistory).omit({ 
  id: true, 
  createdAt: true 
});

// ========== PACKAGE #11: PAYMENTS & WALLET SYSTEM ==========

// Wallets - One per user/team to hold balance
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: varchar("owner_type").notNull(), // 'user', 'team', 'place'
  ownerId: varchar("owner_id").notNull(), // Foreign key to users/teams/places
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(), // ISO 4217
  status: varchar("status").default("active").notNull(), // 'active', 'frozen', 'closed'
  stripeAccountId: varchar("stripe_account_id"), // For payout accounts
  paypalEmail: varchar("paypal_email"), // For PayPal payouts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueOwner: uniqueIndex("wallets_unique_owner").on(table.ownerType, table.ownerId),
}));

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

// Transactions - Complete ledger of all money movements
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id),
  type: varchar("type").notNull(), // 'deposit', 'withdrawal', 'transfer', 'purchase', 'refund', 'escrow_hold', 'escrow_release', 'donation', 'sponsorship', 'challenge_entry', 'challenge_payout'
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status").default("completed").notNull(), // 'pending', 'completed', 'failed', 'reversed'
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  
  // References to related entities
  relatedEntityType: varchar("related_entity_type"), // 'challenge', 'event', 'product', 'booking', 'donation', etc.
  relatedEntityId: varchar("related_entity_id"),
  counterpartyWalletId: varchar("counterparty_wallet_id").references(() => wallets.id), // For transfers
  
  // Payment gateway references
  paymentIntentId: varchar("payment_intent_id").references(() => paymentIntents.id), // Reference to paymentIntents table
  stripeChargeId: varchar("stripe_charge_id"),
  paypalTransactionId: varchar("paypal_transaction_id"),
  
  // Metadata
  description: text("description"),
  metadata: jsonb("metadata"), // Flexible data storage
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  walletIdx: index("transactions_wallet_idx").on(table.walletId),
  typeIdx: index("transactions_type_idx").on(table.type),
  relatedEntityIdx: index("transactions_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Payment Intents - Track Stripe/PayPal payment flows
export const paymentIntents = pgTable("payment_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  provider: varchar("provider").notNull(), // 'stripe', 'paypal'
  providerIntentId: varchar("provider_intent_id").notNull(), // stripe_pi_xxx or paypal_xxx
  
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status").default("pending").notNull(), // 'pending', 'processing', 'succeeded', 'failed', 'canceled', 'requires_action'
  
  // Purpose of payment
  purpose: varchar("purpose").notNull(), // 'add_funds', 'purchase', 'donation', 'booking', 'challenge_entry', 'event_ticket'
  targetEntityType: varchar("target_entity_type"), // 'wallet', 'product', 'event', 'challenge', etc.
  targetEntityId: varchar("target_entity_id"),
  
  // Payment method
  paymentMethod: varchar("payment_method"), // 'card', 'bank_transfer', 'paypal', etc.
  
  // Provider-specific data
  providerData: jsonb("provider_data"), // Stripe/PayPal webhook data
  clientSecret: varchar("client_secret"), // For frontend payment confirmation
  
  // Error handling
  errorCode: varchar("error_code"),
  errorMessage: text("error_message"),
  
  // Fulfillment
  fulfilledAt: timestamp("fulfilled_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("payment_intents_user_idx").on(table.userId),
  providerIntentIdx: index("payment_intents_provider_idx").on(table.provider, table.providerIntentId),
  statusIdx: index("payment_intents_status_idx").on(table.status),
}));

export type PaymentIntent = typeof paymentIntents.$inferSelect;
export type InsertPaymentIntent = typeof paymentIntents.$inferInsert;

// Escrow - Hold funds temporarily for challenges, events, marketplace
export const escrowHolds = pgTable("escrow_holds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").notNull().references(() => wallets.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  status: varchar("status").default("held").notNull(), // 'held', 'released', 'refunded', 'expired'
  
  // What is this holding for?
  purpose: varchar("purpose").notNull(), // 'challenge_entry', 'event_ticket', 'marketplace_order', 'booking'
  relatedEntityType: varchar("related_entity_type").notNull(), // 'challenge', 'event', 'order', 'booking'
  relatedEntityId: varchar("related_entity_id").notNull(),
  
  // Release conditions
  releaseCondition: varchar("release_condition"), // 'challenge_complete', 'event_start', 'order_delivered', 'manual_approval'
  releaseToWalletId: varchar("release_to_wallet_id").references(() => wallets.id), // Who gets the funds when released
  
  // Auto-expiry
  expiresAt: timestamp("expires_at"),
  
  // Tracking
  heldAt: timestamp("held_at").defaultNow(),
  releasedAt: timestamp("released_at"),
  relatedTransactionId: varchar("related_transaction_id").references(() => transactions.id),
  
  // Metadata
  notes: text("notes"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  walletIdx: index("escrow_holds_wallet_idx").on(table.walletId),
  entityIdx: index("escrow_holds_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
  statusIdx: index("escrow_holds_status_idx").on(table.status),
}));

export type EscrowHold = typeof escrowHolds.$inferSelect;
export type InsertEscrowHold = typeof escrowHolds.$inferInsert;

// Package #11: Zod schemas
export const insertWalletSchema = createInsertSchema(wallets).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  balance: true
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true, 
  createdAt: true 
});
export const insertPaymentIntentSchema = createInsertSchema(paymentIntents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertEscrowHoldSchema = createInsertSchema(escrowHolds).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  heldAt: true
});

// ============================================================================
// Package #12: PERFORMANCE & ANALYTICS
// ============================================================================

// Facts - Append-only event stream for analytics
export const analyticsFacts = pgTable("analytics_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: timestamp("ts").defaultNow().notNull(),
  kind: varchar("kind").notNull(), // post_like, challenge_completed, order_purchase, etc.
  
  // Actor (who did this)
  actorType: varchar("actor_type"), // 'user', 'team', 'gym', 'brand'
  actorId: varchar("actor_id"),
  
  // Target (what was acted upon)
  targetType: varchar("target_type"), // 'post', 'event', 'product', 'challenge', etc.
  targetId: varchar("target_id"),
  
  // Context
  sport: varchar("sport"),
  geoCountry: varchar("geo_country"),
  geoCity: varchar("geo_city"),
  geoLat: decimal("geo_lat", { precision: 10, scale: 7 }),
  geoLng: decimal("geo_lng", { precision: 10, scale: 7 }),
  
  // Financial
  amountCents: integer("amount_cents"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Additional metadata
  meta: jsonb("meta"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tsIdx: index("analytics_facts_ts_idx").on(table.ts),
  kindIdx: index("analytics_facts_kind_idx").on(table.kind),
  actorIdx: index("analytics_facts_actor_idx").on(table.actorType, table.actorId),
  targetIdx: index("analytics_facts_target_idx").on(table.targetType, table.targetId),
}));

export type AnalyticsFact = typeof analyticsFacts.$inferSelect;
export type InsertAnalyticsFact = typeof analyticsFacts.$inferInsert;

// User Rollups - Precomputed user performance metrics
export const userRollups = pgTable("user_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  period: varchar("period").notNull(), // 'day', 'week', 'month', 'all'
  periodStart: timestamp("period_start").notNull(), // Package #12: NOT NULL for unique index
  periodEnd: timestamp("period_end"),
  
  // Social activity
  posts: integer("posts").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  
  // Challenge performance
  challengesPlayed: integer("challenges_played").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  rating: decimal("rating", { precision: 10, scale: 2 }).default("0"),
  ratingDelta: decimal("rating_delta", { precision: 10, scale: 2 }).default("0"),
  
  // Progression
  xp: integer("xp").default(0),
  streakDays: integer("streak_days").default(0),
  trainingHours: decimal("training_hours", { precision: 10, scale: 2 }).default("0"),
  
  // Financial
  donationsReceivedCents: integer("donations_received_cents").default(0),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userPeriodIdx: uniqueIndex("user_rollups_user_period_idx").on(table.userId, table.period, table.periodStart),
}));

export type UserRollup = typeof userRollups.$inferSelect;
export type InsertUserRollup = typeof userRollups.$inferInsert;

// Team Rollups - Team performance metrics
export const teamRollups = pgTable("team_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  period: varchar("period").notNull(), // 'week', 'month', 'season', 'all'
  periodStart: timestamp("period_start").notNull(), // Package #12: NOT NULL for unique index
  periodEnd: timestamp("period_end"),
  
  // Match record
  matches: integer("matches").default(0),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  draws: integer("draws").default(0),
  
  // Engagement
  participationRate: decimal("participation_rate", { precision: 5, scale: 2 }).default("0"), // Percentage
  followersGained: integer("followers_gained").default(0),
  
  // Financial
  donationsCents: integer("donations_cents").default(0),
  sponsorshipCents: integer("sponsorship_cents").default(0),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  teamPeriodIdx: uniqueIndex("team_rollups_team_period_idx").on(table.teamId, table.period, table.periodStart),
}));

export type TeamRollup = typeof teamRollups.$inferSelect;
export type InsertTeamRollup = typeof teamRollups.$inferInsert;

// Gym/Place Rollups - Facility analytics
export const gymRollups = pgTable("gym_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull().references(() => places.id),
  period: varchar("period").notNull(), // 'week', 'month', 'all'
  periodStart: timestamp("period_start").notNull(), // Package #12: NOT NULL for unique index
  periodEnd: timestamp("period_end"),
  
  // Activity
  bookings: integer("bookings").default(0),
  attendance: integer("attendance").default(0),
  
  // Financial
  revenueCents: integer("revenue_cents").default(0),
  refundsCents: integer("refunds_cents").default(0),
  
  // Top classes (top 5 class IDs with counts)
  topClasses: jsonb("top_classes"), // [{ classId: string, count: number }]
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  gymPeriodIdx: uniqueIndex("gym_rollups_gym_period_idx").on(table.gymId, table.period, table.periodStart),
}));

export type GymRollup = typeof gymRollups.$inferSelect;
export type InsertGymRollup = typeof gymRollups.$inferInsert;

// Event Rollups - Event analytics
export const eventRollups = pgTable("event_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id),
  
  // Ticket sales
  ticketsSold: integer("tickets_sold").default(0),
  revenueCents: integer("revenue_cents").default(0),
  attendees: integer("attendees").default(0),
  
  // Engagement
  views: integer("views").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  
  // Demographics
  demographics: jsonb("demographics"), // { male: number, female: number, other: number, ages: { '18-24': number, ... } }
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  eventIdx: uniqueIndex("event_rollups_event_idx").on(table.eventId),
}));

export type EventRollup = typeof eventRollups.$inferSelect;
export type InsertEventRollup = typeof eventRollups.$inferInsert;

// Marketplace Rollups - Seller/Product analytics
export const marketplaceRollups = pgTable("marketplace_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").references(() => users.id), // Seller/shop owner
  productId: varchar("product_id").references(() => products.id),
  period: varchar("period").notNull(), // 'week', 'month', 'all'
  periodStart: timestamp("period_start").notNull(), // Package #12: NOT NULL for unique index
  periodEnd: timestamp("period_end"),
  
  // Conversion funnel
  views: integer("views").default(0),
  addToCarts: integer("add_to_carts").default(0),
  purchases: integer("purchases").default(0),
  
  // Financial
  revenueCents: integer("revenue_cents").default(0),
  refundsCents: integer("refunds_cents").default(0),
  aovCents: integer("aov_cents").default(0), // Average Order Value
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sellerPeriodIdx: index("marketplace_rollups_seller_period_idx").on(table.sellerId, table.period, table.periodStart),
  productPeriodIdx: index("marketplace_rollups_product_period_idx").on(table.productId, table.period, table.periodStart),
}));

export type MarketplaceRollup = typeof marketplaceRollups.$inferSelect;
export type InsertMarketplaceRollup = typeof marketplaceRollups.$inferInsert;

// Global Rollups - Platform-wide metrics
export const globalRollups = pgTable("global_rollups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: varchar("period").notNull(), // 'day', 'week', 'month'
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // User metrics
  dau: integer("dau").default(0), // Daily Active Users
  mau: integer("mau").default(0), // Monthly Active Users
  signups: integer("signups").default(0),
  
  // Financial
  revenueCents: integer("revenue_cents").default(0),
  gmvCents: integer("gmv_cents").default(0), // Gross Merchandise Value
  refundsCents: integer("refunds_cents").default(0),
  
  // Geography
  activeCities: integer("active_cities").default(0),
  
  // Sports & content
  topSports: jsonb("top_sports"), // [{ sport: string, count: number }]
  
  // Activism
  protestsCreated: integer("protests_created").default(0),
  signatures: integer("signatures").default(0),
  
  // Communication
  messagesSent: integer("messages_sent").default(0),
  calls: integer("calls").default(0),
  
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  periodIdx: uniqueIndex("global_rollups_period_idx").on(table.period, table.periodStart),
}));

export type GlobalRollup = typeof globalRollups.$inferSelect;
export type InsertGlobalRollup = typeof globalRollups.$inferInsert;

// Zod schemas for analytics
export const insertAnalyticsFactSchema = createInsertSchema(analyticsFacts).omit({ 
  id: true, 
  createdAt: true 
});
export const insertUserRollupSchema = createInsertSchema(userRollups).omit({ 
  id: true 
});
export const insertTeamRollupSchema = createInsertSchema(teamRollups).omit({ 
  id: true 
});
export const insertGymRollupSchema = createInsertSchema(gymRollups).omit({ 
  id: true 
});
export const insertEventRollupSchema = createInsertSchema(eventRollups).omit({ 
  id: true 
});
export const insertMarketplaceRollupSchema = createInsertSchema(marketplaceRollups).omit({ 
  id: true 
});
export const insertGlobalRollupSchema = createInsertSchema(globalRollups).omit({ 
  id: true 
});

// Package #13: Admin Audit Logs - Immutable audit trail for all admin actions
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(), // e.g., 'user.ban', 'post.remove', 'payout.approve'
  targetType: varchar("target_type", { length: 50 }), // e.g., 'user', 'post', 'order'
  targetId: varchar("target_id"),
  reason: text("reason"),
  before: jsonb("before"), // Redacted snapshot before action
  after: jsonb("after"), // Redacted snapshot after action
  ip: varchar("ip", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  adminIdx: index("admin_audit_admin_idx").on(table.adminId),
  actionIdx: index("admin_audit_action_idx").on(table.action),
  createdIdx: index("admin_audit_created_idx").on(table.createdAt),
  targetIdx: index("admin_audit_target_idx").on(table.targetType, table.targetId),
}));

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({
  id: true,
  createdAt: true,
});

// Admin Role and Permission types for Package #13
export type AdminRole = 'super_admin' | 'moderator' | 'finance_admin' | 'event_admin' | 'support';

export type AdminPermission =
  | 'user:read' | 'user:ban' | 'user:verify' | 'user:gdpr_export' | 'user:gdpr_delete'
  | 'content:read' | 'content:remove' | 'content:restore'
  | 'team:read' | 'team:verify' | 'team:remove'
  | 'event:approve' | 'event:remove'
  | 'shop:read' | 'shop:verify' | 'shop:remove' | 'order:refund'
  | 'payments:read' | 'payouts:approve' | 'refunds:approve'
  | 'settings:read' | 'settings:write'
  | 'analytics:read';

// Instant Teams - temporary/pickup game teams
export const instantTeams = pgTable("instant_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  sport: varchar("sport").notNull(),
  description: text("description"),
  lat: decimal("lat").notNull(),
  lng: decimal("lng").notNull(),
  locationName: varchar("location_name"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  playersNeeded: integer("players_needed").notNull().default(2),
  playersJoined: integer("players_joined").default(1),
  skillLevel: varchar("skill_level").default("any"),
  visibility: varchar("visibility").default("public"),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("instant_teams_status_idx").on(table.status),
  sportIdx: index("instant_teams_sport_idx").on(table.sport),
  startTimeIdx: index("instant_teams_start_time_idx").on(table.startTime),
  latLngIdx: index("instant_teams_lat_lng_idx").on(table.lat, table.lng),
  createdAtIdx: index("instant_teams_created_at_idx").on(table.createdAt),
}));

export const instantTeamMembers = pgTable("instant_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => instantTeams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("joined"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  teamUserIdx: index("instant_team_members_team_user_idx").on(table.teamId, table.userId),
  userIdx: index("instant_team_members_user_idx").on(table.userId),
}));

export const userAvailability = pgTable("user_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  isAvailable: boolean("is_available").default(false),
  sports: text("sports").array().default(sql`ARRAY[]::text[]`),
  skillLevel: varchar("skill_level").default("any"),
  radiusKm: integer("radius_km").default(10),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const instantTeamInvites = pgTable("instant_team_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => instantTeams.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types
export type InstantTeam = typeof instantTeams.$inferSelect;
export type InsertInstantTeam = typeof instantTeams.$inferInsert;
export type InstantTeamMember = typeof instantTeamMembers.$inferSelect;
export type InsertInstantTeamMember = typeof instantTeamMembers.$inferInsert;
export type UserAvailability = typeof userAvailability.$inferSelect;
export type InsertUserAvailability = typeof userAvailability.$inferInsert;
export type InstantTeamInvite = typeof instantTeamInvites.$inferSelect;
export type InsertInstantTeamInvite = typeof instantTeamInvites.$inferInsert;

// Insert schemas
export const insertInstantTeamSchema = createInsertSchema(instantTeams).omit({
  id: true,
  createdAt: true,
  playersJoined: true,
  status: true,
});
export const insertUserAvailabilitySchema = createInsertSchema(userAvailability).omit({
  id: true,
  updatedAt: true,
});
export const insertInstantTeamInviteSchema = createInsertSchema(instantTeamInvites).omit({
  id: true,
  createdAt: true,
  status: true,
});

// ═══════════════════════════════════════════════════════════════
// SURNA PRO — Extension Layer
// ═══════════════════════════════════════════════════════════════

// ── PRO BASE LAYER ──────────────────────────────────────────

export const proTeamRoles = pgTable("pro_team_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  permissions: jsonb("permissions").default([]),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamRoleMembers = pgTable("pro_team_role_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: varchar("role_id").notNull().references(() => proTeamRoles.id),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const proTeamAuditLogs = pgTable("pro_team_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(),
  entity: varchar("entity"),
  entityId: varchar("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamSettings = pgTable("pro_team_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id).unique(),
  locale: varchar("locale").default("en"),
  defaultFormation: varchar("default_formation"),
  notificationRules: jsonb("notification_rules").default({}),
  proTier: varchar("pro_tier").default("basic"),
  enabledModules: jsonb("enabled_modules").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── TEAM MANAGEMENT (Roster + Staff + Documents) ────────────

export const proTeamPlayers = pgTable("pro_team_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  jerseyNumber: integer("jersey_number"),
  positions: jsonb("positions").default([]),
  status: varchar("status").default("active"),
  preferredFoot: varchar("preferred_foot"),
  height: varchar("height"),
  weight: varchar("weight"),
  nationality: varchar("nationality"),
  notes: text("notes"),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proTeamStaff = pgTable("pro_team_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  staffType: varchar("staff_type").notNull(),
  title: varchar("title"),
  certifications: jsonb("certifications").default([]),
  specialties: jsonb("specialties").default([]),
  notes: text("notes"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const proTeamDocuments = pgTable("pro_team_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  fileUrl: text("file_url"),
  permissions: jsonb("permissions").default([]),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamEquipmentIssued = pgTable("pro_team_equipment_issued", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  itemName: varchar("item_name").notNull(),
  category: varchar("category"),
  quantity: integer("quantity").default(1),
  condition: varchar("condition").default("good"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  returnedAt: timestamp("returned_at"),
  notes: text("notes"),
});

// ── CATEGORY 2: TRAINING PLANS ──────────────────────────────

export const proTrainingSessions = pgTable("pro_training_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  dateTime: timestamp("date_time").notNull(),
  placeId: varchar("place_id"),
  focus: varchar("focus"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTrainingDrills = pgTable("pro_training_drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id),
  name: varchar("name").notNull(),
  duration: integer("duration"),
  description: text("description"),
  videoUrl: text("video_url"),
  category: varchar("category"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTrainingSessionDrills = pgTable("pro_training_session_drills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => proTrainingSessions.id),
  drillId: varchar("drill_id").notNull().references(() => proTrainingDrills.id),
  orderIndex: integer("order_index").default(0),
  notes: text("notes"),
});

export const proTrainingAttendance = pgTable("pro_training_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => proTrainingSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("present"),
  reason: text("reason"),
});

// ── CATEGORY 3: MATCH DAY ───────────────────────────────────

export const proFormations = pgTable("pro_formations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  sportType: varchar("sport_type"),
  name: varchar("name").notNull(),
  layoutJson: jsonb("layout_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proMatchSquads = pgTable("pro_match_squads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id"),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  formationId: varchar("formation_id").references(() => proFormations.id),
  captainUserId: varchar("captain_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proMatchSquadPlayers = pgTable("pro_match_squad_players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  squadId: varchar("squad_id").notNull().references(() => proMatchSquads.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  positionKey: varchar("position_key"),
  isStarter: boolean("is_starter").default(true),
  shirtNo: integer("shirt_no"),
});

export const proMatchSubstitutions = pgTable("pro_match_substitutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  minute: integer("minute"),
  playerOutId: varchar("player_out_id").references(() => users.id),
  playerInId: varchar("player_in_id").references(() => users.id),
  reason: varchar("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proMatchNotes = pgTable("pro_match_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  staffUserId: varchar("staff_user_id").references(() => users.id),
  minute: integer("minute"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CATEGORY 4: EQUIPMENT & INVENTORY ───────────────────────

export const proInventoryItems = pgTable("pro_inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  category: varchar("category"),
  quantity: integer("quantity").default(0),
  condition: varchar("condition").default("good"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proInventoryLogs = pgTable("pro_inventory_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => proInventoryItems.id),
  action: varchar("action").notNull(),
  delta: integer("delta").default(0),
  userId: varchar("user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CATEGORY 5: SCHEDULING & AVAILABILITY ───────────────────

export const proScheduleRules = pgTable("pro_schedule_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  recurringJson: jsonb("recurring_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamRsvp = pgTable("pro_team_rsvp", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proTeamAvailability = pgTable("pro_team_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sport: varchar("sport"),
  daysAndTimes: jsonb("days_and_times").default({}),
  radiusKm: integer("radius_km"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CATEGORY 6: PERFORMANCE STATS ──────────────────────────

export const proPlayerMatchStats = pgTable("pro_player_match_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  metricsJson: jsonb("metrics_json").default({}),
  rating: integer("rating"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamMatchStats = pgTable("pro_team_match_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  metricsJson: jsonb("metrics_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proPlayerTrainingStats = pgTable("pro_player_training_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => proTrainingSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  metricsJson: jsonb("metrics_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CATEGORY 7: COMMUNICATION CENTER ────────────────────────

export const proTeamAnnouncements = pgTable("pro_team_announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  title: varchar("title").notNull(),
  body: text("body"),
  pinned: boolean("pinned").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamMessageGroups = pgTable("pro_team_message_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTeamMessageGroupMembers = pgTable("pro_team_message_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => proTeamMessageGroups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// ── CATEGORY 8: RECRUITMENT & TRIALS ────────────────────────

export const proTeamTrials = pgTable("pro_team_trials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  placeId: varchar("place_id"),
  dateTime: timestamp("date_time").notNull(),
  requirementsJson: jsonb("requirements_json").default({}),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proTrialApplications = pgTable("pro_trial_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trialId: varchar("trial_id").notNull().references(() => proTeamTrials.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proScoutShortlist = pgTable("pro_scout_shortlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── CATEGORY 9: CLUB/ACADEMY LAYER ─────────────────────────

export const proClubs = pgTable("pro_clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  location: varchar("location"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proClubTeams = pgTable("pro_club_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").notNull().references(() => proClubs.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proAcademyProfiles = pgTable("pro_academy_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clubId: varchar("club_id").notNull().references(() => proClubs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  ageGroup: varchar("age_group"),
  progressJson: jsonb("progress_json").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── PRO TYPES ───────────────────────────────────────────────

export type ProTeamRole = typeof proTeamRoles.$inferSelect;
export type InsertProTeamRole = typeof proTeamRoles.$inferInsert;
export type ProTeamRoleMember = typeof proTeamRoleMembers.$inferSelect;
export type InsertProTeamRoleMember = typeof proTeamRoleMembers.$inferInsert;
export type ProTeamAuditLog = typeof proTeamAuditLogs.$inferSelect;
export type InsertProTeamAuditLog = typeof proTeamAuditLogs.$inferInsert;
export type ProTeamSettings = typeof proTeamSettings.$inferSelect;
export type InsertProTeamSettings = typeof proTeamSettings.$inferInsert;
export type ProTeamPlayer = typeof proTeamPlayers.$inferSelect;
export type InsertProTeamPlayer = typeof proTeamPlayers.$inferInsert;
export type ProTeamStaff = typeof proTeamStaff.$inferSelect;
export type InsertProTeamStaff = typeof proTeamStaff.$inferInsert;
export type ProTeamDocument = typeof proTeamDocuments.$inferSelect;
export type InsertProTeamDocument = typeof proTeamDocuments.$inferInsert;
export type ProTeamEquipmentIssued = typeof proTeamEquipmentIssued.$inferSelect;
export type InsertProTeamEquipmentIssued = typeof proTeamEquipmentIssued.$inferInsert;

export type ProTrainingSession = typeof proTrainingSessions.$inferSelect;
export type ProTrainingDrill = typeof proTrainingDrills.$inferSelect;
export type ProTrainingSessionDrill = typeof proTrainingSessionDrills.$inferSelect;
export type ProTrainingAttendance = typeof proTrainingAttendance.$inferSelect;
export type ProFormation = typeof proFormations.$inferSelect;
export type ProMatchSquad = typeof proMatchSquads.$inferSelect;
export type ProMatchSquadPlayer = typeof proMatchSquadPlayers.$inferSelect;
export type ProMatchSubstitution = typeof proMatchSubstitutions.$inferSelect;
export type ProMatchNote = typeof proMatchNotes.$inferSelect;
export type ProInventoryItem = typeof proInventoryItems.$inferSelect;
export type ProInventoryLog = typeof proInventoryLogs.$inferSelect;
export type ProScheduleRule = typeof proScheduleRules.$inferSelect;
export type ProTeamRsvp = typeof proTeamRsvp.$inferSelect;
export type ProTeamAvailability = typeof proTeamAvailability.$inferSelect;
export type ProPlayerMatchStats = typeof proPlayerMatchStats.$inferSelect;
export type ProTeamMatchStats = typeof proTeamMatchStats.$inferSelect;
export type ProPlayerTrainingStats = typeof proPlayerTrainingStats.$inferSelect;
export type ProTeamAnnouncement = typeof proTeamAnnouncements.$inferSelect;
export type ProTeamMessageGroup = typeof proTeamMessageGroups.$inferSelect;
export type ProTeamMessageGroupMember = typeof proTeamMessageGroupMembers.$inferSelect;
export type ProTeamTrial = typeof proTeamTrials.$inferSelect;
export type ProTrialApplication = typeof proTrialApplications.$inferSelect;
export type ProScoutShortlistEntry = typeof proScoutShortlist.$inferSelect;
export type ProClub = typeof proClubs.$inferSelect;
export type ProClubTeam = typeof proClubTeams.$inferSelect;
export type ProAcademyProfile = typeof proAcademyProfiles.$inferSelect;

// ── PRO INSERT SCHEMAS ─────────────────────────────────────

export const insertProTeamRoleSchema = createInsertSchema(proTeamRoles).omit({ id: true, createdAt: true });
export const insertProTeamRoleMemberSchema = createInsertSchema(proTeamRoleMembers).omit({ id: true, assignedAt: true });
export const insertProTeamAuditLogSchema = createInsertSchema(proTeamAuditLogs).omit({ id: true, createdAt: true });
export const insertProTeamSettingsSchema = createInsertSchema(proTeamSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProTeamPlayerSchema = createInsertSchema(proTeamPlayers).omit({ id: true, joinedAt: true, updatedAt: true });
export const insertProTeamStaffSchema = createInsertSchema(proTeamStaff).omit({ id: true, joinedAt: true });
export const insertProTeamDocumentSchema = createInsertSchema(proTeamDocuments).omit({ id: true, createdAt: true });
export const insertProTeamEquipmentIssuedSchema = createInsertSchema(proTeamEquipmentIssued).omit({ id: true, assignedAt: true, returnedAt: true });
export const insertProTrainingSessionSchema = createInsertSchema(proTrainingSessions).omit({ id: true, createdAt: true });
export const insertProTrainingDrillSchema = createInsertSchema(proTrainingDrills).omit({ id: true, createdAt: true });
export const insertProTrainingSessionDrillSchema = createInsertSchema(proTrainingSessionDrills).omit({ id: true });
export const insertProTrainingAttendanceSchema = createInsertSchema(proTrainingAttendance).omit({ id: true });
export const insertProFormationSchema = createInsertSchema(proFormations).omit({ id: true, createdAt: true });
export const insertProMatchSquadSchema = createInsertSchema(proMatchSquads).omit({ id: true, createdAt: true });
export const insertProMatchSquadPlayerSchema = createInsertSchema(proMatchSquadPlayers).omit({ id: true });
export const insertProMatchSubstitutionSchema = createInsertSchema(proMatchSubstitutions).omit({ id: true, createdAt: true });
export const insertProMatchNoteSchema = createInsertSchema(proMatchNotes).omit({ id: true, createdAt: true });
export const insertProInventoryItemSchema = createInsertSchema(proInventoryItems).omit({ id: true, createdAt: true });
export const insertProInventoryLogSchema = createInsertSchema(proInventoryLogs).omit({ id: true, createdAt: true });
export const insertProScheduleRuleSchema = createInsertSchema(proScheduleRules).omit({ id: true, createdAt: true });
export const insertProTeamRsvpSchema = createInsertSchema(proTeamRsvp).omit({ id: true, updatedAt: true });
export const insertProTeamAvailabilitySchema = createInsertSchema(proTeamAvailability).omit({ id: true, createdAt: true });
export const insertProPlayerMatchStatsSchema = createInsertSchema(proPlayerMatchStats).omit({ id: true, createdAt: true });
export const insertProTeamMatchStatsSchema = createInsertSchema(proTeamMatchStats).omit({ id: true, createdAt: true });
export const insertProPlayerTrainingStatsSchema = createInsertSchema(proPlayerTrainingStats).omit({ id: true, createdAt: true });
export const insertProTeamAnnouncementSchema = createInsertSchema(proTeamAnnouncements).omit({ id: true, createdAt: true });
export const insertProTeamMessageGroupSchema = createInsertSchema(proTeamMessageGroups).omit({ id: true, createdAt: true });
export const insertProTeamMessageGroupMemberSchema = createInsertSchema(proTeamMessageGroupMembers).omit({ id: true, joinedAt: true });
export const insertProTeamTrialSchema = createInsertSchema(proTeamTrials).omit({ id: true, createdAt: true });
export const insertProTrialApplicationSchema = createInsertSchema(proTrialApplications).omit({ id: true, createdAt: true });
export const insertProScoutShortlistSchema = createInsertSchema(proScoutShortlist).omit({ id: true, createdAt: true });
export const insertProClubSchema = createInsertSchema(proClubs).omit({ id: true, createdAt: true });
export const insertProClubTeamSchema = createInsertSchema(proClubTeams).omit({ id: true, createdAt: true });
export const insertProAcademyProfileSchema = createInsertSchema(proAcademyProfiles).omit({ id: true, createdAt: true });

export const userPhotos = pgTable("user_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userReviews = pgTable("user_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectId: varchar("subject_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(),
  text: text("text"),
  context: varchar("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserPhoto = typeof userPhotos.$inferSelect;
export type InsertUserPhoto = typeof userPhotos.$inferInsert;
export const insertUserPhotoSchema = createInsertSchema(userPhotos).omit({ id: true, createdAt: true });

export type UserReview = typeof userReviews.$inferSelect;
export type InsertUserReview = typeof userReviews.$inferInsert;
export const insertUserReviewSchema = createInsertSchema(userReviews).omit({ id: true, createdAt: true });

export const challengeChatMessages = pgTable("challenge_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChallengeChatMessage = typeof challengeChatMessages.$inferSelect;

export const dmSharedNotes = pgTable("dm_shared_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userAId: varchar("user_a_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  userBId: varchar("user_b_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull().default(''),
  updatedById: varchar("updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type DmSharedNote = typeof dmSharedNotes.$inferSelect;

export const eventPhotos = pgTable("event_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  uploaderId: varchar("uploader_id").notNull().references(() => users.id),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventPhoto = typeof eventPhotos.$inferSelect;
export type InsertEventPhoto = typeof eventPhotos.$inferInsert;
export const insertEventPhotoSchema = createInsertSchema(eventPhotos).omit({ id: true, createdAt: true });

export const teamPhotos = pgTable("team_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  uploaderId: varchar("uploader_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: varchar("image_url").notNull(),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TeamPhoto = typeof teamPhotos.$inferSelect;
export type InsertTeamPhoto = typeof teamPhotos.$inferInsert;
export const insertTeamPhotoSchema = createInsertSchema(teamPhotos).omit({ id: true, createdAt: true });