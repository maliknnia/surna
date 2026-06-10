import type { FeedCursor } from "./feed.types";
import { fetchGlobalFeedPage, fetchFollowingFeedPage } from "./feed.repo";
import { cached, invalidate } from "./feed.cache";
import { db } from "../../db";
import { posts, users, teams } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const TTL = 15; // seconds

export async function getFeed(opts: {
  scope: "following" | "global";
  userId?: string;
  cursorCreatedAt?: string;
  cursorId?: string;
  limit: number;
}) {
  const key = `feed:${opts.scope}:${opts.userId ?? "anon"}:${opts.cursorCreatedAt ?? "0"}:${opts.cursorId ?? "0"}:${opts.limit}`;
  const data = await cached(key, TTL, async () => {
    const rows = opts.scope === "following" && opts.userId
      ? await fetchFollowingFeedPage(opts as any)
      : await fetchGlobalFeedPage(opts);

    const next: FeedCursor | null = rows.length
      ? { createdAt: rows[rows.length - 1].createdAt, id: rows[rows.length - 1].id }
      : null;

    return { items: rows, nextCursor: next };
  });
  return data;
}

// Call after post/create/like/comment to keep home timelines fresh.
export async function invalidateUserFeeds(userId: string) {
  await invalidate(`feed:*:${userId}:*`);
}

// Package #10: Create feed post for challenge events
export async function createChallengePost(data: {
  authorId: string;
  eventType: 'created' | 'result';
  challengeId: string;
  title: string;
  sport?: string | null;
  visibility: string;
  scheduledAt?: Date | null;
  outcome?: any;
  participants?: any[];
}) {
  try {
    const { authorId, eventType, challengeId, title, sport, visibility, scheduledAt, outcome, participants } = data;

    // Map challenge visibility to post visibility
    const postVisibility = visibility === 'public' ? 'public' : 'friends';
    
    // Skip feed posting for private/invite-only challenges unless explicit product requirement
    if (visibility === 'private' || visibility === 'invite') {
      console.log(`[Feed] Skipping feed post for ${visibility} challenge ${challengeId}`);
      return null;
    }

    let content = '';
    let eventData: any = {
      challengeId,
      type: eventType,
      title,
      sport,
    };

    if (eventType === 'created') {
      // Template for challenge creation
      const sportText = sport ? ` ${sport}` : '';
      const whenText = scheduledAt ? ` on ${new Date(scheduledAt).toLocaleDateString()}` : '';
      content = `ðŸ† New${sportText} Challenge: ${title}${whenText}! Join now â†’ /challenges/${challengeId}`;
      eventData = { ...eventData, scheduledAt };
    } else if (eventType === 'result') {
      // Template for challenge results with scores and participant names
      const hostScore = outcome?.hostScore ?? 0;
      const guestScore = outcome?.guestScore ?? 0;
      const scoreText = `${hostScore}-${guestScore}`;
      
      // Fetch participant names (graceful fallback to generic labels)
      let hostName = 'Host';
      let guestName = 'Guest';
      
      try {
        if (participants && participants.length >= 2) {
          const host = participants.find((p: any) => p.role === 'host') || participants[0];
          const guest = participants.find((p: any) => p.role === 'guest') || participants[1];
          
          if (host) {
            if (host.type === 'user' || host.participantType === 'user') {
              const [hostUser] = await db.select({ username: users.username })
                .from(users)
                .where(eq(users.id, host.id || host.participantId))
                .limit(1);
              hostName = hostUser?.username || 'Host';
            } else if (host.type === 'team' || host.participantType === 'team') {
              const [hostTeam] = await db.select({ name: teams.name })
                .from(teams)
                .where(eq(teams.id, host.id || host.participantId))
                .limit(1);
              hostName = hostTeam?.name || 'Host Team';
            }
          }
          
          if (guest) {
            if (guest.type === 'user' || guest.participantType === 'user') {
              const [guestUser] = await db.select({ username: users.username })
                .from(users)
                .where(eq(users.id, guest.id || guest.participantId))
                .limit(1);
              guestName = guestUser?.username || 'Guest';
            } else if (guest.type === 'team' || guest.participantType === 'team') {
              const [guestTeam] = await db.select({ name: teams.name })
                .from(teams)
                .where(eq(teams.id, guest.id || guest.participantId))
                .limit(1);
              guestName = guestTeam?.name || 'Guest Team';
            }
          }
        }
      } catch (nameError) {
        console.error('[Feed] Failed to fetch participant names, using fallbacks:', nameError);
      }
      
      let resultText = `Final Score: ${scoreText}`;
      if (outcome?.winner === 'hostWin') {
        resultText = `${hostName} wins ${scoreText}! ðŸ†`;
      } else if (outcome?.winner === 'guestWin') {
        resultText = `${guestName} wins ${scoreText}! ðŸ†`;
      } else if (outcome?.winner === 'draw') {
        resultText = `${hostName} vs ${guestName} ends ${scoreText} (Draw)`;
      }
      
      content = `ðŸŽ¯ Challenge Complete: ${title} - ${resultText} View results â†’ /challenges/${challengeId}`;
      eventData = { ...eventData, outcome, participants, hostName, guestName };
    }

    const [post] = await db.insert(posts).values({
      authorId,
      content,
      sport: sport || undefined,
      postType: `challenge:${eventType}`,
      eventData,
      visibility: postVisibility,
      mediaType: 'text',
    }).returning();

    // Invalidate feed cache for author
    await invalidateUserFeeds(authorId);

    console.log(`[Feed] Created challenge ${eventType} post for challenge ${challengeId}`);
    return post;
  } catch (error) {
    // Best-effort: log error but don't fail challenge creation
    console.error('[Feed] Failed to create challenge post:', error);
    return null;
  }
}
