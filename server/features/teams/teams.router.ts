import { Router, type Request, type Response } from 'express';
import { sql, eq, and, desc, or, inArray, gte, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  teams,
  teamMembers,
  teamJoinRequests,
  teamChannels,
  teamChannelMessages,
  users,
  posts,
  proTrainingSessions,
  proMatchSquads,
  events,
  insertTeamSchema,
} from '@shared/schema';
import { teamManagementService } from '../../services/teamManagementService';
import {
  getTeamJoinTemplate,
  submitTeamJoinApplication,
  tryInstantJoin,
  updateTeamJoinTemplate,
} from '../../services/teamJoinApplicationService';
import {
  createTeamMemberInvite,
  declineTeamMemberInvite,
  getPendingInviteForUser,
  listMyPendingInvites,
} from '../../services/teamInviteService';
import {
  getTeamRecord,
  listTeamGames,
  logTeamGame,
} from '../../services/teamGameService';
import { storage } from '../../storage';
import { toPublicUser } from '../../lib/publicData';
import { authUserId } from '../../lib/authUser';
import { isAuthenticated } from '../../replitAuth';
import { cacheAside } from '../../infrastructure/cache';
import { validateBody } from '../../middleware/validate';
import { csrfProtection } from '../../middleware/csrfMiddleware';

const teamsRouter = Router();

interface AuthedRequest extends Request {
  user?: { claims?: { sub?: string }; id?: string };
}

function getUserId(req: AuthedRequest): string | null {
  return authUserId(req) ?? req.user?.claims?.sub ?? req.user?.id ?? null;
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

/**
 * GET /api/teams/my-teams
 * Teams the current user belongs to (any active membership).
 */
teamsRouter.get('/my-teams', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const rows = await db
      .select({
        team: teams,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, 'active')))
      .orderBy(desc(teams.createdAt));

    res.json(rows.map(({ team, role }) => ({ ...team, myRole: role })));
  } catch (err) {
    console.error('[teams] my-teams error', err);
    res.status(500).json({ message: 'Failed to load your teams' });
  }
});

/**
 * PUT /api/teams/join-requests/:requestId
 * Approve or reject a pending join request (captains/co-captains).
 */
teamsRouter.put('/join-requests/:requestId', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const decision = (req.body ?? {}).decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ message: 'decision must be approved or rejected' });
    }

    const result = await teamManagementService.reviewJoinRequest(
      req.params.requestId,
      userId,
      decision,
    );
    res.json({ message: `Request ${decision} successfully`, request: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to review join request';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.delete('/photos/:photoId', isAuthenticated, csrfProtection, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const ok = await storage.deleteTeamPhoto(req.params.photoId, userId);
    if (!ok) return res.status(403).json({ message: 'Not authorized' });
    res.json({ success: true });
  } catch (err) {
    console.error('[teams] delete photo error', err);
    res.status(500).json({ message: 'Failed to delete photo' });
  }
});

/**
 * GET /api/teams — public discovery list (cached).
 */
teamsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit)) || 20;
    const offset = parseInt(String(req.query.offset)) || 0;
    const sportRaw = typeof req.query.sport === 'string' ? req.query.sport : '';
    const sportParam = sportRaw && sportRaw.toLowerCase() !== 'all' ? sportRaw : undefined;
    const sportKey = sportParam?.toLowerCase() ?? 'all';

    const list = await cacheAside(`teams_${limit}_${offset}_${sportKey}`, 30, async () =>
      storage.getTeams(limit, offset, sportParam),
    );

    res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
    res.json(list);
  } catch (err) {
    console.error('[teams] list error', err);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

/**
 * POST /api/teams — create a team.
 */
teamsRouter.post('/', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamData = insertTeamSchema.omit({ captainId: true }).parse(req.body);
    const team = await storage.createTeam(userId, teamData as Parameters<typeof storage.createTeam>[1]);

    let recommendations: Awaited<
      ReturnType<typeof import('../../services/phase6SportService').getTeamCreationRecommendations>
    > | null = null;
    try {
      const { getTeamCreationRecommendations } = await import('../../services/phase6SportService');
      recommendations = await getTeamCreationRecommendations({
        sport: team.sport,
        city: team.city ?? undefined,
        lat: req.body?.lat != null ? Number(req.body.lat) : undefined,
        lng: req.body?.lng != null ? Number(req.body.lng) : undefined,
      });
    } catch (recErr) {
      console.warn('[Phase6-6] Team recommendations skipped:', recErr);
    }

    res.json({ ...team, recommendations });
  } catch (err: unknown) {
    console.error('[teams] create error', err);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid team data', issues: err.errors });
    }
    res.status(500).json({ message: 'Failed to create team' });
  }
});

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  sport: z.string().min(1).max(60).optional(),
  location: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  isPublic: z.boolean().optional(),
  joinPolicy: z.enum(['open', 'approval', 'invite_only']).optional(),
  logo: z.string().url().optional(),
  cover: z.string().url().optional(),
  featuredHighlightIds: z.array(z.string()).max(12).optional(),
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
        ...(body.joinPolicy !== undefined ? { joinPolicy: body.joinPolicy } : {}),
        ...(body.logo !== undefined ? { logo: body.logo } : {}),
        ...(body.cover !== undefined ? { cover: body.cover } : {}),
        ...(body.featuredHighlightIds !== undefined
          ? { featuredHighlightIds: body.featuredHighlightIds }
          : {}),
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

async function activeMemberUserIds(teamId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, 'active')));
  return rows.map((r) => r.userId);
}

function authorDisplayName(user: typeof users.$inferSelect): string {
  const display = (user as { displayName?: string | null }).displayName;
  if (display?.trim()) return display.trim();
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Member';
}

function mapPostRows(rows: { post: typeof posts.$inferSelect; author: typeof users.$inferSelect }[]) {
  return rows.map(({ post, author }) => ({
    ...post,
    author: toPublicUser(author),
    authorName: authorDisplayName(author),
  }));
}

async function viewerCanManageTeam(teamId: string, userId: string): Promise<boolean> {
  const [team] = await db.select({ captainId: teams.captainId }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) return false;
  if (team.captainId === userId) return true;
  const [m] = await db
    .select({ role: teamMembers.role, status: teamMembers.status })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  return (
    m?.status === 'active' &&
    (m.role === 'captain' || m.role === 'co-captain' || m.role === 'admin')
  );
}

teamsRouter.post('/:id/join', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    try {
      const result = await tryInstantJoin(teamId, userId);
      try {
        const { triggerNudgeIfNeeded } = await import('../../services/phase8ProfileService');
        const count = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(teamMembers)
          .where(eq(teamMembers.userId, userId));
        if (Number(count[0]?.c ?? 0) === 1) {
          await triggerNudgeIfNeeded(userId, 'first_team_join');
        }
      } catch (nudgeErr) {
        console.warn('[Phase8-3] Team join nudge skipped:', nudgeErr);
      }
      return res.json({
        success: true,
        status: 'joined',
        joined: true,
        currentMembers: result.currentMembers,
      });
    } catch (instantErr) {
      const msg = instantErr instanceof Error ? instantErr.message : '';
      if (msg === 'JOIN_APPLICATION_REQUIRED') {
        return res.status(400).json({
          message: 'Complete the join form to apply',
          code: 'JOIN_APPLICATION_REQUIRED',
        });
      }
      throw instantErr;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to join team';
    res.status(400).json({ message: msg });
  }
});

teamsRouter.get('/invites/me', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const invites = await listMyPendingInvites(userId);
    res.json(invites);
  } catch (err) {
    console.error('[teams] my invites error', err);
    res.status(500).json({ message: 'Failed to load invites' });
  }
});

teamsRouter.post('/invites/:inviteId/decline', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    await declineTeamMemberInvite(req.params.inviteId, userId);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to decline invite';
    res.status(400).json({ message: msg });
  }
});

const JoinApplicationSchema = z.object({
  message: z.string().max(500).optional(),
  answers: z.record(z.union([z.string(), z.boolean()])).optional(),
  agreedDocumentIds: z.array(z.string()).optional(),
  feeAcknowledged: z.boolean().optional(),
  inviteId: z.string().optional(),
});

