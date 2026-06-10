import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { isAuthenticated } from '../../replitAuth';

const placesRouter = Router();

interface AuthedRequest extends Request {
  user?: { claims?: { sub?: string }; id?: string };
}

function getUserId(req: AuthedRequest): string | null {
  return req.user?.claims?.sub ?? req.user?.id ?? null;
}

/**
 * GET /api/places/me/owned
 * Lists places the current user owns, with light counts the My Hub
 * card needs (pending booking requests, upcoming confirmed bookings,
 * photo count). Camel-cased response. Mounted before the legacy
 * `/api/places/:id` handler so the static path matches first.
 */
placesRouter.get('/me/owned', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const q = await db.execute(sql`
      SELECT p.id                                               AS "id",
             p.name                                             AS "name",
             p.category                                         AS "category",
             p.sports                                           AS "sports",
             p.bio                                              AS "bio",
             p.profile_image_url                                AS "profileImageUrl",
             p.cover_image_url                                  AS "coverImageUrl",
             p.address                                          AS "address",
             p.city                                             AS "city",
             p.state                                            AS "state",
             p.is_active                                        AS "isActive",
             p.is_verified                                      AS "isVerified",
             p.followers_count                                  AS "followersCount",
             p.reviews_count                                    AS "reviewsCount",
             p.bookings_count                                   AS "bookingsCount",
             p.views_count                                      AS "viewsCount",
             p.average_rating                                   AS "averageRating",
             p.created_at                                       AS "createdAt",
             p.updated_at                                       AS "updatedAt",
             COALESCE(pend.cnt, 0)::int                         AS "pendingBookingsCount",
             COALESCE(upc.cnt, 0)::int                          AS "upcomingBookingsCount",
             COALESCE(ph.cnt, 0)::int                           AS "photosCount"
        FROM places p
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS cnt
            FROM place_bookings
           WHERE place_id = p.id AND status = 'pending'
        ) pend ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS cnt
            FROM place_bookings
           WHERE place_id = p.id
             AND status = 'confirmed'
             AND start_time >= NOW()
        ) upc ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS cnt
            FROM place_photos
           WHERE place_id = p.id
        ) ph ON true
       WHERE p.owner_id = ${userId}
       ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
       LIMIT 200;
    `);

    res.json({
      items: q.rows ?? [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[places] me/owned error', err);
    res.status(500).json({ message: 'Failed to load your places' });
  }
});

const ToggleSchema = z.object({
  isActive: z.boolean(),
});

/**
 * PATCH /api/places/:id/status
 * Light-touch open/closed toggle for owners. Keeps the heavier
 * full-record PUT /api/places/:id route untouched. Owner-only.
 */
placesRouter.patch('/:id/status', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = ToggleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'INVALID_BODY', issues: parsed.error.issues });
    }

    const r = await db.execute(sql`
      UPDATE places
         SET is_active = ${parsed.data.isActive},
             updated_at = NOW()
       WHERE id = ${req.params.id}
         AND owner_id = ${userId}
       RETURNING id AS "id", is_active AS "isActive";
    `);
    const row = r.rows?.[0];
    if (!row) {
      return res.status(404).json({ message: 'Place not found or not owned by you' });
    }
    res.json(row);
  } catch (err) {
    console.error('[places] status toggle error', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

export default placesRouter;
