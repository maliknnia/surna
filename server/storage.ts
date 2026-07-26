import {
  users,
  posts,
  postLikes,
  postComments,
  postShares,
  teams,
  teamMembers,
  messages,
  userFollows,
  events,
  eventParticipants,
  coaches,
  products,
  userPerformance,
  pointTransactions,
  rewards,
  userRewards,
  chatRooms,
  stories,
  storyViewers,
  storyReplies,
  savedPosts,
  streamSessions,
  streamViewers,
  streamComments,
  streamReactions,
  places,
  placePhotos,
  placeFollowers,
  placeReviews,
  placeBookings,
  placeMembershipPlans,
  placePosts,
  placePostLikes,
  placePostComments,
  userPhotos,
  userReviews,
  teamPhotos,
  dmSharedNotes,
  challengeChatMessages,
  type UserPhoto,
  type InsertUserPhoto,
  type UserReview,
  type InsertUserReview,
  type User,
  type UpsertUser,
  type InsertPost,
  type Post,
  type PostWithAuthor,
  type InsertTeam,
  type Team,
  type InsertMessage,
  type Message,
  type MessageWithSender,
  type InsertEvent,
  type Event,
  type EventWithOrganizer,
  type Coach,
  type CoachWithUser,
  type Product,
  type UserPerformance,
  type PointTransaction,
  type Reward,
  type UserReward,
  type ChatRoom,
  type PerformanceData,
  type Story,
  type StoryWithUser,
  type InsertStory,
  type SavedPost,
  type StreamSession,
  type InsertStreamSession,
  type Place,
  type InsertPlace,
  type PlacePhoto,
  type InsertPlacePhoto,
  type PlaceFollower,
  type InsertPlaceFollower,
  type PlaceReview,
  type InsertPlaceReview,
  type PlaceMembershipPlan,
  type InsertPlaceMembershipPlan,
  type PlaceBooking,
  type InsertPlaceBooking,
  type PlacePost,
  type InsertPlacePost,
  instantTeams,
  instantTeamMembers,
  userAvailability,
  instantTeamInvites,
  type InstantTeam,
  type UserAvailability,
  type InstantTeamInvite,
  proTeamRoles,
  proTeamRoleMembers,
  proTeamAuditLogs,
  proTeamSettings,
  proTeamPlayers,
  proTeamStaff,
  proTeamDocuments,
  proTeamEquipmentIssued,
  proTrainingSessions,
  proTrainingDrills,
  proTrainingSessionDrills,
  proTrainingAttendance,
  proFormations,
  proMatchSquads,
  proMatchSquadPlayers,
  proMatchSubstitutions,
  proMatchNotes,
  proInventoryItems,
  proInventoryLogs,
  proScheduleRules,
  proTeamRsvp,
  proTeamAvailability,
  proPlayerMatchStats,
  proTeamMatchStats,
  proPlayerTrainingStats,
  proTeamAnnouncements,
  proTeamMessageGroups,
  proTeamMessageGroupMembers,
  proTeamTrials,
  proTrialApplications,
  proScoutShortlist,
  proClubs,
  proClubTeams,
  proAcademyProfiles,
  type ProTeamRole,
  type ProTeamRoleMember,
  type ProTeamAuditLog,
  type ProTeamSettings,
  type ProTeamPlayer,
  type ProTeamStaff,
  type ProTeamDocument,
  type ProTeamEquipmentIssued,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count, asc, lt, gte, lte, isNotNull, inArray } from "drizzle-orm";