teamsRouter.get('/:id/join-template', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req) ?? undefined;
    const template = await getTeamJoinTemplate(req.params.id, userId);
    if (!template) return res.status(404).json({ message: 'Team not found' });
    res.json(template);
  } catch (err) {
    console.error('[teams] join-template error', err);
    res.status(500).json({ message: 'Failed to load join template' });
  }
});

teamsRouter.post('/:id/invites', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const body = z
      .object({
        userId: z.string().min(1),
        message: z.string().max(500).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: body.error.issues });
    }

    const invite = await createTeamMemberInvite(
      req.params.id,
      userId,
      body.data.userId,
      body.data.message,
    );
    res.status(201).json(invite);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send invite';
    res.status(400).json({ message: msg });
  }
});

teamsRouter.put('/:id/join-template', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const JoinTemplateSchema = z.object({
      joinPolicy: z.enum(['open', 'approval', 'invite_only']).optional(),
      isPublic: z.boolean().optional(),
      joinFeeCents: z.number().int().min(0).max(1_000_000).optional(),
      joinFeeNote: z.string().max(500).nullable().optional(),
      requirements: z
        .object({
          questions: z.array(
            z.object({
              id: z.string().min(1),
              type: z.enum(['text', 'yesno', 'select']),
              label: z.string().min(1).max(300),
              required: z.boolean().optional(),
              options: z.array(z.string()).optional(),
            }),
          ),
          documents: z.array(
            z.object({
              id: z.string().min(1),
              title: z.string().min(1).max(200),
              body: z.string().max(5000),
              required: z.boolean().optional(),
            }),
          ),
        })
        .optional(),
    });

    const parsed = JoinTemplateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }

    const updated = await updateTeamJoinTemplate(req.params.id, userId, parsed.data);
    res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update join template';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.post('/:id/apply', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = JoinApplicationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }

    const result = await submitTeamJoinApplication(req.params.id, userId, parsed.data);

    if (result.status === 'joined') {
      try {
        const { triggerNudgeIfNeeded } = await import('../../services/phase8ProfileService');
        const count = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(teamMembers)
          .where(eq(teamMembers.userId, userId));
        if (Number(count[0]?.c ?? 0) === 1) {
          await triggerNudgeIfNeeded(userId, 'first_team_join');
        }
      } catch (nudgeErr) {
        console.warn('[Phase8-3] Team join nudge skipped:', nudgeErr);
      }
    }

    res.json({
      success: true,
      status: result.status,
      joined: result.status === 'joined',
      requestId: result.requestId,
      currentMembers: result.currentMembers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit application';
    res.status(400).json({ message: msg });
  }
});

teamsRouter.post('/:id/leave', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    await storage.leaveTeam(req.params.id, userId);
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to leave team';
    res.status(400).json({ message: msg });
  }
});

const CreateScheduleSchema = z.object({
  title: z.string().min(1).max(120),
  dateTime: z.string().min(1),
  notes: z.string().max(500).optional(),
});

teamsRouter.post('/:id/schedule', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    const canManage = await viewerCanManageTeam(teamId, userId);
    if (!canManage) return res.status(403).json({ message: 'Only team managers can add schedule items' });

    const parsed = CreateScheduleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }

    const [session] = await db
      .insert(proTrainingSessions)
      .values({
        teamId,
        dateTime: new Date(parsed.data.dateTime),
        focus: parsed.data.title,
        notes: parsed.data.notes,
        createdBy: userId,
      })
      .returning();

    try {
      const { notifyTeamScheduleCreated } = await import('../../services/teamNotificationService');
      await notifyTeamScheduleCreated(
        teamId,
        session.id,
        parsed.data.title,
        new Date(parsed.data.dateTime),
        userId,
      );
    } catch (notifyErr) {
      console.warn('[teams] Schedule notification skipped:', notifyErr);
    }

    res.status(201).json({
      schedule: {
        id: session.id,
        title: session.focus || parsed.data.title,
        timeStart: session.dateTime,
        status: 'upcoming',
        type: 'training',
      },
    });
  } catch (err) {
    console.error('[teams] schedule create error', err);
    res.status(500).json({ message: 'Failed to create schedule item' });
  }
});

