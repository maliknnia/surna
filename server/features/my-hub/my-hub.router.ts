import { Router } from "express";
import { sql } from "drizzle-orm";
import { dbRead } from "../../dbRead";
import { isAuthenticated } from "../../replitAuth";
const myHubRouter = Router();

// Schema bootstrap for the My Hub event lifecycle columns runs from
// `registerFeatureRouters` in `server/features/index.ts` (fail-fast on
// boot) rather than here, so failures aren't swallowed at module load.

/**
 * GET /api/my-hub/summary
 * Aggregates light-management counts for the My Hub home screen.
 * Composes existing tables (events, teams, places, team_join_requests,
 * dm_messages, group_messages) â€” no schema changes.
 */
myHubRouter.get("/summary", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [
      upcomingEventsRow,
      activeTeamsRow,
      activePlacesRow,
      pendingRequestsRow,
      unreadDmsRow,
      unreadGroupsRow,
    ] = await Promise.all([
      // Events the user owns or has RSVP'd to that are upcoming
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c FROM (
          SELECT id FROM events
            WHERE creator_id = ${userId} AND starts_at >= NOW()
          UNION
          SELECT e.id FROM events e
            JOIN event_rsvps r ON r.event_id = e.id
           WHERE r.user_id = ${userId}
             AND r.status IN ('going','interested')
             AND e.starts_at >= NOW()
        ) u;
      `),

      // Teams where user is captain or active member
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c FROM (
          SELECT id FROM teams WHERE captain_id = ${userId}
          UNION
          SELECT team_id FROM team_members
            WHERE user_id = ${userId} AND status = 'active'
        ) u;
      `),

      // Places the user owns
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c FROM places WHERE owner_id = ${userId};
      `),

      // Pending join requests on teams the user captains
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c
          FROM team_join_requests jr
          JOIN teams t ON t.id = jr.team_id
         WHERE t.captain_id = ${userId} AND jr.status = 'pending';
      `),

      // Unread DM messages
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c
          FROM dm_messages m
          JOIN dm_conversations c ON c.id = m.conversation_id
          LEFT JOIN dm_reads r
            ON r.conversation_id = c.id AND r.user_id = ${userId}
         WHERE (c.user_a = ${userId} OR c.user_b = ${userId})
           AND m.sender_id <> ${userId}
           AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at);
      `),

      // Unread group messages
      dbRead.execute(sql`
        SELECT COUNT(*)::int AS c
          FROM group_messages m
          JOIN group_members gm ON gm.group_id = m.group_id AND gm.user_id = ${userId}
          LEFT JOIN group_reads r
            ON r.group_id = m.group_id AND r.user_id = ${userId}
         WHERE m.sender_id <> ${userId}
           AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at);
      `),
    ]);

    const upcomingEvents = Number(upcomingEventsRow.rows?.[0]?.c ?? 0);
    const activeTeams = Number(activeTeamsRow.rows?.[0]?.c ?? 0);
    const activePlaces = Number(activePlacesRow.rows?.[0]?.c ?? 0);
    const pendingRequests = Number(pendingRequestsRow.rows?.[0]?.c ?? 0);
    const unreadDms = Number(unreadDmsRow.rows?.[0]?.c ?? 0);
    const unreadGroups = Number(unreadGroupsRow.rows?.[0]?.c ?? 0);
    const unreadMessages = unreadDms + unreadGroups;

    res.json({
      upcomingEvents,
      activeTeams,
      activePlaces,
      pendingRequests,
      unreadMessages,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[my-hub] summary error", err);
    res.status(500).json({ message: "Failed to load hub summary" });
  }
});

// Note: the My Hub Events screen reads from the canonical events module
// at GET /api/events/me/organized, not a parallel My Hub endpoint. This
// guarantees list/edit/cancel all flow through the same backend so every
// event shown is truly manageable by the viewer.

export default myHubRouter;
