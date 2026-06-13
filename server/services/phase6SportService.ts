import { sql } from "drizzle-orm";
import { db } from "../db";
import { ensurePhase6SportTables } from "../infrastructure/phase6Sport";
import { computeVerifiedStatus, distanceMetres } from "./sportChallengeRules";
import { awardCompetitivePoints } from "./competitiveEngine";

const CHECKIN_RADIUS_M = 500;

async function maybeAwardDiscovererPoints(
  table: "free_play_spots" | "community_routes",
  entityId: string,
  discovererId: string,
  newStatus: string,
  alreadyAwarded: boolean,
): Promise<void> {
  if (newStatus !== "surna_verified" || alreadyAwarded) return;
  await awardCompetitivePoints(discovererId, "verified_spot", {
    relatedEntityId: entityId,
    relatedEntityType: table,
    description: "Spot reached SURNA verified status",
  });
  if (table === "free_play_spots") {
    await db.execute(sql`
      UPDATE free_play_spots SET discoverer_points_awarded = true, updated_at = now() WHERE id = ${entityId}
    `);
  } else {
    await db.execute(sql`
      UPDATE community_routes SET discoverer_points_awarded = true, updated_at = now() WHERE id = ${entityId}
    `);
  }
  console.log("[Phase6-4] Discoverer awarded 500 points:", discovererId, entityId);
}

async function refreshSpotVerification(spotId: string) {
  const row = await db.execute(sql`
    SELECT id, discovered_by, like_count, save_count, checkin_count, verified_status, discoverer_points_awarded
    FROM free_play_spots WHERE id = ${spotId} LIMIT 1
  `);
  const spot = row.rows[0] as {
    id: string;
    discovered_by: string;
    like_count: number;
    save_count: number;
    checkin_count: number;
    verified_status: string;
    discoverer_points_awarded: boolean;
  } | undefined;
  if (!spot) return null;

  const next = computeVerifiedStatus(spot.like_count, spot.save_count, spot.checkin_count);
  if (next !== spot.verified_status) {
    await db.execute(sql`
      UPDATE free_play_spots SET verified_status = ${next}, updated_at = now() WHERE id = ${spotId}
    `);
    console.log("[Phase6-4] Spot verification upgraded:", spotId, next);
  }
  await maybeAwardDiscovererPoints(
    "free_play_spots",
    spotId,
    spot.discovered_by,
    next,
    spot.discoverer_points_awarded,
  );
  return { ...spot, verified_status: next };
}

async function refreshRouteVerification(routeId: string) {
  const row = await db.execute(sql`
    SELECT id, discovered_by, like_count, save_count, checkin_count, verified_status, discoverer_points_awarded
    FROM community_routes WHERE id = ${routeId} LIMIT 1
  `);
  const route = row.rows[0] as {
    id: string;
    discovered_by: string;
    like_count: number;
    save_count: number;
    checkin_count: number;
    verified_status: string;
    discoverer_points_awarded: boolean;
  } | undefined;
  if (!route) return null;

  const next = computeVerifiedStatus(route.like_count, route.save_count, route.checkin_count);
  if (next !== route.verified_status) {
    await db.execute(sql`
      UPDATE community_routes SET verified_status = ${next}, updated_at = now() WHERE id = ${routeId}
    `);
    console.log("[Phase6-5] Route verification upgraded:", routeId, next);
  }
  await maybeAwardDiscovererPoints(
    "community_routes",
    routeId,
    route.discovered_by,
    next,
    route.discoverer_points_awarded,
  );
  return { ...route, verified_status: next };
}

export async function createFreePlaySpot(params: {
  userId: string;
  name: string;
  sport: string;
  lat: number;
  lng: number;
}) {
  await ensurePhase6SportTables();
  const inserted = await db.execute(sql`
    INSERT INTO free_play_spots (name, sport, lat, lng, discovered_by)
    VALUES (${params.name}, ${params.sport}, ${params.lat}, ${params.lng}, ${params.userId})
    RETURNING *
  `);
  console.log("[Phase6-4] Free play spot created:", inserted.rows[0]?.id);
  return inserted.rows[0];
}