teamsRouter.get('/:id/feed', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const authorIds = await activeMemberUserIds(req.params.id);
    if (authorIds.length === 0) return res.json({ posts: [] });

    const rows = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(
        and(
          inArray(posts.authorId, authorIds),
          eq(posts.removed, false),
          or(eq(posts.visibility, 'public'), eq(posts.visibility, 'friends')),
        ),
      )
      .orderBy(desc(posts.createdAt))
      .limit(40);

    res.json({ posts: mapPostRows(rows) });
  } catch (err) {
    console.error('[teams] feed error', err);
    res.status(500).json({ message: 'Failed to fetch team feed' });
  }
});

teamsRouter.get('/:id/highlights', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    const [team] = await db
      .select({ featuredHighlightIds: teams.featuredHighlightIds })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    const featuredIds = (team?.featuredHighlightIds ?? []).filter(Boolean);

    const authorIds = await activeMemberUserIds(teamId);
    const seen = new Set<string>();
    const highlights: ReturnType<typeof mapPostRows> = [];

    if (featuredIds.length > 0) {
      const featuredRows = await db
        .select({ post: posts, author: users })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            inArray(posts.id, featuredIds),
            eq(posts.removed, false),
            isNotNull(posts.videoUrl),
          ),
        );
      const byId = new Map(featuredRows.map((r) => [r.post.id, r]));
      for (const id of featuredIds) {
        const row = byId.get(id);
        if (row) {
          highlights.push(...mapPostRows([row]));
          seen.add(id);
        }
      }
    }

    if (authorIds.length > 0 && highlights.length < 12) {
      const rows = await db
        .select({ post: posts, author: users })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            inArray(posts.authorId, authorIds),
            eq(posts.removed, false),
            isNotNull(posts.videoUrl),
            or(eq(posts.visibility, 'public'), eq(posts.visibility, 'friends')),
          ),
        )
        .orderBy(desc(posts.createdAt))
        .limit(24);

      for (const row of rows) {
        if (highlights.length >= 12) break;
        if (seen.has(row.post.id)) continue;
        highlights.push(...mapPostRows([row]));
        seen.add(row.post.id);
      }
    }

    res.json({ highlights });
  } catch (err) {
    console.error('[teams] highlights error', err);
    res.status(500).json({ message: 'Failed to fetch team highlights' });
  }
});

teamsRouter.get('/:id/schedule', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    const now = new Date();

    const sessions = await db
      .select()
      .from(proTrainingSessions)
      .where(and(eq(proTrainingSessions.teamId, teamId), gte(proTrainingSessions.dateTime, now)))
      .orderBy(proTrainingSessions.dateTime)
      .limit(20);

    const matchRows = await db
      .select({ event: events })
      .from(proMatchSquads)
      .innerJoin(events, eq(proMatchSquads.eventId, events.id))
      .where(and(eq(proMatchSquads.teamId, teamId), gte(events.startDate, now)))
      .orderBy(events.startDate)
      .limit(20);

    const schedule = [
      ...sessions.map((s) => ({
        id: s.id,
        title: s.focus || 'Training session',
        timeStart: s.dateTime,
        status: 'upcoming',
        type: 'training',
      })),
      ...matchRows.map(({ event }) => ({
        id: event.id,
        title: event.title,
        timeStart: event.startDate,
        timeEnd: event.endDate,
        location: event.location ? { address: event.location } : undefined,
        status: 'upcoming',
        type: 'match',
      })),
    ].sort(
      (a, b) =>
        new Date(String(a.timeStart)).getTime() - new Date(String(b.timeStart)).getTime(),
    );

    res.json({ schedule });
  } catch (err) {
    console.error('[teams] schedule error', err);
    res.status(500).json({ message: 'Failed to fetch team schedule' });
  }
});

