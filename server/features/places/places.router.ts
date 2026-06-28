import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { isAuthenticated } from '../../replitAuth';
import { storage } from '../../storage';
import { insertPlaceMembershipPlanSchema } from '@shared/schema';

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

const MembershipEnquireSchema = z.object({
  notes: z.string().max(2000).optional(),
});

/**
 * GET /api/places/:id/membership-plans — public active plans (before /:id/availability).
 */
placesRouter.get('/:id/membership-plans', async (req: AuthedRequest, res: Response) => {
  try {
    const { ensurePlaceMembershipPlans } = await import('./places.compat');
    await ensurePlaceMembershipPlans();

    const userId = getUserId(req);
    let activeOnly = true;
    if (req.query.includeInactive === 'true' && userId) {
      const ownerCheck = await db.execute(sql`
        SELECT 1 FROM places WHERE id = ${req.params.id} AND owner_id = ${userId} LIMIT 1
      `);
      if ((ownerCheck.rows?.length ?? 0) > 0) activeOnly = false;
    }

    const plans = await storage.getPlaceMembershipPlans(req.params.id, activeOnly);
    res.json({ plans });
  } catch (err) {
    console.error('[places] membership-plans list error', err);
    res.status(500).json({ message: 'Failed to load membership plans' });
  }
});

/**
 * POST /api/places/:id/membership-plans — owner creates a plan.
 */
placesRouter.post('/:id/membership-plans', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = insertPlaceMembershipPlanSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid plan data', issues: parsed.error.issues });
    }

    const plan = await storage.createPlaceMembershipPlan(req.params.id, userId, parsed.data);
    res.status(201).json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create plan';
    const status = message.includes('Not authorized') ? 403 : 500;
    res.status(status).json({ message });
  }
});

/**
 * PUT /api/places/:id/membership-plans/:planId — owner updates a plan.
 */
placesRouter.put('/:id/membership-plans/:planId', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = insertPlaceMembershipPlanSchema.partial().safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid plan data', issues: parsed.error.issues });
    }

    const plan = await storage.updatePlaceMembershipPlan(
      req.params.planId,
      req.params.id,
      userId,
      parsed.data,
    );
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update plan';
    const status = message.includes('Not authorized') ? 403 : 500;
    res.status(status).json({ message });
  }
});

/**
 * DELETE /api/places/:id/membership-plans/:planId — owner removes a plan.
 */
placesRouter.delete('/:id/membership-plans/:planId', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deleted = await storage.deletePlaceMembershipPlan(req.params.planId, req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: 'Plan not found' });
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete plan';
    const status = message.includes('Not authorized') ? 403 : 500;
    res.status(status).json({ message });
  }
});

/**
 * POST /api/places/:id/membership-plans/:planId/enquire — guest membership enquiry.
 */
placesRouter.post('/:id/membership-plans/:planId/enquire', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = MembershipEnquireSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid enquiry', issues: parsed.error.issues });
    }

    const { ensurePlaceMembershipPlans } = await import('./places.compat');
    await ensurePlaceMembershipPlans();

    const plan = await storage.getPlaceMembershipPlan(req.params.planId, req.params.id);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: 'Membership plan not found' });
    }

    const placeRow = await db.execute(sql`
      SELECT name, booking_mode AS "bookingMode" FROM places WHERE id = ${req.params.id} LIMIT 1
    `);
    const place = placeRow.rows?.[0] as { name?: string; bookingMode?: string } | undefined;
    if (!place) return res.status(404).json({ message: 'Place not found' });
    if ((place.bookingMode ?? 'request') !== 'membership') {
      return res.status(400).json({ message: 'This venue does not accept membership enquiries online' });
    }

    const now = new Date();
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);

    const booking = await storage.createPlaceBooking(userId, {
      userId,
      placeId: req.params.id,
      membershipPlanId: plan.id,
      bookingType: 'membership',
      title: `${place.name ?? 'Venue'} — ${plan.name}`,
      description: plan.description ?? undefined,
      startTime: now,
      endTime: end,
      status: 'pending',
      price: plan.price != null ? String(plan.price) : undefined,
      notes: parsed.data.notes,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error('[places] membership enquire error', err);
    res.status(500).json({ message: 'Failed to submit membership enquiry' });
  }
});

/**
 * GET /api/places/:id/slot-calendar?date=YYYY-MM-DD — owner slot grid (before /:id/availability).
 */
placesRouter.get('/:id/slot-calendar', isAuthenticated, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date query required (YYYY-MM-DD)' });
    }

    const ownerCheck = await db.execute(sql`
      SELECT owner_id AS "ownerId" FROM places WHERE id = ${req.params.id} LIMIT 1
    `);
    const ownerId = (ownerCheck.rows?.[0] as { ownerId?: string } | undefined)?.ownerId;
    if (!ownerId) return res.status(404).json({ message: 'Place not found' });
    if (ownerId !== userId) return res.status(403).json({ message: 'Owner access only' });

    const { getOwnerSlotCalendar } = await import('../../services/placeAvailabilityService');
    const result = await getOwnerSlotCalendar(req.params.id, date);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load slot calendar';
    const status = message === 'Place not found' ? 404 : 500;
    res.status(status).json({ message });
  }
});

/**
 * GET /api/places/:id/availability?date=YYYY-MM-DD
 * Open time slots for slot-based venues (before /:id/status).
 */
placesRouter.get('/:id/availability', async (req: AuthedRequest, res: Response) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'date query required (YYYY-MM-DD)' });
    }
    const { getPlaceAvailability } = await import('../../services/placeAvailabilityService');
    const result = await getPlaceAvailability(req.params.id, date);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load availability';
    const status = message === 'Place not found' ? 404 : 500;
    res.status(status).json({ message });
  }
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