export async function likeFreePlaySpot(spotId: string, userId: string) {
  await ensurePhase6SportTables();
  const liked = await db.execute(sql`
    INSERT INTO free_play_spot_likes (spot_id, user_id)
    VALUES (${spotId}, ${userId})
    ON CONFLICT DO NOTHING
    RETURNING spot_id
  `);
  if (liked.rows.length > 0) {
    await db.execute(sql`
      UPDATE free_play_spots SET like_count = like_count + 1, updated_at = now() WHERE id = ${spotId}
    `);
  }
  const spot = await refreshSpotVerification(spotId);
  return spot;
}

export async function saveFreePlaySpot(spotId: string, userId: string) {
  await ensurePhase6SportTables();
  const saved = await db.execute(sql`
    INSERT INTO free_play_spot_saves (spot_id, user_id)
    VALUES (${spotId}, ${userId})
    ON CONFLICT DO NOTHING
    RETURNING spot_id
  `);
  if (saved.rows.length > 0) {
    await db.execute(sql`
      UPDATE free_play_spots SET save_count = save_count + 1, updated_at = now() WHERE id = ${spotId}
    `);
  }
  return refreshSpotVerification(spotId);
}

export async function checkinFreePlaySpot(spotId: string, userId: string, lat: number, lng: number) {
  await ensurePhase6SportTables();
  const spotRow = await db.execute(sql`
    SELECT lat, lng FROM free_play_spots WHERE id = ${spotId} LIMIT 1
  `);
  const spot = spotRow.rows[0] as { lat: number; lng: number } | undefined;
  if (!spot) throw new Error("Spot not found");

  const dist = distanceMetres(lat, lng, Number(spot.lat), Number(spot.lng));
  if (dist > CHECKIN_RADIUS_M) {
    throw new Error(`Must be within ${CHECKIN_RADIUS_M}m to check in (${Math.round(dist)}m away)`);
  }

  await db.execute(sql`
    INSERT INTO free_play_spot_checkins (spot_id, user_id, lat, lng)
    VALUES (${spotId}, ${userId}, ${lat}, ${lng})
  `);
  await db.execute(sql`
    UPDATE free_play_spots SET checkin_count = checkin_count + 1, updated_at = now() WHERE id = ${spotId}
  `);
  console.log("[Phase6-4] Spot check-in:", spotId, userId);
  return refreshSpotVerification(spotId);
}

export async function createCommunityRoute(params: {
  userId: string;
  name: string;
  sport: string;
  coordinates: Array<[number, number]>;
}) {
  await ensurePhase6SportTables();
  if (params.coordinates.length < 2) throw new Error("Route needs at least 2 coordinates");
  const lat = params.coordinates[0][0];
  const lng = params.coordinates[0][1];
  const coordsJson = JSON.stringify(params.coordinates);
  const inserted = await db.execute(sql`
    INSERT INTO community_routes (name, sport, coordinates, lat, lng, discovered_by)
    VALUES (${params.name}, ${params.sport}, ${coordsJson}::jsonb, ${lat}, ${lng}, ${params.userId})
    RETURNING *
  `);
  console.log("[Phase6-5] Community route created:", inserted.rows[0]?.id);
  return inserted.rows[0];
}

export async function likeCommunityRoute(routeId: string, userId: string) {
  await ensurePhase6SportTables();
  const liked = await db.execute(sql`
    INSERT INTO community_route_likes (route_id, user_id)
    VALUES (${routeId}, ${userId})
    ON CONFLICT DO NOTHING
    RETURNING route_id
  `);
  if (liked.rows.length > 0) {
    await db.execute(sql`
      UPDATE community_routes SET like_count = like_count + 1, updated_at = now() WHERE id = ${routeId}
    `);
  }
  return refreshRouteVerification(routeId);
}