teamsRouter.get('/:id/details', async (req: AuthedRequest, res: Response) => {
  try {
    const team = await teamManagementService.getTeamWithMembers(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('[teams] details error', err);
    res.status(500).json({ message: 'Failed to fetch team details' });
  }
});

teamsRouter.get('/:id/join-requests', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const requests = await teamManagementService.getJoinRequests(req.params.id, userId);
    res.json(requests);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch join requests';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.put('/:id/members/:memberId/role', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { role } = req.body ?? {};
    await teamManagementService.assignRole(req.params.id, req.params.memberId, role, userId);
    res.json({ message: 'Role assigned successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to assign role';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.post('/:id/members/:memberId/attendance', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const canManage = await teamManagementService.hasPermission(req.params.id, userId, 'canManageMembers');
    if (!canManage) return res.status(403).json({ message: 'Only captains can manage attendance' });
    await teamManagementService.updateMemberActivity(req.params.id, req.params.memberId, 'attendance');
    res.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark attendance';
    res.status(500).json({ message: msg });
  }
});

teamsRouter.delete('/:id/members/:memberId', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    await teamManagementService.removeMember(req.params.id, req.params.memberId, userId);
    res.json({ message: 'Member removed successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove member';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.get('/:id/channels', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const channels = await teamManagementService.getTeamChannels(req.params.id, userId);
    res.json(channels);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch channels';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.post('/:id/channels', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { name, description, channelType } = req.body ?? {};
    const channel = await teamManagementService.createChannel(
      req.params.id,
      userId,
      name,
      description,
      channelType,
    );
    res.json({ message: 'Channel created successfully', channel });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create channel';
    res.status(403).json({ message: msg });
  }
});

teamsRouter.get('/:id/photos', async (req: Request, res: Response) => {
  try {
    const photos = await storage.getTeamPhotos(req.params.id);
    res.json(photos);
  } catch (err) {
    console.error('[teams] photos list error', err);
    res.status(500).json({ message: 'Failed to fetch photos' });
  }
});

teamsRouter.post(
  '/:id/photos',
  isAuthenticated,
  csrfProtection,
  validateBody(
    z.object({
      imageUrl: z.string().url(),
      caption: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
  async (req: AuthedRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const isMember = await storage.isTeamMember(req.params.id, userId);
      if (!isMember) return res.status(403).json({ message: 'Only team members can upload' });
      const photo = await storage.addTeamPhoto({
        teamId: req.params.id,
        uploaderId: userId,
        ...req.body,
      });
      res.json(photo);
    } catch (err) {
      console.error('[teams] photo upload error', err);
      res.status(500).json({ message: 'Failed to add photo' });
    }
  },
);

teamsRouter.get('/:id/games', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    const [team] = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const games = await listTeamGames(teamId, limit);
    const record = await getTeamRecord(teamId);
    res.json({ games, record });
  } catch (err) {
    console.error('[teams] list games error', err);
    res.status(500).json({ message: 'Failed to load games' });
  }
});

teamsRouter.post('/:id/games', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const body = z
      .object({
        opponentName: z.string().min(1).max(120),
        result: z.enum(['win', 'loss', 'draw']),
        ourScore: z.number().int().min(0).max(999).optional(),
        theirScore: z.number().int().min(0).max(999).optional(),
        playerIds: z.array(z.string().min(1)).min(1),
        playedAt: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
      .safeParse(req.body ?? {});
    if (!body.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: body.error.issues });
    }

    const result = await logTeamGame(req.params.id, userId, body.data);
    res.status(201).json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to log game';
    res.status(400).json({ message: msg });
  }
});

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

    const isMember = members.some(
      (m) => m.member.userId === userId && m.member.status === 'active',
    );
    const myMembership = members.find((m) => m.member.userId === userId);
    const myRole = myMembership?.member.role ?? null;
    const isCaptain = team.team.captainId === userId;
    const canManage =
      isCaptain ||
      (myMembership?.member.status === 'active' &&
        (myRole === 'captain' || myRole === 'co-captain' || myRole === 'admin'));

    const pendingRequest = await db
      .select({ id: teamJoinRequests.id })
      .from(teamJoinRequests)
      .where(
        and(
          eq(teamJoinRequests.teamId, teamId),
          eq(teamJoinRequests.userId, userId),
          eq(teamJoinRequests.status, 'pending'),
        ),
      )
      .limit(1);

    const pendingInvite = await getPendingInviteForUser(teamId, userId);
    const record = await getTeamRecord(teamId);

    res.json({
      ...team.team,
      joinPolicy: (team.team as { joinPolicy?: string | null }).joinPolicy ?? 'open',
      owner: toPublicUser(team.owner),
      members: members.map(({ member, user }) => ({
        ...member,
        user: toPublicUser(user),
      })),
      isMember,
      myRole,
      isCaptain,
      canManage,
      hasJoined: isMember,
      hasRequestedToJoin: pendingRequest.length > 0,
      pendingInvite: pendingInvite
        ? { id: pendingInvite.id, message: pendingInvite.message }
        : null,
      record: { W: record.W, L: record.L, D: record.D },
      currentWinStreak: team.team.currentWinStreak ?? 0,
      longestWinStreak: team.team.longestWinStreak ?? 0,
    });
  } catch (err) {
    console.error('[teams] get team error', err);
    res.status(500).json({ message: 'Failed to fetch team details' });
  }
});

