import { Router, type Request, type Response } from 'express';
import { sql, eq, and, desc, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  teams,
  teamMembers,
  teamJoinRequests,
  teamChannels,
  teamChannelMessages,
  users,
} from '@shared/schema';
import { teamManagementService } from '../../services/teamManagementService';
import { toPublicUser } from '../../lib/publicData';
import { isAuthenticated } from '../../replitAuth';

const teamsRouter = Router();

interface AuthedRequest extends Request {
  user?: { claims?: { sub?: string }; id?: string };
}

function getUserId(req: AuthedRequest): string | null {
  return req.user?.claims?.sub ?? req.user?.id ?? null;
}

// =============================================================================
// REAL endpoints used by My Hub. Defined BEFORE the legacy mock `/:id`
// route so static paths match first. All flows go through canonical
// `teams` / `team_members` / `team_join_requests` / `team_channels`
// tables â€” no parallel models.
// =============================================================================

/**
 * GET /api/teams/me/managed
 * Lists teams the current user owns or has admin/captain/co-captain
 * rights on (i.e. teams they can actually manage). Includes
 * member count, pending-join-request count, last-activity timestamp,
 * and the viewer's role on the team.
 */
teamsRouter.get('/me/managed', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const q = await db.execute(sql`
      WITH my_teams AS (
        SELECT t.*,
               CASE
                 WHEN t.captain_id = ${userId} THEN 'captain'
                 ELSE COALESCE(tm.role, 'member')
               END AS my_role
          FROM teams t
          LEFT JOIN team_members tm
            ON tm.team_id = t.id
           AND tm.user_id = ${userId}
           AND tm.status = 'active'
         WHERE t.captain_id = ${userId}
            OR (tm.user_id = ${userId}
                AND tm.status = 'active'
                AND tm.role IN ('captain', 'co-captain', 'admin'))
      )
      SELECT mt.id              AS "id",
             mt.name             AS "name",
             mt.slug             AS "slug",
             mt.sport            AS "sport",
             mt.location         AS "location",
             mt.city             AS "city",
             mt.logo             AS "logo",
             mt.cover            AS "cover",
             mt.description      AS "description",
             mt.is_public        AS "isPublic",
             mt.captain_id       AS "captainId",
             mt.current_members  AS "currentMembers",
             mt.max_members      AS "maxMembers",
             mt.created_at       AS "createdAt",
             mt.updated_at       AS "updatedAt",
             mt.my_role          AS "myRole",
             COALESCE(jr.cnt, 0)::int                          AS "pendingRequestsCount",
             COALESCE(act.last_activity_at, mt.updated_at)     AS "lastActivityAt"
        FROM my_teams mt
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS cnt
            FROM team_join_requests
           WHERE team_id = mt.id AND status = 'pending'
        ) jr ON true
        LEFT JOIN LATERAL (
          SELECT MAX(tcm.created_at) AS last_activity_at
            FROM team_channel_messages tcm
            JOIN team_channels tc ON tc.id = tcm.channel_id
           WHERE tc.team_id = mt.id
        ) act ON true
       ORDER BY "lastActivityAt" DESC NULLS LAST, mt.created_at DESC
       LIMIT 200;
    `);

    res.json({
      items: q.rows ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[teams] me/managed error', err);
    res.status(500).json({ message: 'Failed to load your teams' });
  }
});

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  sport: z.string().min(1).max(60).optional(),
  location: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  isPublic: z.boolean().optional(),
});

/**
 * PATCH /api/teams/:id
 * Edit basic team info. Restricted to the team captain so the row
 * returned is always one the viewer can actually manage.
 */
teamsRouter.patch('/:id', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = UpdateTeamSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }
    const body = parsed.data;
    const id = req.params.id;

    const team = await db
      .select({ captainId: teams.captainId })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);
    if (!team[0]) return res.status(404).json({ message: 'Not found' });
    const isCaptain = team[0].captainId === userId;
    let isManager = isCaptain;
    if (!isManager) {
      const m = await db
        .select({ role: teamMembers.role, status: teamMembers.status })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, id), eq(teamMembers.userId, userId)))
        .limit(1);
      isManager =
        m[0]?.status === 'active' &&
        (m[0]?.role === 'captain' || m[0]?.role === 'co-captain' || m[0]?.role === 'admin');
    }
    if (!isManager) {
      return res.status(403).json({ message: 'Only captains, co-captains or admins can edit basic info' });
    }

    const [updated] = await db
      .update(teams)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.sport !== undefined ? { sport: body.sport } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error('[teams] patch error', err);
    res.status(500).json({ message: 'Failed to update team' });
  }
});

const PostUpdateSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * POST /api/teams/:id/updates
 * Posts a simple text update from a captain or co-captain. Reuses the
 * canonical `team_channels` + `team_channel_messages` tables â€” finds
 * (or auto-creates) a single "general" channel for the team and writes
 * the message there, so the same backend Pro uses serves the post.
 */
teamsRouter.post('/:id/updates', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = PostUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }

    const teamId = req.params.id;

    // Authorize: captain, co-captain, or the team's captain_id.
    const memberRow = await db
      .select({
        role: teamMembers.role,
        status: teamMembers.status,
      })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);
    const team = await db.select({ captainId: teams.captainId }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team[0]) return res.status(404).json({ message: 'Not found' });
    const isCaptain = team[0].captainId === userId;
    const isManager =
      isCaptain ||
      (memberRow[0]?.status === 'active' &&
        (memberRow[0]?.role === 'captain' ||
          memberRow[0]?.role === 'co-captain' ||
          memberRow[0]?.role === 'admin'));
    if (!isManager) {
      return res.status(403).json({ message: 'Only captains, co-captains or admins can post updates' });
    }

    // Find or create a general channel.
    let channel = (
      await db
        .select()
        .from(teamChannels)
        .where(and(eq(teamChannels.teamId, teamId), eq(teamChannels.name, 'general')))
        .limit(1)
    )[0];
    if (!channel) {
      const inserted = await db
        .insert(teamChannels)
        .values({ teamId, name: 'general', description: 'Team updates', channelType: 'announcement', createdBy: userId })
        .returning();
      channel = inserted[0];
    }

    const [message] = await db
      .insert(teamChannelMessages)
      .values({
        channelId: channel.id,
        senderId: userId,
        content: parsed.data.content,
      })
      .returning();

    res.status(201).json({ channelId: channel.id, message });
  } catch (err) {
    console.error('[teams] post update error', err);
    res.status(500).json({ message: 'Failed to post update' });
  }
});

// =============================================================================
// Team detail (real DB) — replaces legacy mocks that shadowed routes.ts handlers
// =============================================================================

teamsRouter.get('/:id', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const teamId = req.params.id;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const [team] = await db
      .select({ team: teams, owner: users })
      .from(teams)
      .innerJoin(users, eq(teams.captainId, users.id))
      .where(eq(teams.id, teamId));

    if (!team) return res.status(404).json({ message: 'Team not found' });

    const members = await db
      .select({ member: teamMembers, user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    const isMember = members.some((m) => m.member.userId === userId);

    res.json({
      ...team.team,
      owner: toPublicUser(team.owner),
      members: members.map(({ member, user }) => ({
        ...member,
        user: toPublicUser(user),
      })),
      isMember,
    });
  } catch (err) {
    console.error('[teams] get team error', err);
    res.status(500).json({ message: 'Failed to fetch team details' });
  }
});

teamsRouter.get('/:id/members', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const rows = await db
      .select({ member: teamMembers, user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, req.params.id), eq(teamMembers.status, 'active')));

    res.json({
      members: rows.map(({ member, user }) => ({
        ...member,
        user: toPublicUser(user),
      })),
    });
  } catch (err) {
    console.error('[teams] members error', err);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

teamsRouter.post('/:id/join-request', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { message } = req.body ?? {};
    const result = await teamManagementService.requestToJoinTeam(req.params.id, userId, message);
    res.json({ success: true, status: 'pending', request: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit join request';
    res.status(400).json({ message: msg });
  }
});

teamsRouter.post('/:id/follow', isAuthenticated, async (_req: AuthedRequest, res: Response) => {
  // Team follow is not persisted yet — avoid fake counts misleading the UI.
  res.status(501).json({ message: 'Team follow is not available yet' });
});

export default teamsRouter;