export async function saveCommunityRoute(routeId: string, userId: string) {
  await ensurePhase6SportTables();
  const saved = await db.execute(sql`
    INSERT INTO community_route_saves (route_id, user_id)
    VALUES (${routeId}, ${userId})
    ON CONFLICT DO NOTHING
    RETURNING route_id
  `);
  if (saved.rows.length > 0) {
    await db.execute(sql`
      UPDATE community_routes SET save_count = save_count + 1, updated_at = now() WHERE id = ${routeId}
    `);
  }
  return refreshRouteVerification(routeId);
}

export async function checkinCommunityRoute(routeId: string, userId: string, lat: number, lng: number) {
  await ensurePhase6SportTables();
  const routeRow = await db.execute(sql`
    SELECT lat, lng FROM community_routes WHERE id = ${routeId} LIMIT 1
  `);
  const route = routeRow.rows[0] as { lat: number; lng: number } | undefined;
  if (!route) throw new Error("Route not found");

  const dist = distanceMetres(lat, lng, Number(route.lat), Number(route.lng));
  if (dist > CHECKIN_RADIUS_M) {
    throw new Error(`Must be within ${CHECKIN_RADIUS_M}m to check in (${Math.round(dist)}m away)`);
  }

  await db.execute(sql`
    INSERT INTO community_route_checkins (route_id, user_id, lat, lng)
    VALUES (${routeId}, ${userId}, ${lat}, ${lng})
  `);
  await db.execute(sql`
    UPDATE community_routes SET checkin_count = checkin_count + 1, updated_at = now() WHERE id = ${routeId}
  `);
  return refreshRouteVerification(routeId);
}

export async function listReferees(params: { sport?: string; lat?: number; lng?: number; limit?: number }) {
  await ensurePhase6SportTables();
  const limit = params.limit ?? 20;
  let q;
  if (params.sport) {
    const sport = params.sport.toLowerCase();
    q = await db.execute(sql`
      SELECT rp.*, u.display_name, u.profile_image_url
      FROM referee_profiles rp
      JOIN users u ON u.id = rp.user_id
      WHERE rp.is_active = true
        AND EXISTS (
          SELECT 1 FROM unnest(rp.sports) s WHERE lower(s) = ${sport} OR lower(s) LIKE ${"%" + sport + "%"}
        )
      ORDER BY rp.created_at DESC
      LIMIT ${limit}
    `);
  } else {
    q = await db.execute(sql`
      SELECT rp.*, u.display_name, u.profile_image_url
      FROM referee_profiles rp
      JOIN users u ON u.id = rp.user_id
      WHERE rp.is_active = true
      ORDER BY rp.created_at DESC
      LIMIT ${limit}
    `);
  }

  let rows = q.rows as Record<string, unknown>[];
  if (params.lat != null && params.lng != null) {
    rows = rows
      .map((r) => ({
        ...r,
        distanceKm:
          r.lat != null && r.lng != null
            ? distanceMetres(params.lat!, params.lng!, Number(r.lat), Number(r.lng)) / 1000
            : null,
      }))
      .sort((a, b) => (Number(a.distanceKm ?? 999) - Number(b.distanceKm ?? 999)));
  }
  console.log("[Phase6-3] Referees listed:", rows.length, params.sport ?? "all");
  return rows;
}

export async function suggestNearbyReferees(params: {
  sport?: string;
  lat?: number;
  lng?: number;
  limit?: number;
}) {
  const refs = await listReferees({ ...params, limit: params.limit ?? 3 });
  return refs.slice(0, params.limit ?? 3);
}