/**
 * GET /api/teams/:id/sizing-roster — kit sizing summary for team merch orders.
 * Captains/co-captains see full roster sizes; members see their own row + readiness counts.
 */
teamsRouter.get('/:id/sizing-roster', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const teamId = req.params.id;
    const [viewerMembership] = await db
      .select({ status: teamMembers.status })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    const canManage = await viewerCanManageTeam(teamId, userId);
    const isTeammate = viewerMembership?.status === 'active';
    if (!canManage && !isTeammate) {
      return res.status(403).json({ message: 'Join this team to view sizing roster' });
    }

    const { parseUserProfile } = await import('@shared/userProfile');
    const {
      canViewerSeeGearProfile,
      gearProfileMissingFields,
      gearProfileSummary,
      isGearProfileReadyForKit,
    } = await import('@shared/gearProfile');

    const rows = await db
      .select({ member: teamMembers, user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.status, 'active')));

    const roster = rows.map(({ member, user }) => {
      const profile = parseUserProfile(user.profileJson, user);
      const gear = profile.gearProfile;
      const subjectUserId = user.id;
      const canSeeGear = canViewerSeeGearProfile({
        gear,
        viewerUserId: userId,
        subjectUserId,
        viewerIsTeamManager: canManage,
        viewerIsTeammate: isTeammate,
      });

      return {
        memberId: member.id,
        userId: subjectUserId,
        role: member.role,
        name: authorDisplayName(user),
        profileImageUrl: user.profileImageUrl,
        kitReady: isGearProfileReadyForKit(gear),
        missingFields: canSeeGear ? gearProfileMissingFields(gear) : undefined,
        gear: canSeeGear ? gearProfileSummary(gear) : null,
      };
    });

    const readyCount = roster.filter((r) => r.kitReady).length;

    res.json({
      canManage,
      readyCount,
      totalCount: roster.length,
      roster,
    });
  } catch (err) {
    console.error('[teams] sizing-roster error', err);
    res.status(500).json({ message: 'Failed to fetch sizing roster' });
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

teamsRouter.post('/:id/follow', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { ensurePhase3SocialTables } = await import('../../infrastructure/phase3Social');
    const { db } = await import('../../db');
    const { sql } = await import('drizzle-orm');
    await ensurePhase3SocialTables();
    await db.execute(sql`
      INSERT INTO follows (follower_id, following_id, following_type)
      VALUES (${userId}, ${req.params.id}, 'team')
      ON CONFLICT (follower_id, following_id, following_type) DO NOTHING
    `);
    console.log('[Phase3-1] Team follow:', userId, '→', req.params.id);
    res.json({ following: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to follow team';
    res.status(500).json({ message: msg });
  }
});

teamsRouter.delete('/:id/unfollow', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { ensurePhase3SocialTables } = await import('../../infrastructure/phase3Social');
    const { db } = await import('../../db');
    const { sql } = await import('drizzle-orm');
    await ensurePhase3SocialTables();
    await db.execute(sql`
      DELETE FROM follows WHERE follower_id = ${userId} AND following_id = ${req.params.id} AND following_type = 'team'
    `);
    res.json({ following: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to unfollow team';
    res.status(500).json({ message: msg });
  }
});

export default teamsRouter;