import { formatApiComment, formatApiCommentFromJoin, type ApiComment } from "./lib/commentFormat";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUserWithClaims(claimsId: string, userData: UpsertUser): Promise<User>;
  
  // Post operations
  createPost(authorId: string, post: InsertPost): Promise<Post>;
  updatePost(authorId: string, postId: string, data: { content?: string; sport?: string | null; location?: string | null }): Promise<Post | null>;
  deletePost(authorId: string, postId: string): Promise<boolean>;
  getFeedPosts(userId: string, limit?: number, offset?: number): Promise<PostWithAuthor[]>;
  getFeedPostsKeyset(userId: string, limit?: number, cursor?: Date): Promise<{ items: PostWithAuthor[]; nextCursor: string | null }>;
  likePost(userId: string, postId: string): Promise<boolean>;
  unlikePost(userId: string, postId: string): Promise<boolean>;
  isPostLiked(userId: string, postId: string): Promise<boolean>;
  addComment(postId: string, authorId: string, content: string): Promise<ApiComment>;
  addCommentReply(commentId: string, authorId: string, content: string): Promise<ApiComment>;
  editComment(commentId: string, authorId: string, content: string): Promise<boolean>;
  deleteComment(commentId: string, authorId: string): Promise<boolean>;
  getCommentReplies(commentId: string): Promise<any[]>;
  sharePost(userId: string, postId: string, shareType?: string): Promise<void>;
  
  // Team operations
  createTeam(ownerId: string, team: InsertTeam): Promise<Team>;
  getTeams(limit?: number, offset?: number, sport?: string): Promise<Team[]>;
  joinTeam(teamId: string, userId: string): Promise<void>;
  ensureTeamMember(teamId: string, userId: string, role?: string): Promise<void>;
  leaveTeam(teamId: string, userId: string): Promise<void>;
  
  // Message operations
  sendMessage(senderId: string, message: InsertMessage): Promise<Message>;
  getConversations(userId: string): Promise<MessageWithSender[]>;
  getMessages(userId: string, otherUserId: string, limit?: number): Promise<MessageWithSender[]>;
  markMessageAsRead(messageId: string): Promise<void>;
  
  // Social operations
  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getPostsCount(userId: string): Promise<number>;
  getSuggestedUsers(userId: string, limit?: number): Promise<User[]>;
  
  // Event operations
  createEvent(organizerId: string, event: InsertEvent): Promise<Event>;
  getEvents(limit?: number, offset?: number): Promise<EventWithOrganizer[]>;
  joinEvent(eventId: string, userId: string): Promise<void>;
  isEventRegistered(eventId: string, userId: string): Promise<boolean>;
  
  // Coach operations
  getCoaches(limit?: number, offset?: number, sport?: string): Promise<CoachWithUser[]>;
  getCoachById(coachId: string): Promise<CoachWithUser | undefined>;
  startChatWithCoach(userId: string, coachId: string): Promise<ChatRoom>;
  
  // Performance operations
  getUserPerformance(userId: string): Promise<PerformanceData>;
  addPoints(userId: string, points: number, reason: string, description?: string): Promise<void>;
  removePoints(userId: string, points: number, reason: string, description?: string): Promise<void>;
  redeemReward(userId: string, rewardId: string): Promise<boolean>;
  getAvailableRewards(): Promise<Reward[]>;
  createReward(reward: any): Promise<Reward>;
  
  // Product operations
  getProducts(category?: string, limit?: number, offset?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  
  // Personalized content operations
  getPersonalizedEvents(userId: string, limit?: number, offset?: number): Promise<EventWithOrganizer[]>;
  getPersonalizedTeams(userId: string, limit?: number, offset?: number): Promise<Team[]>;
  getPersonalizedCoaches(userId: string, limit?: number, offset?: number): Promise<CoachWithUser[]>;
  getPersonalizedProducts(userId: string, limit?: number, offset?: number): Promise<Product[]>;
  
  // Wallpaper preferences operations
  updateWallpaperPreferences(userId: string, enabled: boolean, url: string | null, pages: string[]): Promise<void>;
  getWallpaperPreferences(userId: string): Promise<{ enabled: boolean; url: string | null; pages: string[] }>;
  
  // Stories operations
  createStory(userId: string, storyData: any): Promise<any>;
  getStoriesForUser(userId: string): Promise<any[]>;
  getStoryById(storyId: string, userId: string): Promise<any | null>;
  markStoryAsViewed(storyId: string, viewerId: string): Promise<void>;
  deleteStory(storyId: string, userId: string): Promise<void>;
  getStoryViewers(storyId: string, userId: string): Promise<any[]>;
  replyToStory(storyId: string, userId: string, content: string): Promise<any>;
  
  // Saved posts operations
  savePost(userId: string, postId: string, collectionName?: string): Promise<void>;
  unsavePost(userId: string, postId: string): Promise<void>;
  isPostSaved(userId: string, postId: string): Promise<boolean>;
  getSavedPosts(userId: string, collectionName?: string): Promise<any[]>;
  
  // Live streaming operations
  createStreamSession(streamerId: string, streamData: any): Promise<any>;
  getActiveStreams(): Promise<any[]>;
  joinStream(streamId: string, viewerId: string): Promise<void>;
  leaveStream(streamId: string, viewerId: string): Promise<void>;
  addStreamComment(streamId: string, userId: string, content: string): Promise<any>;
  addStreamReaction(streamId: string, userId: string, reactionType: string): Promise<void>;
  updateStreamStatus(streamId: string, status: string): Promise<void>;
  getStreamViewers(streamId: string): Promise<any[]>;
  
  // Places operations
  createPlace(ownerId: string, placeData: InsertPlace): Promise<Place>;
  updatePlace(placeId: string, ownerId: string, placeData: Partial<InsertPlace>): Promise<Place | null>;
  getPlace(placeId: string): Promise<Place | undefined>;
  getPlaces(filters?: { sport?: string; city?: string; minRating?: number }, limit?: number, offset?: number): Promise<Place[]>;
  getPlacesByOwner(ownerId: string): Promise<Place[]>;
  deletePlace(placeId: string, ownerId: string): Promise<boolean>;
  searchPlaces(query: string, filters?: { sport?: string; city?: string }, limit?: number): Promise<Place[]>;
  
  // Place photos operations
  addPlacePhoto(placeId: string, photoData: InsertPlacePhoto): Promise<PlacePhoto>;
  getPlacePhotos(placeId: string): Promise<PlacePhoto[]>;
  deletePlacePhoto(photoId: string, userId: string): Promise<boolean>;
  
  // Place followers operations
  followPlace(placeId: string, userId: string): Promise<void>;
  unfollowPlace(placeId: string, userId: string): Promise<void>;
  isFollowingPlace(placeId: string, userId: string): Promise<boolean>;
  getPlaceFollowers(placeId: string, limit?: number, offset?: number): Promise<User[]>;
  
  // Place reviews operations
  addPlaceReview(placeId: string, userId: string, reviewData: InsertPlaceReview): Promise<PlaceReview>;
  updatePlaceReview(reviewId: string, userId: string, reviewData: Partial<InsertPlaceReview>): Promise<PlaceReview | null>;
  getPlaceReviews(placeId: string, limit?: number, offset?: number): Promise<PlaceReview[]>;
  deleteReview(reviewId: string, userId: string): Promise<boolean>;
  
  // Place bookings operations
  createPlaceBooking(userId: string, bookingData: InsertPlaceBooking): Promise<PlaceBooking>;
  updatePlaceBooking(bookingId: string, updates: Partial<InsertPlaceBooking>): Promise<PlaceBooking | null>;
  getPlaceBookings(placeId: string, ownerId: string, limit?: number, offset?: number): Promise<PlaceBooking[]>;
  getUserBookings(userId: string, limit?: number, offset?: number): Promise<PlaceBooking[]>;
  cancelBooking(bookingId: string, userId: string, reason?: string): Promise<boolean>;

  // Place membership plans
  getPlaceMembershipPlans(placeId: string, activeOnly?: boolean): Promise<PlaceMembershipPlan[]>;
  createPlaceMembershipPlan(placeId: string, ownerId: string, data: InsertPlaceMembershipPlan): Promise<PlaceMembershipPlan>;
  updatePlaceMembershipPlan(planId: string, placeId: string, ownerId: string, data: Partial<InsertPlaceMembershipPlan>): Promise<PlaceMembershipPlan | null>;
  deletePlaceMembershipPlan(planId: string, placeId: string, ownerId: string): Promise<boolean>;
  getPlaceMembershipPlan(planId: string, placeId: string): Promise<PlaceMembershipPlan | null>;
  
  // Place posts operations
  createPlacePost(placeId: string, authorId: string, postData: InsertPlacePost): Promise<PlacePost>;
  getPlacePosts(placeId: string, limit?: number, offset?: number): Promise<PlacePost[]>;
  likePlacePost(userId: string, placePostId: string): Promise<boolean>;
  unlikePlacePost(userId: string, placePostId: string): Promise<boolean>;
  isPlacePostLiked(userId: string, placePostId: string): Promise<boolean>;
  addPlacePostComment(placePostId: string, authorId: string, content: string): Promise<{ id: string; content: string; createdAt: Date | null }>;
  
  // Instant Teams operations
  createInstantTeam(creatorId: string, data: any): Promise<InstantTeam>;
  getInstantTeams(filters?: { sport?: string; status?: string; skillLevel?: string }, viewerId?: string): Promise<any[]>;
  getInstantTeam(id: string): Promise<any | undefined>;
  joinInstantTeam(teamId: string, userId: string): Promise<boolean>;
  leaveInstantTeam(teamId: string, userId: string): Promise<boolean>;
  getInstantTeamMembers(teamId: string): Promise<any[]>;
  ensureInstantTeamMessengerGroupColumn(): Promise<void>;
  getInstantTeamMessengerGroupId(teamId: string): Promise<string | null>;
  setInstantTeamMessengerGroupId(teamId: string, groupId: string): Promise<string>;
  expireInstantTeams(): Promise<number>;
  convertInstantTeam(teamId: string, userId: string): Promise<any>;
  
  // User Availability operations
  getAvailability(userId: string): Promise<UserAvailability | undefined>;
  upsertAvailability(userId: string, data: any): Promise<UserAvailability>;
  getAvailablePlayers(filters?: { sport?: string; skillLevel?: string }): Promise<any[]>;
  
  // Instant Team Invites operations
  sendInstantInvite(teamId: string, fromUserId: string, toUserId: string): Promise<InstantTeamInvite>;
  respondInstantInvite(inviteId: string, userId: string, accept: boolean): Promise<boolean>;
  getUserInstantInvites(userId: string): Promise<any[]>;

  // SURNA Pro â€” Base Layer
  getProTeamRoles(teamId: string): Promise<ProTeamRole[]>;
  createProTeamRole(teamId: string, data: any): Promise<ProTeamRole>;
  updateProTeamRole(roleId: string, data: any): Promise<ProTeamRole | null>;
  deleteProTeamRole(roleId: string): Promise<boolean>;
  assignProRole(teamId: string, userId: string, roleId: string, assignedBy: string): Promise<ProTeamRoleMember>;
  removeProRole(teamId: string, userId: string, roleId: string): Promise<boolean>;
  getProTeamRoleMembers(teamId: string): Promise<any[]>;
  getUserProRole(teamId: string, userId: string): Promise<ProTeamRoleMember | undefined>;
  logProAudit(teamId: string, userId: string, action: string, details?: { entity?: string; entityId?: string; before?: any; after?: any; ipAddress?: string }): Promise<ProTeamAuditLog>;
  getProAuditLogs(teamId: string, limit?: number, offset?: number): Promise<ProTeamAuditLog[]>;
  getProTeamSettings(teamId: string): Promise<ProTeamSettings | undefined>;
  upsertProTeamSettings(teamId: string, data: any): Promise<ProTeamSettings>;

  // SURNA Pro â€” Team Management
  getProRoster(teamId: string): Promise<any[]>;
  addProPlayer(teamId: string, data: any): Promise<ProTeamPlayer>;
  updateProPlayer(playerId: string, data: any): Promise<ProTeamPlayer | null>;
  removeProPlayer(playerId: string): Promise<boolean>;
  getProStaff(teamId: string): Promise<any[]>;
  addProStaff(teamId: string, data: any): Promise<ProTeamStaff>;
  removeProStaff(staffId: string): Promise<boolean>;
  getProDocuments(teamId: string): Promise<ProTeamDocument[]>;
  addProDocument(teamId: string, data: any): Promise<ProTeamDocument>;
  deleteProDocument(docId: string): Promise<boolean>;
  getProEquipment(teamId: string): Promise<ProTeamEquipmentIssued[]>;
  issueProEquipment(teamId: string, data: any): Promise<ProTeamEquipmentIssued>;
  returnProEquipment(issuedId: string): Promise<boolean>;

  // SURNA Pro â€” Category 2: Training Plans
  getTrainingSessions(teamId: string): Promise<any[]>;
  createTrainingSession(data: any): Promise<any>;
  getTrainingDrills(teamId: string): Promise<any[]>;
  createTrainingDrill(data: any): Promise<any>;
  getSessionDrills(sessionId: string): Promise<any[]>;
  addDrillToSession(data: any): Promise<any>;
  getTrainingAttendance(sessionId: string): Promise<any[]>;
  markAttendance(data: any): Promise<any>;

  // SURNA Pro â€” Category 3: Match Day
  getFormations(teamId: string): Promise<any[]>;
  createFormation(data: any): Promise<any>;
  getMatchSquad(matchId: string, teamId: string): Promise<any | undefined>;
  createMatchSquad(data: any): Promise<any>;
  addSquadPlayer(data: any): Promise<any>;
  getSquadPlayers(squadId: string): Promise<any[]>;
  addSubstitution(data: any): Promise<any>;
  getMatchSubstitutions(matchId: string): Promise<any[]>;
  addMatchNote(data: any): Promise<any>;
  getMatchNotes(matchId: string): Promise<any[]>;

  // SURNA Pro â€” Category 4: Equipment & Inventory
  getInventoryItems(teamId: string): Promise<any[]>;
  createInventoryItem(data: any): Promise<any>;
  updateInventoryItem(id: string, data: any): Promise<any>;
  getInventoryLogs(itemId: string): Promise<any[]>;
  addInventoryLog(data: any): Promise<any>;

  // SURNA Pro â€” Category 5: Scheduling & Availability
  getScheduleRules(teamId: string): Promise<any[]>;
  createScheduleRule(data: any): Promise<any>;
  getRsvps(eventId: string): Promise<any[]>;
  upsertRsvp(data: any): Promise<any>;
  getTeamAvailability(teamId: string): Promise<any[]>;
  setAvailability(data: any): Promise<any>;

  // SURNA Pro â€” Category 6: Performance Stats
  getPlayerMatchStats(matchId: string, userId?: string): Promise<any[]>;
  addPlayerMatchStats(data: any): Promise<any>;
  getTeamMatchStats(matchId: string, teamId: string): Promise<any[]>;
  addTeamMatchStats(data: any): Promise<any>;
  getPlayerTrainingStats(sessionId: string): Promise<any[]>;
  addPlayerTrainingStats(data: any): Promise<any>;

  // SURNA Pro â€” Category 7: Communication Center
  getAnnouncements(teamId: string): Promise<any[]>;
  createAnnouncement(data: any): Promise<any>;
  deleteAnnouncement(id: string): Promise<boolean>;
  getMessageGroups(teamId: string): Promise<any[]>;
  createMessageGroup(data: any): Promise<any>;
  getMessageGroupMembers(groupId: string): Promise<any[]>;
  addMessageGroupMember(data: any): Promise<any>;
  removeMessageGroupMember(groupId: string, userId: string): Promise<boolean>;

  // SURNA Pro â€” Category 8: Recruitment & Trials
  getTrials(teamId: string): Promise<any[]>;
  createTrial(data: any): Promise<any>;
  getTrialApplications(trialId: string): Promise<any[]>;
  applyToTrial(data: any): Promise<any>;
  updateTrialApplication(id: string, data: any): Promise<any>;
  getScoutShortlist(teamId: string): Promise<any[]>;
  addToShortlist(data: any): Promise<any>;
  removeFromShortlist(id: string): Promise<boolean>;

  // SURNA Pro â€” Category 9: Club/Academy Layer
  getClub(id: string): Promise<any | undefined>;
  getClubsByOwner(ownerId: string): Promise<any[]>;
  createClub(data: any): Promise<any>;
  getClubTeams(clubId: string): Promise<any[]>;
  addClubTeam(data: any): Promise<any>;
  getAcademyProfiles(clubId: string): Promise<any[]>;
  createAcademyProfile(data: any): Promise<any>;
  updateAcademyProfile(id: string, data: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: sql`gen_random_uuid()`, // Generate UUID for new users
        ...userData,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUserWithClaims(claimsId: string, userData: UpsertUser): Promise<User> {
    try {
      console.log('Creating user with claims:', { claimsId, email: userData.email });
      // Create user with Replit claims ID
      const [user] = await db
        .insert(users)
        .values({
          id: claimsId, // Use claims sub as the user ID
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          emailVerified: userData.emailVerified ?? false,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            ...(userData.emailVerified === true ? { emailVerified: true } : {}),
            updatedAt: new Date(),
          },
        })
        .returning();
      console.log('User created/updated successfully:', user.id);
      return user;
    } catch (error) {
      console.error('Error in createUserWithClaims:', error);
      throw error;
    }
  }

  // Post operations
  async createPost(authorId: string, post: InsertPost): Promise<Post> {
    const [newPost] = await db
      .insert(posts)
      .values({ ...post, authorId })
      .returning();
    return newPost;
  }

  async updatePost(
    authorId: string,
    postId: string,
    data: { content?: string; sport?: string | null; location?: string | null },
  ): Promise<Post | null> {
    const [updated] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.authorId, authorId), eq(posts.removed, false)))
      .returning();
    return updated ?? null;
  }

  async deletePost(authorId: string, postId: string): Promise<boolean> {
    const [updated] = await db
      .update(posts)
      .set({ removed: true, removedAt: new Date() })
      .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
      .returning();
    return !!updated;
  }

  async getFeedPosts(userId: string, limit = 20, offset = 0): Promise<PostWithAuthor[]> {
    const feedPosts = await db
      .select({
        post: posts,
        author: users,
        isLiked: sql<boolean>`CASE WHEN ${postLikes.userId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .leftJoin(postLikes, and(
        eq(postLikes.postId, posts.id),
        eq(postLikes.userId, userId)
      ))
      .where(eq(posts.removed, false))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return feedPosts.map(({ post, author, isLiked }) => ({
      ...post,
      author,
      isLiked: !!isLiked,
    }));
  }

  async getFeedPostsKeyset(userId: string, limit = 20, cursor?: Date): Promise<{ items: any[]; nextCursor: string | null }> {
    const { mergeImageVariants } = await import("./features/media/variants");
    const { getFollowingUserIds, getBlockedUserIds } = await import("./infrastructure/phase3Social");
    const { parseUserProfile } = await import("@shared/userProfile");
    const followingIds = await getFollowingUserIds(userId);
    const blockedIds = await getBlockedUserIds(userId);

    const [viewer] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const viewerProfile = parseUserProfile(viewer?.profileJson, viewer);
    const prefSports = new Set<string>(
      [
        viewer?.sport,
        viewer?.primarySport,
        ...(viewerProfile.sports ?? []),
      ].filter(Boolean).map((s) => String(s).toLowerCase()),
    );
    const prefLocation = (viewer?.location || "").toLowerCase();

    const basePostQuery = db
      .select({
        post: posts,
        author: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit * 3);

    const feedPostsRaw = cursor
      ? await basePostQuery.where(and(eq(posts.removed, false), lt(posts.createdAt, cursor)))
      : await basePostQuery.where(eq(posts.removed, false));

    const feedPosts = feedPostsRaw.filter(({ author }) => !blockedIds.has(author.id));

    // Fetch place posts
    const basePlacePostQuery = db
      .select({
        post: placePosts,
        place: places,
      })
      .from(placePosts)
      .innerJoin(places, eq(placePosts.placeId, places.id))
      .orderBy(desc(placePosts.createdAt))
      .limit(limit * 2); // Fetch more to ensure we have enough after merging

    const feedPlacePosts = cursor
      ? await basePlacePostQuery.where(lt(placePosts.createdAt, cursor))
      : await basePlacePostQuery;

    // Check if regular posts are liked by the user
    const postsWithLikeStatus = await Promise.all(
      feedPosts.map(async ({ post, author }) => {
        const isLiked = await this.isPostLiked(userId, post.id);
        // Attach `_thumb` / `_medium` (+ modern format) sibling URLs derived
        // from the worker's deterministic naming scheme so list cards can
        // request the small variant and the detail surface can request the
        // larger one. Returns no extra fields when imageUrl isn't a worker URL.
        const variants = mergeImageVariants(post.imageUrl);
        return {
          ...post,
          ...variants,
          author,
          isLiked,
          likedByMe: isLiked,
          postType: 'user',
        };
      })
    );

    // Format place posts
    const formattedPlacePosts = await Promise.all(
      feedPlacePosts.map(async ({ post, place }) => {
        const isLiked = await this.isPlacePostLiked(userId, post.id);
        return {
          ...post,
          ...mergeImageVariants(post.imageUrl),
          place: {
            id: place.id,
            name: place.name,
            profileImageUrl: place.profileImageUrl,
            isVerified: place.isVerified,
            category: place.category,
          },
          postType: "place",
          isLiked,
          likedByMe: isLiked,
        };
      }),
    );

    // Person-ranking: freshness + engagement × follow / sport / location / quality
    const { scoreForPerson } = await import("@shared/personRanking");
    const scoreItem = (item: Record<string, unknown>) => {
      const author = item.author as
        | { id?: string; sport?: string | null; isVerified?: boolean | null }
        | undefined;
      const place = item.place as { id?: string; isVerified?: boolean | null } | undefined;
      const { score } = scoreForPerson(
        {
          createdAt: item.createdAt as Date | string | null,
          sport: (item.sport as string) || author?.sport || null,
          location: (item.location as string) || null,
          authorId: author?.id || null,
          authorSport: author?.sport || null,
          authorVerified: Boolean(author?.isVerified || place?.isVerified),
          likesCount: Number(item.likesCount ?? 0),
          commentsCount: Number(item.commentsCount ?? 0),
          sharesCount: Number(item.sharesCount ?? 0),
          imageUrl: (item.imageUrl as string) || null,
          videoUrl: (item.videoUrl as string) || null,
        },
        {
          preferredSports: [...prefSports],
          locationCity: prefLocation || null,
          followingIds,
        },
      );
      return score;
    };

    const allItems = [...postsWithLikeStatus, ...formattedPlacePosts]
      .sort((a, b) => scoreItem(b) - scoreItem(a))
      .slice(0, limit);

    const nextCursor = allItems.length ? new Date(allItems[allItems.length - 1].createdAt as Date).toISOString() : null;
    return { items: allItems, nextCursor };
  }

  async likePost(userId: string, postId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(postLikes)
        .values({ postId, userId })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) return false;
      await tx.update(posts).set({ likesCount: sql`likes_count + 1` }).where(eq(posts.id, postId));
      return true;
    });
  }

  async unlikePost(userId: string, postId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const deleted = await tx.delete(postLikes).where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId))).returning();
      if (deleted.length === 0) return false;
      await tx.update(posts).set({ likesCount: sql`GREATEST(likes_count - 1, 0)` }).where(eq(posts.id, postId));
      return true;
    });
  }

  async isPostLiked(userId: string, postId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.userId, userId), eq(postLikes.postId, postId)));
    return !!like;
  }

  async addComment(postId: string, authorId: string, content: string): Promise<ApiComment> {
    const [newComment] = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(postComments)
        .values({ postId, authorId, content })
        .returning();

      await tx
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, postId));

      return [inserted];
    });

    const author = await this.getUser(authorId);
    if (!author) throw new Error("Author not found");
    return formatApiComment(newComment, author);
  }

  async addCommentReply(commentId: string, authorId: string, content: string): Promise<ApiComment> {
    const [parentComment] = await db
      .select()
      .from(postComments)
      .where(eq(postComments.id, commentId));

    if (!parentComment) throw new Error("Parent comment not found");

    const [newComment] = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(postComments)
        .values({
          postId: parentComment.postId,
          authorId,
          content,
          parentId: commentId,
        })
        .returning();

      await tx
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, parentComment.postId));

      return [inserted];
    });

    const author = await this.getUser(authorId);
    if (!author) throw new Error("Author not found");
    return formatApiComment(newComment, author);
  }

  async editComment(commentId: string, authorId: string, content: string): Promise<boolean> {
    const [comment] = await db
      .select()
      .from(postComments)
      .where(and(eq(postComments.id, commentId), eq(postComments.authorId, authorId)));
    
    if (!comment) return false;
    
    await db
      .update(postComments)
      .set({ content, updatedAt: new Date() })
      .where(eq(postComments.id, commentId));
    
    return true;
  }

  async deleteComment(commentId: string, authorId: string): Promise<boolean> {
    const [comment] = await db
      .select()
      .from(postComments)
      .where(and(eq(postComments.id, commentId), eq(postComments.authorId, authorId)));
    
    if (!comment) return false;
    
    await db.transaction(async (tx) => {
      await tx.delete(postComments).where(or(
        eq(postComments.id, commentId),
        eq(postComments.parentId, commentId)
      ));
      
      const [deletedComments] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(postComments)
        .where(or(eq(postComments.id, commentId), eq(postComments.parentId, commentId)));
      
      await tx
        .update(posts)
        .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - ${deletedComments.count || 1}, 0)` })
        .where(eq(posts.id, comment.postId));
    });
    
    return true;
  }

  async getCommentReplies(commentId: string): Promise<any[]> {
    const replies = await db
      .select({
        comment: postComments,
        author: users,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(eq(postComments.parentId, commentId))
      .orderBy(asc(postComments.createdAt));
    
    return replies.map(({ comment, author }) => formatApiComment(comment, author));
  }

  async sharePost(userId: string, postId: string, shareType: string = "default"): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.insert(postShares).values({
        userId,
        postId,
        shareType,
      });
      
      await tx
        .update(posts)
        .set({ sharesCount: sql`${posts.sharesCount} + 1` })
        .where(eq(posts.id, postId));
    });
  }

  // Team operations
  async createTeam(ownerId: string, team: InsertTeam): Promise<Team> {
    const [newTeam] = await db
      .insert(teams)
      .values({ ...team, captainId: ownerId })
      .returning();
    
    // Add owner as active team member (default status is pending)
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: ownerId,
      role: "captain",
      status: "active",
      approvedAt: new Date(),
    });

    return newTeam;
  }

  async getTeams(limit = 20, offset = 0, sportQuery?: string): Promise<Team[]> {
    const sport =
      sportQuery?.trim() && sportQuery.toLowerCase() !== "all"
        ? sportQuery.trim()
        : undefined;

    // Hide integration-test teams (captain ids from JWT smoke users) from public discovery.
    const q = db
      .select()
      .from(teams)
      .where(
        and(
          sql`${teams.captainId} NOT LIKE 'jwt-%'`,
          sport ? sql`LOWER(${teams.sport}) = LOWER(${sport})` : sql`true`,
        ),
      )
      .orderBy(desc(teams.createdAt))
      .limit(limit)
      .offset(offset);

    return await q;
  }

  async joinTeam(teamId: string, userId: string): Promise<void> {
    const existing = await db
      .select({ status: teamMembers.status })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);
    if (existing[0]?.status === "active") {
      throw new Error("Already a team member");
    }
    await this.ensureTeamMember(teamId, userId, "member");
  }

  async ensureTeamMember(teamId: string, userId: string, role = "member"): Promise<void> {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: teamMembers.id, status: teamMembers.status })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
        .limit(1);
      if (existing[0]?.status === "active") return;
      if (existing[0]) {
        await tx
          .update(teamMembers)
          .set({ status: "active", role, approvedAt: new Date() })
          .where(eq(teamMembers.id, existing[0].id));
      } else {
        await tx.insert(teamMembers).values({
          teamId,
          userId,
          role,
          status: "active",
          approvedAt: new Date(),
        });
        await tx
          .update(teams)
          .set({ currentMembers: sql`${teams.currentMembers} + 1` })
          .where(eq(teams.id, teamId));
      }
    });
  }

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [team] = await tx.select({ captainId: teams.captainId }).from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!team) throw new Error("Team not found");
      if (team.captainId === userId) throw new Error("Captain cannot leave — transfer captaincy first");

      const [member] = await tx
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId), eq(teamMembers.status, "active")))
        .limit(1);
      if (!member) throw new Error("Not an active member");

      await tx.delete(teamMembers).where(eq(teamMembers.id, member.id));
      await tx
        .update(teams)
        .set({ currentMembers: sql`GREATEST(${teams.currentMembers} - 1, 0)` })
        .where(eq(teams.id, teamId));
    });
  }

  // Message operations
  async sendMessage(senderId: string, message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({ ...message, senderId })
      .returning();
    return newMessage;
  }

  async getConversations(userId: string): Promise<MessageWithSender[]> {
    // Get latest message from each conversation
    const conversations = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    // Group by conversation and take the latest message
    const conversationMap = new Map<string, MessageWithSender>();
    
    conversations.forEach(({ message, sender }) => {
      const otherUserId = message.senderId === userId ? message.receiverId! : message.senderId;
      const key = otherUserId;
      
      if (!conversationMap.has(key) || 
          conversationMap.get(key)!.createdAt! < message.createdAt!) {
        conversationMap.set(key, { ...message, sender });
      }
    });

    return Array.from(conversationMap.values());
  }

  async getMessages(userId: string, otherUserId: string, limit = 50): Promise<MessageWithSender[]> {
    const messageList = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt)
      .limit(limit);

    return messageList.map(({ message, sender }) => ({ ...message, sender }));
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  // Social operations
  async followUser(followerId: string, followingId: string, followingType = "user"): Promise<void> {
    const { ensurePhase3SocialTables } = await import("./infrastructure/phase3Social");
    await ensurePhase3SocialTables();
    await db.execute(sql`
      INSERT INTO follows (follower_id, following_id, following_type)
      VALUES (${followerId}, ${followingId}, ${followingType})
      ON CONFLICT (follower_id, following_id, following_type) DO NOTHING
    `);
    try {
      await db.insert(userFollows).values({ followerId, followedId: followingId });
    } catch { /* legacy mirror */ }
  }

  async unfollowUser(followerId: string, followingId: string, followingType = "user"): Promise<void> {
    const { ensurePhase3SocialTables } = await import("./infrastructure/phase3Social");
    await ensurePhase3SocialTables();
    await db.execute(sql`
      DELETE FROM follows
      WHERE follower_id = ${followerId} AND following_id = ${followingId} AND following_type = ${followingType}
    `);
    await db
      .delete(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followedId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string, followingType = "user"): Promise<boolean> {
    const { ensurePhase3SocialTables } = await import("./infrastructure/phase3Social");
    await ensurePhase3SocialTables();
    const q = await db.execute(sql`
      SELECT 1 FROM follows
      WHERE follower_id = ${followerId} AND following_id = ${followingId} AND following_type = ${followingType}
      LIMIT 1
    `);
    if (q.rows.length > 0) return true;
    const [follow] = await db
      .select()
      .from(userFollows)
      .where(and(eq(userFollows.followerId, followerId), eq(userFollows.followedId, followingId)));
    return !!follow;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followers = await db
      .select({
        user: users
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followerId, users.id))
      .where(eq(userFollows.followedId, userId));
    
    return followers.map(f => f.user);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const following = await db
      .select({
        user: users
      })
      .from(userFollows)
      .innerJoin(users, eq(userFollows.followedId, users.id))
      .where(eq(userFollows.followerId, userId));
    
    return following.map(f => f.user);
  }

  async getFollowersCount(userId: string): Promise<number> {
    const { ensurePhase3SocialTables } = await import("./infrastructure/phase3Social");
    await ensurePhase3SocialTables();
    const q = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM follows
      WHERE following_id = ${userId} AND following_type = 'user'
    `);
    return Number((q.rows[0] as { count?: number })?.count ?? 0);
  }

  async getFollowingCount(userId: string): Promise<number> {
    const { ensurePhase3SocialTables } = await import("./infrastructure/phase3Social");
    await ensurePhase3SocialTables();
    const q = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM follows
      WHERE follower_id = ${userId} AND following_type = 'user'
    `);
    return Number((q.rows[0] as { count?: number })?.count ?? 0);
  }

  async getPostsCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.authorId, userId));
    
    return result?.count || 0;
  }

  async getSuggestedUsers(userId: string, limit = 10): Promise<User[]> {
    const [viewer] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const viewerSport = String(viewer?.sport || viewer?.primarySport || "").toLowerCase();

    const suggested = await db
      .select()
      .from(users)
      .where(
        and(
          sql`${users.id} != ${userId}`,
          sql`${users.id} NOT IN (
            SELECT ${userFollows.followedId} 
            FROM ${userFollows} 
            WHERE ${userFollows.followerId} = ${userId}
          )`
        )
      )
      .orderBy(
        viewerSport
          ? sql`CASE WHEN lower(coalesce(${users.sport}, ${users.primarySport}, '')) = ${viewerSport} THEN 0 ELSE 1 END, RANDOM()`
          : sql`RANDOM()`,
      )
      .limit(limit);
    
    return suggested;
  }

  // Event operations
  async createEvent(organizerId: string, event: InsertEvent): Promise<Event> {
    const [newEvent] = await db
      .insert(events)
      .values({ ...event, organizerId })
      .returning();
    return newEvent;
  }

  async getEvents(limit = 20, offset = 0): Promise<EventWithOrganizer[]> {
    const eventList = await db
      .select({
        event: events,
        organizer: users,
      })
      .from(events)
      .innerJoin(users, eq(events.organizerId, users.id))
      .orderBy(events.startDate)
      .limit(limit)
      .offset(offset);

    return eventList.map(({ event, organizer }) => ({ ...event, organizer }));
  }

  async joinEvent(eventId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Add user to event
      await tx.insert(eventParticipants).values({ eventId, userId });
      
      // Update participant count - use actual column name
      await tx
        .update(events)
        .set({ 
          updatedAt: sql`NOW()` 
        })
        .where(eq(events.id, eventId));
    });
  }

  async isEventRegistered(eventId: string, userId: string): Promise<boolean> {
    const [participant] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId)));
    return !!participant;
  }

  // Coach operations
  async getCoaches(limit = 20, offset = 0, sportQuery?: string): Promise<CoachWithUser[]> {
    const sport =
      sportQuery?.trim() && sportQuery.toLowerCase() !== "all"
        ? sportQuery.trim()
        : undefined;

    const sportMatch = sport
      ? or(
          sql`LOWER(${users.sport}) = LOWER(${sport})`,
          sql`COALESCE(array_to_string(${coaches.specialties}, ' '), '') ILIKE ${"%" + sport + "%"}`
        )
      : sql`true`;

    const coachList = await db
      .select({
        coach: coaches,
        user: users,
      })
      .from(coaches)
      .innerJoin(users, eq(coaches.userId, users.id))
      .where(and(eq(coaches.isActive, true), sportMatch))
      .orderBy(desc(coaches.isVerified), desc(coaches.createdAt))
      .limit(limit)
      .offset(offset);

    return coachList.map(({ coach, user }) => ({ ...coach, user }));
  }

  async getCoachById(coachId: string): Promise<CoachWithUser | undefined> {
    const [result] = await db
      .select({
        coach: coaches,
        user: users,
      })
      .from(coaches)
      .innerJoin(users, eq(coaches.userId, users.id))
      .where(eq(coaches.id, coachId));

    return result ? { ...result.coach, user: result.user } : undefined;
  }

  async startChatWithCoach(userId: string, coachId: string): Promise<ChatRoom> {
    // Get coach user ID
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, coachId));
    if (!coach) throw new Error("Coach not found");

    // Check if chat room already exists
    const existingRooms = await db
      .select()
      .from(chatRooms)
      .where(
        and(
          eq(chatRooms.type, "coach_session"),
          eq(chatRooms.createdBy, userId)
        )
      );

    if (existingRooms.length > 0) {
      return existingRooms[0];
    }

    // Create new chat room
    const [newRoom] = await db
      .insert(chatRooms)
      .values({
        type: "direct",
        name: `Coach Session`,
        createdBy: userId,
      })
      .returning();

    return newRoom;
  }

  // Performance operations
  async getUserPerformance(userId: string): Promise<PerformanceData> {
    // Get or create user performance record
    let [performance] = await db
      .select()
      .from(userPerformance)
      .where(eq(userPerformance.userId, userId));

    if (!performance) {
      [performance] = await db
        .insert(userPerformance)
        .values({ userId: userId, sport: 'general', metrics: { totalPoints: 0, eventsAttended: 0, teamsJoined: 0, challengesCompleted: 0, currentLevel: 1 } })
        .returning();
    }

    // Get recent transactions (using correct column name)
    const recentTransactions = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(10);

    // Get available rewards
    const availableRewards = await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);

    // Get user's redeemed rewards
    const userRewardsList = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId))
      .orderBy(desc(userRewards.redeemedAt));

    return {
      totalPoints: (performance.metrics as any)?.totalPoints || 0,
      eventsAttended: (performance.metrics as any)?.eventsAttended || 0,
      teamsJoined: (performance.metrics as any)?.teamsJoined || 0,
      challengesCompleted: (performance.metrics as any)?.challengesCompleted || 0,
      milestonesReached: (performance.metrics as any)?.milestonesReached || [],
      currentLevel: (performance.metrics as any)?.currentLevel || 1,
      recentTransactions,
      availableRewards,
      userRewards: userRewardsList,
    };
  }

  async addPoints(userId: string, points: number, reason: string, description?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Add point transaction
      await tx.insert(pointTransactions).values({
        userId: userId,
        points,
        action: reason,
        description,
      });

      // Update user performance
      await tx
        .insert(userPerformance)
        .values({ userId: userId, sport: 'general', metrics: { totalPoints: points } })
        .onConflictDoUpdate({
          target: userPerformance.userId,
          set: {
            metrics: sql`jsonb_set(${userPerformance.metrics}::jsonb, '{totalPoints}', to_jsonb(COALESCE((${userPerformance.metrics}::jsonb->>'totalPoints')::int, 0) + ${points}))`,
            createdAt: sql`NOW()`,
          },
        });

      // Update specific counters based on reason
      if (reason === "event_attendance") {
        await tx
          .update(userPerformance)
          .set({ metrics: sql`jsonb_set(${userPerformance.metrics}::jsonb, '{eventsAttended}', to_jsonb(COALESCE((${userPerformance.metrics}::jsonb->>'eventsAttended')::int, 0) + 1))` })
          .where(eq(userPerformance.userId, userId));
      } else if (reason === "team_joined") {
        await tx
          .update(userPerformance)
          .set({ metrics: sql`jsonb_set(${userPerformance.metrics}::jsonb, '{teamsJoined}', to_jsonb(COALESCE((${userPerformance.metrics}::jsonb->>'teamsJoined')::int, 0) + 1))` })
          .where(eq(userPerformance.userId, userId));
      }
    });
  }

  async removePoints(userId: string, points: number, reason: string, description?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Add negative point transaction
      await tx.insert(pointTransactions).values({
        userId: userId,
        points: -points,
        action: reason,
        description,
      });

      // Update user performance
      await tx
        .update(userPerformance)
        .set({ 
          metrics: sql`jsonb_set(${userPerformance.metrics}::jsonb, '{totalPoints}', to_jsonb(GREATEST(0, COALESCE((${userPerformance.metrics}::jsonb->>'totalPoints')::int, 0) - ${points})))`,
          createdAt: sql`NOW()`,
        })
        .where(eq(userPerformance.userId, userId));
    });
  }

  async redeemReward(userId: string, rewardId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Get reward details
      const [reward] = await tx.select().from(rewards).where(eq(rewards.id, rewardId));
      if (!reward || !reward.isActive) return false;

      // Check if reward is still available
      if (reward.maxRedemptions && reward.currentRedemptions !== null && reward.currentRedemptions >= reward.maxRedemptions) {
        return false;
      }

      // Get user's current points
      const [performance] = await tx
        .select()
        .from(userPerformance)
        .where(eq(userPerformance.userId, userId));

      if (!performance || ((performance.metrics as any)?.totalPoints || 0) < reward.pointsCost) {
        return false;
      }

      // Redeem reward
      await tx.insert(userRewards).values({
        userId,
        rewardId,
      });

      // Deduct points (inline — must stay in this transaction)
      await tx.insert(pointTransactions).values({
        userId,
        points: -reward.pointsCost,
        action: "reward_redeemed",
        description: `Redeemed: ${reward.title}`,
      });
      await tx
        .update(userPerformance)
        .set({
          metrics: sql`jsonb_set(${userPerformance.metrics}::jsonb, '{totalPoints}', to_jsonb(GREATEST(0, COALESCE((${userPerformance.metrics}::jsonb->>'totalPoints')::int, 0) - ${reward.pointsCost})))`,
          createdAt: sql`NOW()`,
        })
        .where(eq(userPerformance.userId, userId));

      // Update reward redemption count
      await tx
        .update(rewards)
        .set({ currentRedemptions: sql`COALESCE(${rewards.currentRedemptions}, 0) + 1` })
        .where(eq(rewards.id, rewardId));

      return true;
    });
  }

  async getAvailableRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true))
      .orderBy(rewards.pointsCost);
  }

  async createReward(rewardData: any): Promise<Reward> {
    const [reward] = await db
      .insert(rewards)
      .values(rewardData)
      .returning();
    return reward;
  }

  // Product operations
  async getProducts(category?: string, limit = 20, offset = 0): Promise<Product[]> {
    const baseQuery = db
      .select()
      .from(products)
      .where(eq(products.isActive, true));

    if (category) {
      return await db
        .select()
        .from(products)
        .where(and(eq(products.isActive, true), eq(products.category, category)))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return await baseQuery
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getFeaturedProducts(limit = 10): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt))
      .limit(limit);
  }

  // Location-based methods
  async updateUserLocation(userId: string, latitude: number, longitude: number, locationName?: string): Promise<void> {
    // TODO: Add latitude/longitude columns to users schema
    await db
      .update(users)
      .set({ 
        location: locationName,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getNearbyUsers(latitude: number, longitude: number, radiusKm: number = 5): Promise<User[]> {
    // TODO: Implement geo-location search when location coordinates are added to schema
    // For now, return suggested users
    return this.getSuggestedUsers("", 20);
  }

  async getNearbyEvents(latitude: number, longitude: number, radiusKm: number = 5): Promise<EventWithOrganizer[]> {
    // TODO: Implement geo-location search when location coordinates are added to schema
    // For now, return public events
    return this.getEvents(20, 0);
  }

  // Personalized content operations based on sports preferences
  async getPersonalizedEvents(userId: string, limit: number = 20, offset: number = 0): Promise<EventWithOrganizer[]> {
    // TODO: Implement sports preferences logic once schema includes user sports preferences
    // For now, return general events
    return this.getEvents(limit, offset);
  }

  async getPersonalizedTeams(userId: string, limit: number = 20, offset: number = 0): Promise<Team[]> {
    // TODO: Implement sports preferences logic
    return this.getTeams(limit, offset);
  }

  async getPersonalizedCoaches(userId: string, limit: number = 20, offset: number = 0): Promise<CoachWithUser[]> {
    // TODO: Implement sports preferences logic
    return this.getCoaches(limit, offset);
  }

  async getPersonalizedProducts(userId: string, limit: number = 20, offset: number = 0): Promise<Product[]> {
    // TODO: Implement sports preferences logic once user sports preferences are added to schema
    // For now, return general products
    return this.getProducts(undefined, limit, offset);
  }

  // Wallpaper preferences operations
  async updateWallpaperPreferences(userId: string, enabled: boolean, url: string | null, pages: string[]): Promise<void> {
    await db
      .update(users)
      .set({
        wallpaperEnabled: enabled,
        wallpaperUrl: url,
        wallpaperPages: pages,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getWallpaperPreferences(userId: string): Promise<{ enabled: boolean; url: string | null; pages: string[] }> {
    const [user] = await db
      .select({
        enabled: users.wallpaperEnabled,
        url: users.wallpaperUrl,
        pages: users.wallpaperPages,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const pages = user.pages ?? [];
    const ensuredPages = Array.isArray(pages) ? pages : [];

    return {
      enabled: user.enabled ?? false,
      url: user.url ?? null,
      pages: ensuredPages,
    };
  }

  // Stories operations
  async createStory(userId: string, storyData: InsertStory): Promise<Story> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
    
    const [story] = await db
      .insert(stories)
      .values({
        ...storyData,
        userId,
        expiresAt,
      })
      .returning();
    
    return story;
  }

  async getStoriesForUser(userId: string): Promise<StoryWithUser[]> {
    // Get stories from users that the current user follows + their own stories
    const followedUsers = await db
      .select({ followedId: userFollows.followedId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    
    const followedIds = followedUsers.map(f => f.followedId);
    followedIds.push(userId); // Include user's own stories
    
    // Get non-expired stories from followed users
    const activeStories = await db
      .select()
      .from(stories)
      .where(
        and(
          gte(stories.expiresAt, new Date()),
          or(...followedIds.map(id => eq(stories.userId, id)))
        )
      )
      .orderBy(desc(stories.createdAt));
    
    // Join with user data and check if current user has viewed
    const storiesWithUsers = await Promise.all(
      activeStories.map(async (story) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, story.userId));
        
        const [viewed] = await db
          .select()
          .from(storyViewers)
          .where(
            and(
              eq(storyViewers.storyId, story.id),
              eq(storyViewers.viewerId, userId)
            )
          );
        
        return {
          ...story,
          user,
          viewedByCurrentUser: !!viewed,
        };
      })
    );
    
    return storiesWithUsers;
  }

  async getStoryById(storyId: string, userId: string): Promise<StoryWithUser | null> {
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId));
    
    if (!story) return null;
    
    // Check if expired
    if (new Date() > story.expiresAt) {
      return null;
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, story.userId));
    
    const [viewed] = await db
      .select()
      .from(storyViewers)
      .where(
        and(
          eq(storyViewers.storyId, storyId),
          eq(storyViewers.viewerId, userId)
        )
      );
    
    return {
      ...story,
      user,
      viewedByCurrentUser: !!viewed,
    };
  }

  async markStoryAsViewed(storyId: string, viewerId: string): Promise<void> {
    // Check if already viewed
    const [existing] = await db
      .select()
      .from(storyViewers)
      .where(
        and(
          eq(storyViewers.storyId, storyId),
          eq(storyViewers.viewerId, viewerId)
        )
      );
    
    if (existing) return; // Already viewed
    
    // Add view record
    await db.insert(storyViewers).values({
      storyId,
      viewerId,
    });
    
    // Increment view count
    await db
      .update(stories)
      .set({
        viewCount: sql`${stories.viewCount} + 1`,
      })
      .where(eq(stories.id, storyId));
  }

  async deleteStory(storyId: string, userId: string): Promise<void> {
    // Verify ownership
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId));
    
    if (!story || story.userId !== userId) {
      throw new Error("Not authorized to delete this story");
    }
    
    // Delete all related data
    await db.delete(storyViewers).where(eq(storyViewers.storyId, storyId));
    await db.delete(storyReplies).where(eq(storyReplies.storyId, storyId));
    await db.delete(stories).where(eq(stories.id, storyId));
  }

  async getStoryViewers(storyId: string, userId: string): Promise<User[]> {
    // Verify ownership
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, storyId));
    
    if (!story || story.userId !== userId) {
      throw new Error("Not authorized to view story viewers");
    }
    
    const viewers = await db
      .select({
        user: users,
      })
      .from(storyViewers)
      .innerJoin(users, eq(storyViewers.viewerId, users.id))
      .where(eq(storyViewers.storyId, storyId))
      .orderBy(desc(storyViewers.viewedAt));
    
    return viewers.map(v => v.user);
  }

  async replyToStory(storyId: string, userId: string, content: string): Promise<any> {
    const [reply] = await db
      .insert(storyReplies)
      .values({
        storyId,
        userId,
        content,
      })
      .returning();
    
    return reply;
  }

  // Saved posts operations
  async savePost(userId: string, postId: string, collectionName: string = "saved"): Promise<void> {
    // Check if already saved
    const [existing] = await db
      .select()
      .from(savedPosts)
      .where(
        and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.postId, postId)
        )
      );
    
    if (existing) return; // Already saved
    
    await db.insert(savedPosts).values({
      userId,
      postId,
      collectionName,
    });
  }

  async unsavePost(userId: string, postId: string): Promise<void> {
    await db
      .delete(savedPosts)
      .where(
        and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.postId, postId)
        )
      );
  }

  async isPostSaved(userId: string, postId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedPosts)
      .where(
        and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.postId, postId)
        )
      );
    
    return !!saved;
  }

  async getSavedPosts(userId: string, collectionName?: string): Promise<any[]> {
    const whereCondition = collectionName
      ? and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.collectionName, collectionName)
        )
      : eq(savedPosts.userId, userId);
    
    const results = await db
      .select({
        post: posts,
        author: users,
        savedAt: savedPosts.createdAt,
      })
      .from(savedPosts)
      .innerJoin(posts, eq(savedPosts.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(whereCondition)
      .orderBy(desc(savedPosts.createdAt));
    
    return results.map(r => ({
      ...r.post,
      author: r.author,
      savedAt: r.savedAt,
    }));
  }

  // Live streaming operations
  async createStreamSession(streamerId: string, streamData: InsertStreamSession): Promise<StreamSession> {
    const [stream] = await db
      .insert(streamSessions)
      .values({
        ...streamData,
        streamerId,
        status: "scheduled",
      })
      .returning();
    
    return stream;
  }

  async getActiveStreams(): Promise<any[]> {
    const activeStreams = await db
      .select({
        stream: streamSessions,
        streamer: users,
      })
      .from(streamSessions)
      .innerJoin(users, eq(streamSessions.streamerId, users.id))
      .where(eq(streamSessions.status, "live"))
      .orderBy(desc(streamSessions.viewerCount));
    
    return activeStreams.map(s => ({
      ...s.stream,
      streamer: s.streamer,
    }));
  }

  async joinStream(streamId: string, viewerId: string): Promise<void> {
    // Check if already in stream
    const [existing] = await db
      .select()
      .from(streamViewers)
      .where(
        and(
          eq(streamViewers.streamId, streamId),
          eq(streamViewers.viewerId, viewerId),
          eq(streamViewers.isActive, true)
        )
      );
    
    if (existing) return; // Already watching
    
    // Add viewer
    await db.insert(streamViewers).values({
      streamId,
      viewerId,
      isActive: true,
    });
    
    // Increment viewer count
    await db
      .update(streamSessions)
      .set({
        viewerCount: sql`${streamSessions.viewerCount} + 1`,
        peakViewers: sql`GREATEST(${streamSessions.peakViewers}, ${streamSessions.viewerCount} + 1)`,
      })
      .where(eq(streamSessions.id, streamId));
  }

  async leaveStream(streamId: string, viewerId: string): Promise<void> {
    // Mark viewer as inactive
    await db
      .update(streamViewers)
      .set({
        isActive: false,
        leftAt: new Date(),
      })
      .where(
        and(
          eq(streamViewers.streamId, streamId),
          eq(streamViewers.viewerId, viewerId)
        )
      );
    
    // Decrement viewer count
    await db
      .update(streamSessions)
      .set({
        viewerCount: sql`GREATEST(0, ${streamSessions.viewerCount} - 1)`,
      })
      .where(eq(streamSessions.id, streamId));
  }

  async addStreamComment(streamId: string, userId: string, content: string): Promise<any> {
    const [comment] = await db
      .insert(streamComments)
      .values({
        streamId,
        userId,
        content,
      })
      .returning();
    
    return comment;
  }

  async addStreamReaction(streamId: string, userId: string, reactionType: string): Promise<void> {
    await db.insert(streamReactions).values({
      streamId,
      userId,
      reactionType,
    });
  }

  async updateStreamStatus(streamId: string, status: string): Promise<void> {
    const updates: any = { status };
    
    if (status === "live") {
      updates.startedAt = new Date();
    } else if (status === "ended") {
      updates.endedAt = new Date();
    }
    
    await db
      .update(streamSessions)
      .set(updates)
      .where(eq(streamSessions.id, streamId));
  }

  async getStreamViewers(streamId: string): Promise<User[]> {
    const viewers = await db
      .select({
        user: users,
      })
      .from(streamViewers)
      .innerJoin(users, eq(streamViewers.viewerId, users.id))
      .where(
        and(
          eq(streamViewers.streamId, streamId),
          eq(streamViewers.isActive, true)
        )
      );
    
    return viewers.map(v => v.user);
  }

  // Places operations
  async createPlace(ownerId: string, placeData: InsertPlace): Promise<Place> {
    const [newPlace] = await db
      .insert(places)
      .values({ ...placeData, ownerId })
      .returning();
    return newPlace;
  }

  async updatePlace(placeId: string, ownerId: string, placeData: Partial<InsertPlace>): Promise<Place | null> {
    const [place] = await db
      .select()
      .from(places)
      .where(and(eq(places.id, placeId), eq(places.ownerId, ownerId)));
    
    if (!place) return null;
    
    const [updated] = await db
      .update(places)
      .set({ ...placeData, updatedAt: new Date() })
      .where(eq(places.id, placeId))
      .returning();
    
    return updated;
  }

  async getPlace(placeId: string): Promise<Place | undefined> {
    const [place] = await db.select().from(places).where(eq(places.id, placeId));
    return place;
  }

  async getPlaces(filters?: { sport?: string; city?: string; minRating?: number }, limit = 20, offset = 0): Promise<Place[]> {
    let query = db.select().from(places).where(eq(places.isActive, true));
    
    const conditions = [eq(places.isActive, true)];
    
    if (filters?.sport) {
      conditions.push(sql`${filters.sport} = ANY(${places.sports})`);
    }
    
    if (filters?.city) {
      conditions.push(eq(places.city, filters.city));
    }
    
    if (filters?.minRating) {
      conditions.push(gte(places.averageRating, filters.minRating.toString()));
    }
    
    return await db
      .select()
      .from(places)
      .where(and(...conditions))
      .orderBy(desc(places.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPlacesByOwner(ownerId: string): Promise<Place[]> {
    return await db
      .select()
      .from(places)
      .where(eq(places.ownerId, ownerId))
      .orderBy(desc(places.createdAt));
  }

  async deletePlace(placeId: string, ownerId: string): Promise<boolean> {
    const [place] = await db
      .select()
      .from(places)
      .where(and(eq(places.id, placeId), eq(places.ownerId, ownerId)));
    
    if (!place) return false;
    
    await db.delete(places).where(eq(places.id, placeId));
    return true;
  }

  async searchPlaces(query: string, filters?: { sport?: string; city?: string }, limit = 20): Promise<Place[]> {
    const conditions = [eq(places.isActive, true)];
    
    if (query) {
      conditions.push(
        or(
          sql`${places.name} ILIKE ${`%${query}%`}`,
          sql`${places.description} ILIKE ${`%${query}%`}`,
          sql`${places.city} ILIKE ${`%${query}%`}`
        )!
      );
    }
    
    if (filters?.sport) {
      conditions.push(sql`${filters.sport} = ANY(${places.sports})`);
    }
    
    if (filters?.city) {
      conditions.push(eq(places.city, filters.city));
    }
    
    return await db
      .select()
      .from(places)
      .where(and(...conditions))
      .orderBy(desc(places.averageRating))
      .limit(limit);
  }

  // Place photos operations
  async addPlacePhoto(placeId: string, photoData: InsertPlacePhoto): Promise<PlacePhoto> {
    const [photo] = await db
      .insert(placePhotos)
      .values({ ...photoData, placeId })
      .returning();
    return photo;
  }

  async getPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
    return await db
      .select()
      .from(placePhotos)
      .where(eq(placePhotos.placeId, placeId))
      .orderBy(asc(placePhotos.displayOrder), desc(placePhotos.createdAt));
  }

  async deletePlacePhoto(photoId: string, userId: string): Promise<boolean> {
    const [photo] = await db
      .select()
      .from(placePhotos)
      .where(eq(placePhotos.id, photoId));
    
    if (!photo) return false;
    
    const [place] = await db
      .select()
      .from(places)
      .where(eq(places.id, photo.placeId));
    
    if (!place || (place.ownerId !== userId && photo.uploadedBy !== userId)) {
      return false;
    }
    
    await db.delete(placePhotos).where(eq(placePhotos.id, photoId));
    return true;
  }

  // Place followers operations
  async followPlace(placeId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .insert(placeFollowers)
        .values({ placeId, userId })
        .onConflictDoNothing();
      
      await tx
        .update(places)
        .set({ followersCount: sql`${places.followersCount} + 1` })
        .where(eq(places.id, placeId));
    });
  }

  async unfollowPlace(placeId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(placeFollowers)
        .where(and(eq(placeFollowers.placeId, placeId), eq(placeFollowers.userId, userId)))
        .returning();
      
      if (deleted.length > 0) {
        await tx
          .update(places)
          .set({ followersCount: sql`GREATEST(${places.followersCount} - 1, 0)` })
          .where(eq(places.id, placeId));
      }
    });
  }

  async isFollowingPlace(placeId: string, userId: string): Promise<boolean> {
    const [follower] = await db
      .select()
      .from(placeFollowers)
      .where(and(eq(placeFollowers.placeId, placeId), eq(placeFollowers.userId, userId)));
    return !!follower;
  }

  async getPlaceFollowers(placeId: string, limit = 20, offset = 0): Promise<User[]> {
    const followers = await db
      .select({
        user: users,
      })
      .from(placeFollowers)
      .innerJoin(users, eq(placeFollowers.userId, users.id))
      .where(eq(placeFollowers.placeId, placeId))
      .orderBy(desc(placeFollowers.createdAt))
      .limit(limit)
      .offset(offset);
    
    return followers.map(f => f.user);
  }

  // Place reviews operations
  async addPlaceReview(placeId: string, userId: string, reviewData: InsertPlaceReview): Promise<PlaceReview> {
    return await db.transaction(async (tx) => {
      const [review] = await tx
        .insert(placeReviews)
        .values({ ...reviewData, placeId, userId })
        .returning();
      
      const [stats] = await tx
        .select({
          avgRating: sql<number>`AVG(${placeReviews.rating})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(placeReviews)
        .where(eq(placeReviews.placeId, placeId));
      
      await tx
        .update(places)
        .set({
          averageRating: stats.avgRating.toFixed(2),
          reviewsCount: stats.count,
        })
        .where(eq(places.id, placeId));
      
      return review;
    });
  }

  async updatePlaceReview(reviewId: string, userId: string, reviewData: Partial<InsertPlaceReview>): Promise<PlaceReview | null> {
    return await db.transaction(async (tx) => {
      const [review] = await tx
        .select()
        .from(placeReviews)
        .where(and(eq(placeReviews.id, reviewId), eq(placeReviews.userId, userId)));
      
      if (!review) return null;
      
      const [updated] = await tx
        .update(placeReviews)
        .set({ ...reviewData, updatedAt: new Date() })
        .where(eq(placeReviews.id, reviewId))
        .returning();
      
      const [stats] = await tx
        .select({
          avgRating: sql<number>`AVG(${placeReviews.rating})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(placeReviews)
        .where(eq(placeReviews.placeId, review.placeId));
      
      await tx
        .update(places)
        .set({ averageRating: stats.avgRating.toFixed(2) })
        .where(eq(places.id, review.placeId));
      
      return updated;
    });
  }

  async getPlaceReviews(placeId: string, limit = 20, offset = 0): Promise<PlaceReview[]> {
    return await db
      .select()
      .from(placeReviews)
      .where(eq(placeReviews.placeId, placeId))
      .orderBy(desc(placeReviews.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [review] = await tx
        .select()
        .from(placeReviews)
        .where(and(eq(placeReviews.id, reviewId), eq(placeReviews.userId, userId)));
      
      if (!review) return false;
      
      await tx.delete(placeReviews).where(eq(placeReviews.id, reviewId));
      
      const [stats] = await tx
        .select({
          avgRating: sql<number>`AVG(${placeReviews.rating})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(placeReviews)
        .where(eq(placeReviews.placeId, review.placeId));
      
      await tx
        .update(places)
        .set({
          averageRating: stats.count > 0 ? stats.avgRating.toFixed(2) : "0",
          reviewsCount: sql`GREATEST(${places.reviewsCount} - 1, 0)`,
        })
        .where(eq(places.id, review.placeId));
      
      return true;
    });
  }

  // Place bookings operations
  async createPlaceBooking(userId: string, bookingData: InsertPlaceBooking): Promise<PlaceBooking> {
    return await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(placeBookings)
        .values({ ...bookingData, userId })
        .returning();
      
      await tx
        .update(places)
        .set({ bookingsCount: sql`${places.bookingsCount} + 1` })
        .where(eq(places.id, bookingData.placeId));
      
      return booking;
    });
  }

  async updatePlaceBooking(bookingId: string, updates: Partial<InsertPlaceBooking>): Promise<PlaceBooking | null> {
    const [booking] = await db
      .update(placeBookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(placeBookings.id, bookingId))
      .returning();
    
    return booking || null;
  }

  async getPlaceBookings(placeId: string, ownerId: string, limit = 20, offset = 0): Promise<PlaceBooking[]> {
    const [place] = await db
      .select()
      .from(places)
      .where(and(eq(places.id, placeId), eq(places.ownerId, ownerId)));
    
    if (!place) return [];
    
    return await db
      .select()
      .from(placeBookings)
      .where(eq(placeBookings.placeId, placeId))
      .orderBy(desc(placeBookings.startTime))
      .limit(limit)
      .offset(offset);
  }

  async getUserBookings(userId: string, limit = 20, offset = 0): Promise<PlaceBooking[]> {
    return await db
      .select()
      .from(placeBookings)
      .where(eq(placeBookings.userId, userId))
      .orderBy(desc(placeBookings.startTime))
      .limit(limit)
      .offset(offset);
  }

  async getPlaceBookingById(bookingId: string): Promise<PlaceBooking | null> {
    const [booking] = await db
      .select()
      .from(placeBookings)
      .where(eq(placeBookings.id, bookingId));
    return booking ?? null;
  }

  private async assertPlaceOwner(placeId: string, ownerId: string): Promise<boolean> {
    const [place] = await db
      .select({ ownerId: places.ownerId })
      .from(places)
      .where(eq(places.id, placeId))
      .limit(1);
    return place?.ownerId === ownerId;
  }

  async getPlaceMembershipPlans(placeId: string, activeOnly = false): Promise<PlaceMembershipPlan[]> {
    const { ensurePlaceMembershipPlans } = await import("./features/places/places.compat");
    await ensurePlaceMembershipPlans();

    const conditions = [eq(placeMembershipPlans.placeId, placeId)];
    if (activeOnly) {
      conditions.push(eq(placeMembershipPlans.isActive, true));
    }

    return db
      .select()
      .from(placeMembershipPlans)
      .where(and(...conditions))
      .orderBy(asc(placeMembershipPlans.displayOrder), asc(placeMembershipPlans.createdAt));
  }

  async getPlaceMembershipPlan(planId: string, placeId: string): Promise<PlaceMembershipPlan | null> {
    const { ensurePlaceMembershipPlans } = await import("./features/places/places.compat");
    await ensurePlaceMembershipPlans();

    const [plan] = await db
      .select()
      .from(placeMembershipPlans)
      .where(and(eq(placeMembershipPlans.id, planId), eq(placeMembershipPlans.placeId, placeId)))
      .limit(1);
    return plan ?? null;
  }

  async createPlaceMembershipPlan(
    placeId: string,
    ownerId: string,
    data: InsertPlaceMembershipPlan,
  ): Promise<PlaceMembershipPlan> {
    const { ensurePlaceMembershipPlans } = await import("./features/places/places.compat");
    await ensurePlaceMembershipPlans();

    if (!(await this.assertPlaceOwner(placeId, ownerId))) {
      throw new Error("Not authorized to manage this place");
    }

    const [plan] = await db
      .insert(placeMembershipPlans)
      .values({ ...data, placeId })
      .returning();
    return plan;
  }

  async updatePlaceMembershipPlan(
    planId: string,
    placeId: string,
    ownerId: string,
    data: Partial<InsertPlaceMembershipPlan>,
  ): Promise<PlaceMembershipPlan | null> {
    const { ensurePlaceMembershipPlans } = await import("./features/places/places.compat");
    await ensurePlaceMembershipPlans();

    if (!(await this.assertPlaceOwner(placeId, ownerId))) {
      throw new Error("Not authorized to manage this place");
    }

    const [plan] = await db
      .update(placeMembershipPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(placeMembershipPlans.id, planId), eq(placeMembershipPlans.placeId, placeId)))
      .returning();
    return plan ?? null;
  }

  async deletePlaceMembershipPlan(planId: string, placeId: string, ownerId: string): Promise<boolean> {
    const { ensurePlaceMembershipPlans } = await import("./features/places/places.compat");
    await ensurePlaceMembershipPlans();

    if (!(await this.assertPlaceOwner(placeId, ownerId))) {
      throw new Error("Not authorized to manage this place");
    }

    const result = await db
      .delete(placeMembershipPlans)
      .where(and(eq(placeMembershipPlans.id, planId), eq(placeMembershipPlans.placeId, placeId)));
    return (result.rowCount ?? 0) > 0;
  }

  async cancelBooking(bookingId: string, userId: string, reason?: string): Promise<boolean> {
    const [booking] = await db
      .select()
      .from(placeBookings)
      .where(eq(placeBookings.id, bookingId));
    
    if (!booking) return false;
    
    const [place] = await db
      .select()
      .from(places)
      .where(eq(places.id, booking.placeId));
    
    if (!place || (booking.userId !== userId && place.ownerId !== userId)) {
      return false;
    }
    
    await db
      .update(placeBookings)
      .set({
        status: "cancelled",
        cancellationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(placeBookings.id, bookingId));
    
    return true;
  }

  // Place posts operations
  async createPlacePost(placeId: string, authorId: string, postData: InsertPlacePost): Promise<PlacePost> {
    const [place] = await db
      .select()
      .from(places)
      .where(eq(places.id, placeId));
    
    if (!place || place.ownerId !== authorId) {
      throw new Error("Unauthorized: Only place owner can create posts");
    }
    
    const [post] = await db
      .insert(placePosts)
      .values({ ...postData, placeId, authorId })
      .returning();
    
    return post;
  }

  async getPlacePosts(placeId: string, limit = 20, offset = 0): Promise<PlacePost[]> {
    return await db
      .select()
      .from(placePosts)
      .where(eq(placePosts.placeId, placeId))
      .orderBy(desc(placePosts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async likePlacePost(userId: string, placePostId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(placePostLikes)
        .values({ placePostId, userId })
        .onConflictDoNothing()
        .returning();
      if (inserted.length === 0) return false;
      await tx
        .update(placePosts)
        .set({ likesCount: sql`${placePosts.likesCount} + 1` })
        .where(eq(placePosts.id, placePostId));
      return true;
    });
  }

  async unlikePlacePost(userId: string, placePostId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(placePostLikes)
        .where(and(eq(placePostLikes.userId, userId), eq(placePostLikes.placePostId, placePostId)))
        .returning();
      if (deleted.length === 0) return false;
      await tx
        .update(placePosts)
        .set({ likesCount: sql`GREATEST(${placePosts.likesCount} - 1, 0)` })
        .where(eq(placePosts.id, placePostId));
      return true;
    });
  }

  async isPlacePostLiked(userId: string, placePostId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(placePostLikes)
      .where(and(eq(placePostLikes.userId, userId), eq(placePostLikes.placePostId, placePostId)));
    return !!like;
  }

  async addPlacePostComment(placePostId: string, authorId: string, content: string) {
    const [comment] = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(placePostComments)
        .values({ placePostId, authorId, content })
        .returning();
      await tx
        .update(placePosts)
        .set({ commentsCount: sql`${placePosts.commentsCount} + 1` })
        .where(eq(placePosts.id, placePostId));
      return [inserted];
    });
    return comment;
  }

  // Instant Teams
  async createInstantTeam(creatorId: string, data: any): Promise<InstantTeam> {
    const [team] = await db.insert(instantTeams).values({ ...data, creatorId }).returning();
    await db.insert(instantTeamMembers).values({ teamId: team.id, userId: creatorId, status: 'joined' });
    return team;
  }

  async getInstantTeams(filters?: { sport?: string; status?: string; skillLevel?: string }, viewerId?: string): Promise<any[]> {
    const conditions = [eq(instantTeams.status, filters?.status || 'active')];
    if (filters?.sport) conditions.push(eq(instantTeams.sport, filters.sport));
    if (filters?.skillLevel && filters.skillLevel !== 'any') conditions.push(eq(instantTeams.skillLevel, filters.skillLevel));

    const teams = await db
      .select({
        team: instantTeams,
        creator: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username },
      })
      .from(instantTeams)
      .leftJoin(users, eq(instantTeams.creatorId, users.id))
      .where(and(...conditions))
      .orderBy(asc(instantTeams.startTime))
      .limit(50);

    const rows = teams.map(r => ({ ...r.team, creator: r.creator }));
    if (!viewerId || rows.length === 0) return rows;

    const teamIds = rows.map((t) => t.id);
    const memberships = await db
      .select({ teamId: instantTeamMembers.teamId })
      .from(instantTeamMembers)
      .where(and(inArray(instantTeamMembers.teamId, teamIds), eq(instantTeamMembers.userId, viewerId)));
    const memberSet = new Set(memberships.map((m) => m.teamId));

    const chatByTeam = new Map<string, string>();
    for (const teamId of memberSet) {
      const groupId = await this.getInstantTeamMessengerGroupId(teamId);
      if (groupId) chatByTeam.set(teamId, groupId);
    }

    return rows.map((t) => ({
      ...t,
      isMember: memberSet.has(t.id),
      messengerGroupId: chatByTeam.get(t.id),
    }));
  }

  async getInstantTeam(id: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        team: instantTeams,
        creator: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username },
      })
      .from(instantTeams)
      .leftJoin(users, eq(instantTeams.creatorId, users.id))
      .where(eq(instantTeams.id, id));
    if (!result) return undefined;
    return { ...result.team, creator: result.creator };
  }

  async joinInstantTeam(teamId: string, userId: string): Promise<boolean> {
    const [team] = await db.select().from(instantTeams).where(eq(instantTeams.id, teamId));
    if (!team || team.status !== 'active') return false;
    const currentJoined = team.playersJoined ?? 0;
    if (currentJoined >= team.playersNeeded) return false;

    if (team.visibility === "invite-only" && team.creatorId !== userId) {
      const [invite] = await db
        .select()
        .from(instantTeamInvites)
        .where(
          and(
            eq(instantTeamInvites.teamId, teamId),
            eq(instantTeamInvites.toUserId, userId),
            or(eq(instantTeamInvites.status, "pending"), eq(instantTeamInvites.status, "accepted")),
          ),
        );
      if (!invite) return false;
      if (invite.status === "pending") {
        await db
          .update(instantTeamInvites)
          .set({ status: "accepted" })
          .where(eq(instantTeamInvites.id, invite.id));
      }
    }

    const [existing] = await db.select().from(instantTeamMembers).where(and(eq(instantTeamMembers.teamId, teamId), eq(instantTeamMembers.userId, userId)));
    if (existing) return false;

    await db.insert(instantTeamMembers).values({ teamId, userId, status: 'joined' });
    await db.update(instantTeams).set({ playersJoined: currentJoined + 1 }).where(eq(instantTeams.id, teamId));
    return true;
  }

  async leaveInstantTeam(teamId: string, userId: string): Promise<boolean> {
    const [team] = await db.select().from(instantTeams).where(eq(instantTeams.id, teamId));
    if (!team) return false;

    const [member] = await db.select().from(instantTeamMembers).where(and(eq(instantTeamMembers.teamId, teamId), eq(instantTeamMembers.userId, userId)));
    if (!member) return false;

    await db.delete(instantTeamMembers).where(and(eq(instantTeamMembers.teamId, teamId), eq(instantTeamMembers.userId, userId)));
    const currentJoined = team.playersJoined ?? 0;
    await db.update(instantTeams).set({ playersJoined: Math.max(0, currentJoined - 1) }).where(eq(instantTeams.id, teamId));
    return true;
  }

  async getInstantTeamMembers(teamId: string): Promise<any[]> {
    const members = await db
      .select({ member: instantTeamMembers, user: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username, sport: users.sport } })
      .from(instantTeamMembers)
      .leftJoin(users, eq(instantTeamMembers.userId, users.id))
      .where(eq(instantTeamMembers.teamId, teamId));
    return members.map(m => ({ ...m.member, user: m.user }));
  }

  async ensureInstantTeamMessengerGroupColumn(): Promise<void> {
    await db.execute(sql`ALTER TABLE instant_teams ADD COLUMN IF NOT EXISTS messenger_group_id varchar`);
  }

  async getInstantTeamMessengerGroupId(teamId: string): Promise<string | null> {
    await this.ensureInstantTeamMessengerGroupColumn();
    const q = await db.execute(sql`
      SELECT messenger_group_id FROM instant_teams WHERE id = ${teamId} LIMIT 1
    `);
    const row = q.rows[0] as { messenger_group_id?: string | null } | undefined;
    return row?.messenger_group_id ?? null;
  }

  async setInstantTeamMessengerGroupId(teamId: string, groupId: string): Promise<string> {
    await this.ensureInstantTeamMessengerGroupColumn();
    const q = await db.execute(sql`
      UPDATE instant_teams SET messenger_group_id = ${groupId}
      WHERE id = ${teamId} AND (messenger_group_id IS NULL OR messenger_group_id = '')
      RETURNING messenger_group_id
    `);
    const row = q.rows[0] as { messenger_group_id?: string } | undefined;
    if (row?.messenger_group_id) return row.messenger_group_id;
    const existing = await this.getInstantTeamMessengerGroupId(teamId);
    return existing ?? groupId;
  }

  async expireInstantTeams(): Promise<number> {
    const now = new Date();
    const expiredTeams = await db.select({ id: instantTeams.id }).from(instantTeams)
      .where(and(eq(instantTeams.status, 'active'), lt(instantTeams.startTime, now)));
    if (expiredTeams.length > 0) {
      await db.update(instantTeams)
        .set({ status: 'expired' })
        .where(and(eq(instantTeams.status, 'active'), lt(instantTeams.startTime, now)));
    }
    return expiredTeams.length;
  }

  async convertInstantTeam(teamId: string, userId: string): Promise<any> {
    const [team] = await db.select().from(instantTeams).where(eq(instantTeams.id, teamId));
    if (!team || team.creatorId !== userId) throw new Error("Unauthorized");

    const [newTeam] = await db.insert(teams).values({
      name: team.name,
      sport: team.sport,
      description: team.description || '',
      location: team.locationName || '',
      captainId: userId,
    }).returning();

    const members = await this.getInstantTeamMembers(teamId);
    for (const m of members) {
      await db.insert(teamMembers).values({
        teamId: newTeam.id,
        userId: m.userId,
        role: m.userId === userId ? "captain" : "member",
        status: "active",
        approvedAt: new Date(),
      });
    }

    await db.update(instantTeams).set({ status: 'converted' }).where(eq(instantTeams.id, teamId));
    return newTeam;
  }

  // User Availability
  async getAvailability(userId: string): Promise<UserAvailability | undefined> {
    const [result] = await db.select().from(userAvailability).where(eq(userAvailability.userId, userId));
    return result;
  }

  async upsertAvailability(userId: string, data: any): Promise<UserAvailability> {
    const [result] = await db.insert(userAvailability)
      .values({ ...data, userId, updatedAt: new Date() })
      .onConflictDoUpdate({ target: userAvailability.userId, set: { ...data, updatedAt: new Date() } })
      .returning();
    return result;
  }

  async getAvailablePlayers(filters?: { sport?: string; skillLevel?: string }): Promise<any[]> {
    const conditions = [eq(userAvailability.isAvailable, true)];
    if (filters?.skillLevel && filters.skillLevel !== 'any') conditions.push(eq(userAvailability.skillLevel, filters.skillLevel));

    const results = await db
      .select({ availability: userAvailability, user: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username, sport: users.sport } })
      .from(userAvailability)
      .leftJoin(users, eq(userAvailability.userId, users.id))
      .where(and(...conditions))
      .limit(50);
    return results.map(r => ({ ...r.availability, user: r.user }));
  }

  // Instant Team Invites
  async sendInstantInvite(teamId: string, fromUserId: string, toUserId: string): Promise<InstantTeamInvite> {
    const [invite] = await db.insert(instantTeamInvites).values({ teamId, fromUserId, toUserId }).returning();
    return invite;
  }

  async respondInstantInvite(inviteId: string, userId: string, accept: boolean): Promise<boolean> {
    const [invite] = await db.select().from(instantTeamInvites).where(eq(instantTeamInvites.id, inviteId));
    if (!invite || invite.toUserId !== userId || invite.status !== 'pending') return false;

    await db.update(instantTeamInvites).set({ status: accept ? 'accepted' : 'declined' }).where(eq(instantTeamInvites.id, inviteId));
    if (accept) await this.joinInstantTeam(invite.teamId, userId);
    return true;
  }

  async getUserInstantInvites(userId: string): Promise<any[]> {
    const invites = await db
      .select({ invite: instantTeamInvites, team: instantTeams, fromUser: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl } })
      .from(instantTeamInvites)
      .leftJoin(instantTeams, eq(instantTeamInvites.teamId, instantTeams.id))
      .leftJoin(users, eq(instantTeamInvites.fromUserId, users.id))
      .where(and(eq(instantTeamInvites.toUserId, userId), eq(instantTeamInvites.status, 'pending')))
      .orderBy(desc(instantTeamInvites.createdAt));
    return invites.map(i => ({ ...i.invite, team: i.team, fromUser: i.fromUser }));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Base Layer
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getProTeamRoles(teamId: string): Promise<ProTeamRole[]> {
    return db.select().from(proTeamRoles).where(eq(proTeamRoles.teamId, teamId));
  }

  async createProTeamRole(teamId: string, data: any): Promise<ProTeamRole> {
    const [role] = await db.insert(proTeamRoles).values({ teamId, ...data }).returning();
    return role;
  }

  async updateProTeamRole(roleId: string, data: any): Promise<ProTeamRole | null> {
    const [role] = await db.update(proTeamRoles).set(data).where(eq(proTeamRoles.id, roleId)).returning();
    return role || null;
  }

  async deleteProTeamRole(roleId: string): Promise<boolean> {
    await db.delete(proTeamRoleMembers).where(eq(proTeamRoleMembers.roleId, roleId));
    const result = await db.delete(proTeamRoles).where(eq(proTeamRoles.id, roleId));
    return true;
  }

  async assignProRole(teamId: string, userId: string, roleId: string, assignedBy: string): Promise<ProTeamRoleMember> {
    await db.delete(proTeamRoleMembers).where(and(eq(proTeamRoleMembers.teamId, teamId), eq(proTeamRoleMembers.userId, userId)));
    const [member] = await db.insert(proTeamRoleMembers).values({ teamId, userId, roleId, assignedBy }).returning();
    return member;
  }

  async removeProRole(teamId: string, userId: string, roleId: string): Promise<boolean> {
    await db.delete(proTeamRoleMembers).where(and(eq(proTeamRoleMembers.teamId, teamId), eq(proTeamRoleMembers.userId, userId), eq(proTeamRoleMembers.roleId, roleId)));
    return true;
  }

  async getProTeamRoleMembers(teamId: string): Promise<any[]> {
    const members = await db
      .select({ member: proTeamRoleMembers, user: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username }, role: proTeamRoles })
      .from(proTeamRoleMembers)
      .leftJoin(users, eq(proTeamRoleMembers.userId, users.id))
      .leftJoin(proTeamRoles, eq(proTeamRoleMembers.roleId, proTeamRoles.id))
      .where(eq(proTeamRoleMembers.teamId, teamId));
    return members.map(m => ({ ...m.member, user: m.user, role: m.role }));
  }

  async getUserProRole(teamId: string, userId: string): Promise<ProTeamRoleMember | undefined> {
    const [member] = await db.select().from(proTeamRoleMembers).where(and(eq(proTeamRoleMembers.teamId, teamId), eq(proTeamRoleMembers.userId, userId)));
    return member;
  }

  async logProAudit(teamId: string, userId: string, action: string, details?: { entity?: string; entityId?: string; before?: any; after?: any; ipAddress?: string }): Promise<ProTeamAuditLog> {
    const [log] = await db.insert(proTeamAuditLogs).values({ teamId, userId, action, ...details }).returning();
    return log;
  }

  async getProAuditLogs(teamId: string, limit = 50, offset = 0): Promise<ProTeamAuditLog[]> {
    return db.select().from(proTeamAuditLogs).where(eq(proTeamAuditLogs.teamId, teamId)).orderBy(desc(proTeamAuditLogs.createdAt)).limit(limit).offset(offset);
  }

  async getProTeamSettings(teamId: string): Promise<ProTeamSettings | undefined> {
    const [settings] = await db.select().from(proTeamSettings).where(eq(proTeamSettings.teamId, teamId));
    return settings;
  }

  async upsertProTeamSettings(teamId: string, data: any): Promise<ProTeamSettings> {
    const existing = await this.getProTeamSettings(teamId);
    if (existing) {
      const [updated] = await db.update(proTeamSettings).set({ ...data, updatedAt: new Date() }).where(eq(proTeamSettings.teamId, teamId)).returning();
      return updated;
    }
    const [created] = await db.insert(proTeamSettings).values({ teamId, ...data }).returning();
    return created;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Team Management
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getProRoster(teamId: string): Promise<any[]> {
    const players = await db
      .select({ player: proTeamPlayers, user: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username, sport: users.sport } })
      .from(proTeamPlayers)
      .leftJoin(users, eq(proTeamPlayers.userId, users.id))
      .where(eq(proTeamPlayers.teamId, teamId))
      .orderBy(asc(proTeamPlayers.jerseyNumber));
    return players.map(p => ({ ...p.player, user: p.user }));
  }

  async addProPlayer(teamId: string, data: any): Promise<ProTeamPlayer> {
    const [player] = await db.insert(proTeamPlayers).values({ teamId, ...data }).returning();
    if (data.userId) {
      await this.ensureTeamMember(teamId, data.userId, "member");
    }
    return player;
  }

  async updateProPlayer(playerId: string, data: any): Promise<ProTeamPlayer | null> {
    const [player] = await db.update(proTeamPlayers).set({ ...data, updatedAt: new Date() }).where(eq(proTeamPlayers.id, playerId)).returning();
    return player || null;
  }

  async removeProPlayer(playerId: string): Promise<boolean> {
    await db.delete(proTeamPlayers).where(eq(proTeamPlayers.id, playerId));
    return true;
  }

  async getProStaff(teamId: string): Promise<any[]> {
    const staff = await db
      .select({ staff: proTeamStaff, user: { id: users.id, displayName: users.displayName, profileImageUrl: users.profileImageUrl, username: users.username } })
      .from(proTeamStaff)
      .leftJoin(users, eq(proTeamStaff.userId, users.id))
      .where(eq(proTeamStaff.teamId, teamId));
    return staff.map(s => ({ ...s.staff, user: s.user }));
  }

  async addProStaff(teamId: string, data: any): Promise<ProTeamStaff> {
    const [s] = await db.insert(proTeamStaff).values({ teamId, ...data }).returning();
    return s;
  }

  async removeProStaff(staffId: string): Promise<boolean> {
    await db.delete(proTeamStaff).where(eq(proTeamStaff.id, staffId));
    return true;
  }

  async getProDocuments(teamId: string): Promise<ProTeamDocument[]> {
    return db.select().from(proTeamDocuments).where(eq(proTeamDocuments.teamId, teamId)).orderBy(desc(proTeamDocuments.createdAt));
  }

  async addProDocument(teamId: string, data: any): Promise<ProTeamDocument> {
    const [doc] = await db.insert(proTeamDocuments).values({ teamId, ...data }).returning();
    return doc;
  }

  async deleteProDocument(docId: string): Promise<boolean> {
    await db.delete(proTeamDocuments).where(eq(proTeamDocuments.id, docId));
    return true;
  }

  async getProEquipment(teamId: string): Promise<ProTeamEquipmentIssued[]> {
    return db.select().from(proTeamEquipmentIssued).where(eq(proTeamEquipmentIssued.teamId, teamId));
  }

  async issueProEquipment(teamId: string, data: any): Promise<ProTeamEquipmentIssued> {
    const [item] = await db.insert(proTeamEquipmentIssued).values({ teamId, ...data }).returning();
    return item;
  }

  async returnProEquipment(issuedId: string): Promise<boolean> {
    await db.update(proTeamEquipmentIssued).set({ returnedAt: new Date() }).where(eq(proTeamEquipmentIssued.id, issuedId));
    return true;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 2: Training Plans
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getTrainingSessions(teamId: string): Promise<any[]> {
    return db.select().from(proTrainingSessions).where(eq(proTrainingSessions.teamId, teamId)).orderBy(desc(proTrainingSessions.dateTime));
  }

  async createTrainingSession(data: any): Promise<any> {
    const [session] = await db.insert(proTrainingSessions).values(data).returning();
    return session;
  }

  async getTrainingDrills(teamId: string): Promise<any[]> {
    return db.select().from(proTrainingDrills).where(or(eq(proTrainingDrills.teamId, teamId), eq(proTrainingDrills.isGlobal, true)));
  }

  async createTrainingDrill(data: any): Promise<any> {
    const [drill] = await db.insert(proTrainingDrills).values(data).returning();
    return drill;
  }

  async getSessionDrills(sessionId: string): Promise<any[]> {
    return db.select().from(proTrainingSessionDrills).where(eq(proTrainingSessionDrills.sessionId, sessionId)).orderBy(asc(proTrainingSessionDrills.orderIndex));
  }

  async addDrillToSession(data: any): Promise<any> {
    const [entry] = await db.insert(proTrainingSessionDrills).values(data).returning();
    return entry;
  }

  async getTrainingAttendance(sessionId: string): Promise<any[]> {
    return db.select().from(proTrainingAttendance).where(eq(proTrainingAttendance.sessionId, sessionId));
  }

  async markAttendance(data: any): Promise<any> {
    const [record] = await db.insert(proTrainingAttendance).values(data).returning();
    return record;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 3: Match Day
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getFormations(teamId: string): Promise<any[]> {
    return db.select().from(proFormations).where(eq(proFormations.teamId, teamId));
  }

  async createFormation(data: any): Promise<any> {
    const [formation] = await db.insert(proFormations).values(data).returning();
    return formation;
  }

  async getMatchSquad(matchId: string, teamId: string): Promise<any | undefined> {
    const [squad] = await db.select().from(proMatchSquads).where(and(eq(proMatchSquads.eventId, matchId), eq(proMatchSquads.teamId, teamId)));
    return squad;
  }

  async createMatchSquad(data: any): Promise<any> {
    const [squad] = await db.insert(proMatchSquads).values(data).returning();
    return squad;
  }

  async addSquadPlayer(data: any): Promise<any> {
    const [player] = await db.insert(proMatchSquadPlayers).values(data).returning();
    return player;
  }

  async getSquadPlayers(squadId: string): Promise<any[]> {
    return db.select().from(proMatchSquadPlayers).where(eq(proMatchSquadPlayers.squadId, squadId));
  }

  async addSubstitution(data: any): Promise<any> {
    const [sub] = await db.insert(proMatchSubstitutions).values(data).returning();
    return sub;
  }

  async getMatchSubstitutions(matchId: string): Promise<any[]> {
    return db.select().from(proMatchSubstitutions).where(eq(proMatchSubstitutions.matchId, matchId));
  }

  async addMatchNote(data: any): Promise<any> {
    const [note] = await db.insert(proMatchNotes).values(data).returning();
    return note;
  }

  async getMatchNotes(matchId: string): Promise<any[]> {
    return db.select().from(proMatchNotes).where(eq(proMatchNotes.matchId, matchId)).orderBy(asc(proMatchNotes.minute));
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 4: Equipment & Inventory
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getInventoryItems(teamId: string): Promise<any[]> {
    return db.select().from(proInventoryItems).where(eq(proInventoryItems.teamId, teamId));
  }

  async createInventoryItem(data: any): Promise<any> {
    const [item] = await db.insert(proInventoryItems).values(data).returning();
    return item;
  }

  async updateInventoryItem(id: string, data: any): Promise<any> {
    const [item] = await db.update(proInventoryItems).set(data).where(eq(proInventoryItems.id, id)).returning();
    return item;
  }

  async getInventoryLogs(itemId: string): Promise<any[]> {
    return db.select().from(proInventoryLogs).where(eq(proInventoryLogs.itemId, itemId)).orderBy(desc(proInventoryLogs.createdAt));
  }

  async addInventoryLog(data: any): Promise<any> {
    const [log] = await db.insert(proInventoryLogs).values(data).returning();
    return log;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 5: Scheduling & Availability
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getScheduleRules(teamId: string): Promise<any[]> {
    return db.select().from(proScheduleRules).where(eq(proScheduleRules.teamId, teamId));
  }

  async createScheduleRule(data: any): Promise<any> {
    const [rule] = await db.insert(proScheduleRules).values(data).returning();
    return rule;
  }

  async getRsvps(eventId: string): Promise<any[]> {
    return db.select().from(proTeamRsvp).where(eq(proTeamRsvp.eventId, eventId));
  }

  async upsertRsvp(data: any): Promise<any> {
    const existing = await db.select().from(proTeamRsvp).where(and(eq(proTeamRsvp.eventId, data.eventId), eq(proTeamRsvp.userId, data.userId)));
    if (existing.length > 0) {
      const [updated] = await db.update(proTeamRsvp).set({ status: data.status, updatedAt: new Date() }).where(eq(proTeamRsvp.id, existing[0].id)).returning();
      return updated;
    }
    const [rsvp] = await db.insert(proTeamRsvp).values(data).returning();
    return rsvp;
  }

  async getTeamAvailability(teamId: string): Promise<any[]> {
    return db.select().from(proTeamAvailability);
  }

  async setAvailability(data: any): Promise<any> {
    const [avail] = await db.insert(proTeamAvailability).values(data).returning();
    return avail;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 6: Performance Stats
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getPlayerMatchStats(matchId: string, userId?: string): Promise<any[]> {
    const conditions = [eq(proPlayerMatchStats.matchId, matchId)];
    if (userId) conditions.push(eq(proPlayerMatchStats.userId, userId));
    return db.select().from(proPlayerMatchStats).where(and(...conditions));
  }

  async addPlayerMatchStats(data: any): Promise<any> {
    const [stats] = await db.insert(proPlayerMatchStats).values(data).returning();
    return stats;
  }

  async getTeamMatchStats(matchId: string, teamId: string): Promise<any[]> {
    return db.select().from(proTeamMatchStats).where(and(eq(proTeamMatchStats.matchId, matchId), eq(proTeamMatchStats.teamId, teamId)));
  }

  async addTeamMatchStats(data: any): Promise<any> {
    const [stats] = await db.insert(proTeamMatchStats).values(data).returning();
    return stats;
  }

  async getPlayerTrainingStats(sessionId: string): Promise<any[]> {
    return db.select().from(proPlayerTrainingStats).where(eq(proPlayerTrainingStats.sessionId, sessionId));
  }

  async addPlayerTrainingStats(data: any): Promise<any> {
    const [stats] = await db.insert(proPlayerTrainingStats).values(data).returning();
    return stats;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 7: Communication Center
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getAnnouncements(teamId: string): Promise<any[]> {
    return db.select().from(proTeamAnnouncements).where(eq(proTeamAnnouncements.teamId, teamId)).orderBy(desc(proTeamAnnouncements.pinned), desc(proTeamAnnouncements.createdAt));
  }

  async createAnnouncement(data: any): Promise<any> {
    const [announcement] = await db.insert(proTeamAnnouncements).values(data).returning();
    return announcement;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    await db.delete(proTeamAnnouncements).where(eq(proTeamAnnouncements.id, id));
    return true;
  }

  async getMessageGroups(teamId: string): Promise<any[]> {
    return db.select().from(proTeamMessageGroups).where(eq(proTeamMessageGroups.teamId, teamId));
  }

  async createMessageGroup(data: any): Promise<any> {
    const [group] = await db.insert(proTeamMessageGroups).values(data).returning();
    return group;
  }

  async getMessageGroupMembers(groupId: string): Promise<any[]> {
    return db.select().from(proTeamMessageGroupMembers).where(eq(proTeamMessageGroupMembers.groupId, groupId));
  }

  async addMessageGroupMember(data: any): Promise<any> {
    const [member] = await db.insert(proTeamMessageGroupMembers).values(data).returning();
    return member;
  }

  async removeMessageGroupMember(groupId: string, userId: string): Promise<boolean> {
    await db.delete(proTeamMessageGroupMembers).where(and(eq(proTeamMessageGroupMembers.groupId, groupId), eq(proTeamMessageGroupMembers.userId, userId)));
    return true;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 8: Recruitment & Trials
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getTrials(teamId: string): Promise<any[]> {
    return db.select().from(proTeamTrials).where(eq(proTeamTrials.teamId, teamId)).orderBy(desc(proTeamTrials.dateTime));
  }

  async createTrial(data: any): Promise<any> {
    const [trial] = await db.insert(proTeamTrials).values(data).returning();
    return trial;
  }

  async getTrialApplications(trialId: string): Promise<any[]> {
    return db.select().from(proTrialApplications).where(eq(proTrialApplications.trialId, trialId));
  }

  async applyToTrial(data: any): Promise<any> {
    const [application] = await db.insert(proTrialApplications).values(data).returning();
    return application;
  }

  async updateTrialApplication(id: string, data: any): Promise<any> {
    const [application] = await db.update(proTrialApplications).set(data).where(eq(proTrialApplications.id, id)).returning();
    return application;
  }

  async getScoutShortlist(teamId: string): Promise<any[]> {
    return db.select().from(proScoutShortlist).where(eq(proScoutShortlist.teamId, teamId));
  }

  async addToShortlist(data: any): Promise<any> {
    const [entry] = await db.insert(proScoutShortlist).values(data).returning();
    return entry;
  }

  async removeFromShortlist(id: string): Promise<boolean> {
    await db.delete(proScoutShortlist).where(eq(proScoutShortlist.id, id));
    return true;
  }

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // SURNA PRO â€” Category 9: Club/Academy Layer
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

  async getClub(id: string): Promise<any | undefined> {
    const [club] = await db.select().from(proClubs).where(eq(proClubs.id, id));
    return club;
  }

  async getClubsByOwner(ownerId: string): Promise<any[]> {
    return db.select().from(proClubs).where(eq(proClubs.ownerId, ownerId));
  }

  async createClub(data: any): Promise<any> {
    const [club] = await db.insert(proClubs).values(data).returning();
    return club;
  }

  async getClubTeams(clubId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: proClubTeams.id,
        clubId: proClubTeams.clubId,
        teamId: proClubTeams.teamId,
        createdAt: proClubTeams.createdAt,
        teamName: teams.name,
        teamSport: teams.sport,
        teamLogo: teams.logo,
        teamCity: teams.city,
        teamLocation: teams.location,
        memberCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${teamMembers}
          WHERE ${teamMembers.teamId} = ${teams.id}
            AND ${teamMembers.status} = 'active'
        )`,
      })
      .from(proClubTeams)
      .innerJoin(teams, eq(proClubTeams.teamId, teams.id))
      .where(eq(proClubTeams.clubId, clubId))
      .orderBy(asc(teams.name));
    return rows;
  }

  async isClubTeamLinked(clubId: string, teamId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: proClubTeams.id })
      .from(proClubTeams)
      .where(and(eq(proClubTeams.clubId, clubId), eq(proClubTeams.teamId, teamId)))
      .limit(1);
    return Boolean(row);
  }

  async userCanManageTeam(userId: string, teamId: string): Promise<boolean> {
    const [team] = await db.select({ captainId: teams.captainId }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return false;
    if (team.captainId === userId) return true;
    const [member] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId),
          eq(teamMembers.status, "active"),
        ),
      )
      .limit(1);
    const role = member?.role ?? "";
    return role === "captain" || role === "co_captain" || role === "admin";
  }

  async addClubTeam(data: { clubId: string; teamId: string }): Promise<any> {
    const [entry] = await db.insert(proClubTeams).values(data).returning();
    return entry;
  }

  async getAcademyProfiles(clubId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: proAcademyProfiles.id,
        clubId: proAcademyProfiles.clubId,
        userId: proAcademyProfiles.userId,
        ageGroup: proAcademyProfiles.ageGroup,
        progressJson: proAcademyProfiles.progressJson,
        createdAt: proAcademyProfiles.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        displayName: users.displayName,
        username: users.username,
        profileImageUrl: users.profileImageUrl,
      })
      .from(proAcademyProfiles)
      .innerJoin(users, eq(proAcademyProfiles.userId, users.id))
      .where(eq(proAcademyProfiles.clubId, clubId))
      .orderBy(asc(proAcademyProfiles.createdAt));
    return rows;
  }

  async createAcademyProfile(data: any): Promise<any> {
    const [profile] = await db.insert(proAcademyProfiles).values(data).returning();
    return profile;
  }

  async updateAcademyProfile(id: string, data: any): Promise<any> {
    const [profile] = await db.update(proAcademyProfiles).set(data).where(eq(proAcademyProfiles.id, id)).returning();
    return profile;
  }

  async getPostComments(postId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        authorId: postComments.authorId,
        content: postComments.content,
        parentId: postComments.parentId,
        createdAt: postComments.createdAt,
        authorName: sql<string>`COALESCE(${users.displayName}, TRIM(CONCAT(COALESCE(${users.firstName},''), ' ', COALESCE(${users.lastName},''))))`,
        authorUsername: users.username,
        authorAvatar: users.profileImageUrl,
      })
      .from(postComments)
      .leftJoin(users, eq(postComments.authorId, users.id))
      .where(and(eq(postComments.postId, postId), eq(postComments.removed, false)))
      .orderBy(asc(postComments.createdAt));
    return rows.map((row) => formatApiCommentFromJoin(row));
  }

  async getTeamPhotos(teamId: string): Promise<any[]> {
    return db.select().from(teamPhotos).where(eq(teamPhotos.teamId, teamId)).orderBy(desc(teamPhotos.createdAt));
  }

  async addTeamPhoto(data: { teamId: string; uploaderId: string; imageUrl: string; caption?: string; width?: number; height?: number; }): Promise<any> {
    const [photo] = await db.insert(teamPhotos).values(data).returning();
    return photo;
  }

  async deleteTeamPhoto(photoId: string, userId: string): Promise<boolean> {
    const [photo] = await db.select().from(teamPhotos).where(eq(teamPhotos.id, photoId));
    if (!photo) return false;
    // uploader can delete their own; team captain/admin check via team_members
    if (photo.uploaderId === userId) {
      await db.delete(teamPhotos).where(eq(teamPhotos.id, photoId));
      return true;
    }
    const [member] = await db.select().from(teamMembers)
      .where(and(eq(teamMembers.teamId, photo.teamId), eq(teamMembers.userId, userId)));
    if (member && (member.role === 'captain' || member.role === 'admin' || member.role === 'owner')) {
      await db.delete(teamPhotos).where(eq(teamPhotos.id, photoId));
      return true;
    }
    return false;
  }

  async createGroupChat(creatorId: string, name: string, memberIds: string[]): Promise<any> {
    const { chatRooms, chatRoomParticipants } = await import('@shared/schema');
    const ids = Array.from(new Set([creatorId, ...memberIds]));
    return await db.transaction(async (tx) => {
      const [room] = await tx.insert(chatRooms).values({
        type: 'group',
        name,
        createdBy: creatorId,
        isPrivate: true,
      }).returning();
      await tx.insert(chatRoomParticipants).values(
        ids.map((uid) => ({
          roomId: room.id,
          userId: uid,
          role: uid === creatorId ? 'admin' : 'member',
        }))
      );
      return room;
    });
  }

  async getChallengeMessages(challengeId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: challengeChatMessages.id,
        challengeId: challengeChatMessages.challengeId,
        senderId: challengeChatMessages.senderId,
        content: challengeChatMessages.content,
        createdAt: challengeChatMessages.createdAt,
        senderName: sql<string>`COALESCE(${users.displayName}, TRIM(CONCAT(COALESCE(${users.firstName},''), ' ', COALESCE(${users.lastName},''))))`,
        senderUsername: users.username,
        senderAvatar: users.profileImageUrl,
      })
      .from(challengeChatMessages)
      .leftJoin(users, eq(users.id, challengeChatMessages.senderId))
      .where(eq(challengeChatMessages.challengeId, challengeId))
      .orderBy(asc(challengeChatMessages.createdAt));
    return rows;
  }

  async addChallengeMessage(challengeId: string, senderId: string, content: string): Promise<any> {
    const [row] = await db.insert(challengeChatMessages)
      .values({ challengeId, senderId, content })
      .returning();
    return row;
  }

  async getSharedNote(userId: string, otherUserId: string): Promise<any | null> {
    const [a, b] = [userId, otherUserId].sort();
    const [row] = await db.select().from(dmSharedNotes)
      .where(and(eq(dmSharedNotes.userAId, a), eq(dmSharedNotes.userBId, b)));
    return row || null;
  }

  async upsertSharedNote(userId: string, otherUserId: string, content: string): Promise<any> {
    const [a, b] = [userId, otherUserId].sort();
    const existing = await this.getSharedNote(userId, otherUserId);
    if (existing) {
      const [row] = await db.update(dmSharedNotes)
        .set({ content, updatedById: userId, updatedAt: new Date() })
        .where(eq(dmSharedNotes.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(dmSharedNotes)
      .values({ userAId: a, userBId: b, content, updatedById: userId })
      .returning();
    return row;
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const [m] = await db.select().from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return !!m;
  }

  async getUserPhotos(userId: string): Promise<UserPhoto[]> {
    return db.select().from(userPhotos).where(eq(userPhotos.userId, userId)).orderBy(desc(userPhotos.createdAt));
  }

  async addUserPhoto(data: InsertUserPhoto): Promise<UserPhoto> {
    const [photo] = await db.insert(userPhotos).values(data).returning();
    return photo;
  }

  async deleteUserPhoto(photoId: string, userId: string): Promise<boolean> {
    const [photo] = await db.select().from(userPhotos).where(and(eq(userPhotos.id, photoId), eq(userPhotos.userId, userId)));
    if (!photo) return false;
    await db.delete(userPhotos).where(eq(userPhotos.id, photoId));
    return true;
  }

  async getUserReviews(subjectId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: userReviews.id,
        subjectId: userReviews.subjectId,
        authorId: userReviews.authorId,
        rating: userReviews.rating,
        text: userReviews.text,
        context: userReviews.context,
        createdAt: userReviews.createdAt,
        authorName: sql<string>`COALESCE(${users.displayName}, TRIM(CONCAT(COALESCE(${users.firstName},''), ' ', COALESCE(${users.lastName},''))))`,
        authorUsername: users.username,
        authorAvatar: users.profileImageUrl,
      })
      .from(userReviews)
      .leftJoin(users, eq(userReviews.authorId, users.id))
      .where(eq(userReviews.subjectId, subjectId))
      .orderBy(desc(userReviews.createdAt));
    return rows;
  }

  async upsertUserReview(data: InsertUserReview): Promise<UserReview> {
    const [existing] = await db
      .select({ id: userReviews.id })
      .from(userReviews)
      .where(and(eq(userReviews.subjectId, data.subjectId), eq(userReviews.authorId, data.authorId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(userReviews)
        .set({
          rating: data.rating,
          text: data.text ?? null,
          context: data.context ?? null,
        })
        .where(eq(userReviews.id, existing.id))
        .returning();
      return updated;
    }

    const [review] = await db.insert(userReviews).values(data).returning();
    return review;
  }

  /** @deprecated Use upsertUserReview — kept for callers that only insert. */
  async addUserReview(data: InsertUserReview): Promise<UserReview> {
    return this.upsertUserReview(data);
  }

  async deleteUserReview(reviewId: string, authorId: string): Promise<boolean> {
    const [review] = await db.select().from(userReviews).where(and(eq(userReviews.id, reviewId), eq(userReviews.authorId, authorId)));
    if (!review) return false;
    await db.delete(userReviews).where(eq(userReviews.id, reviewId));
    return true;
  }
}

export const storage = new DatabaseStorage();