export async function getTeamCreationRecommendations(params: {
  sport: string;
  lat?: number;
  lng?: number;
  city?: string;
}) {
  await ensurePhase6SportTables();
  const { storage } = await import("../storage");

  const coaches = await storage.getCoaches(20, 0, params.sport);
  const coachRecs = coaches.slice(0, 3).map((c) => ({
    type: "coach" as const,
    id: c.id,
    name: c.user?.displayName ?? c.user?.firstName ?? "Coach",
    sport: params.sport,
    hourlyRate: c.hourlyRate,
  }));

  const kitSuppliers = await db.execute(sql`
    SELECT DISTINCT ps.id, ps.business_name, ps.city, ps.seller_id
    FROM product_sellers ps
    INNER JOIN products p ON p.seller_id = ps.seller_id
    WHERE p.is_active = true
      AND (
        lower(p.category) LIKE ${"%" + params.sport + "%"}
        OR lower(p.name) LIKE ${"%" + params.sport + "%"}
        OR lower(p.description) LIKE ${"%" + params.sport + "%"}
      )
    ORDER BY ps.business_name
    LIMIT 3
  `);
  const kitRecs = (kitSuppliers.rows as Record<string, unknown>[]).map((r) => ({
    type: "kit_supplier" as const,
    id: String(r.id),
    name: String(r.business_name ?? "Kit supplier"),
    city: r.city,
  }));

  const refereeRecs = (await suggestNearbyReferees({
    sport: params.sport,
    lat: params.lat,
    lng: params.lng,
    limit: 3,
  })).map((r) => ({
    type: "referee" as const,
    id: String(r.id),
    name: String(r.display_name ?? "Referee"),
    sports: r.sports,
    hourlyRate: r.hourly_rate,
  }));

  console.log("[Phase6-6] Team creation recommendations:", coachRecs.length, kitRecs.length, refereeRecs.length);
  return { coaches: coachRecs, kitSuppliers: kitRecs, referees: refereeRecs };
}

export async function getEventCreationRecommendations(params: {
  sport?: string;
  lat?: number;
  lng?: number;
}) {
  await ensurePhase6SportTables();
  const sport = params.sport ?? "";

  const venues = await db.execute(sql`
    SELECT id, name, city, latitude AS lat, longitude AS lng, sports
    FROM places
    WHERE is_active = true
      AND (
        ${sport} = '' OR ${sport} = ANY(sports) OR lower(name) LIKE ${"%" + sport + "%"}
      )
    ORDER BY is_verified DESC, created_at DESC
    LIMIT 3
  `);
  const venueRecs = (venues.rows as Record<string, unknown>[]).map((v) => ({
    type: "venue" as const,
    id: String(v.id),
    name: String(v.name),
    city: v.city,
    lat: v.lat,
    lng: v.lng,
  }));

  const refereeRecs = (await suggestNearbyReferees({
    sport: params.sport,
    lat: params.lat,
    lng: params.lng,
    limit: 3,
  })).map((r) => ({
    type: "referee" as const,
    id: String(r.id),
    name: String(r.display_name ?? "Referee"),
    hourlyRate: r.hourly_rate,
  }));

  const equipment = await db.execute(sql`
    SELECT id, name AS title, price, category
    FROM products
    WHERE is_active = true
      AND (
        ${sport} = '' OR lower(category) LIKE ${"%" + sport + "%"} OR lower(name) LIKE ${"%" + sport + "%"}
      )
    ORDER BY created_at DESC
    LIMIT 3
  `);
  const equipRecs = (equipment.rows as Record<string, unknown>[]).map((p) => ({
    type: "equipment" as const,
    id: String(p.id),
    title: String(p.title),
    price: p.price,
  }));

  console.log("[Phase6-6] Event creation recommendations:", venueRecs.length, refereeRecs.length, equipRecs.length);
  return { venues: venueRecs, referees: refereeRecs, equipment: equipRecs };
}

export async function setManagerConsent(matchId: string, userId: string): Promise<void> {
  await ensurePhase6SportTables();
  const updated = await db.execute(sql`
    UPDATE match_participants
    SET manager_consent = true
    WHERE match_id = ${matchId}
      AND participant_id = ${userId}
      AND participant_type = 'user'
    RETURNING id
  `);
  if (updated.rows.length === 0) {
    throw new Error("Participant not found on this match");
  }
  console.log("[Phase6-1] Manager consent recorded:", matchId, userId);
}

/** Test helper: simulate engagement to verify tier upgrades. */
export async function simulateSpotVerificationTiers() {
  return {
    community: computeVerifiedStatus(10, 0, 0),
    communityVerified: computeVerifiedStatus(25, 5, 0),
    surnaVerified: computeVerifiedStatus(50, 10, 3),
  };
}
