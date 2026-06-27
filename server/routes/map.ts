// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { dbRead } from "../dbRead";
import { stories, storyViewers, personPresence, users, events, teams } from "@shared/schema";
import { LocationSharingService } from "../services/locationSharingService";
import { MapPreferencesService } from "../services/mapPreferencesService";
import {
  mergeMapSettings,
  mapAudienceToPresenceVisibility,
  type MapSettings,
  type MapLayerKey,
} from "@shared/mapSettings";
import { eq, and, gt, gte, lte, sql, desc, isNotNull } from "drizzle-orm";
import { cacheAside, cacheKey, TTL } from "../infrastructure/cache";

export const mapRouter = Router();

async function internalAPI(path: string, req: any, method: string = 'GET', body?: any) {
  try {
    const port = process.env.PORT || 5000;
    const url = `http://localhost:${port}${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.cookie) headers.Cookie = req.headers.cookie;
    if (req.headers.authorization) headers.Authorization = req.headers.authorization;
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
    if (!response.ok) return { items: [] };
    return await response.json();
  } catch { return { items: [] }; }
}

const normalizeCoords = (entity: any) => {
  return entity.coords ||
    (entity.latitude !== undefined && entity.longitude !== undefined ? { lat: entity.latitude, lng: entity.longitude } : null) ||
    (entity.location?.lat !== undefined && entity.location?.lng !== undefined ? { lat: entity.location.lat, lng: entity.location.lng } : null) ||
    (entity.geometry?.coordinates ? { lat: entity.geometry.coordinates[1], lng: entity.geometry.coordinates[0] } : null) ||
    entity.currentCoords || null;
};

async function getStoryStateForEntities(entityPairs: { ownerType: string; ownerId: string }[], viewerId: string) {
  if (entityPairs.length === 0) return new Map<string, { hasStory: boolean; storyState: 'new' | 'seen' | 'live' | 'none' }>();
  const now = new Date();
  try {
    const activeStories = await dbRead.select({
      ownerType: stories.ownerType,
      ownerId: stories.ownerId,
      storyId: stories.id,
    }).from(stories).where(gt(stories.expiresAt, now));

    const storyIds = activeStories.map(s => s.storyId);
    let viewedStoryIds = new Set<string>();
    if (storyIds.length > 0) {
      const views = await dbRead.select({ storyId: storyViewers.storyId })
        .from(storyViewers)
        .where(and(eq(storyViewers.viewerId, viewerId)));
      viewedStoryIds = new Set(views.map(v => v.storyId));
    }

    const result = new Map<string, { hasStory: boolean; storyState: 'new' | 'seen' | 'live' | 'none' }>();
    const entityStories = new Map<string, { total: number; viewed: number }>();

    for (const s of activeStories) {
      const key = `${s.ownerType}:${s.ownerId}`;
      const existing = entityStories.get(key) || { total: 0, viewed: 0 };
      existing.total++;
      if (viewedStoryIds.has(s.storyId)) existing.viewed++;
      entityStories.set(key, existing);
    }

    for (const pair of entityPairs) {
      const key = `${pair.ownerType}:${pair.ownerId}`;
      const stats = entityStories.get(key);
      if (!stats || stats.total === 0) {
        result.set(key, { hasStory: false, storyState: 'none' });
      } else if (stats.viewed < stats.total) {
        result.set(key, { hasStory: true, storyState: 'new' });
      } else {
        result.set(key, { hasStory: true, storyState: 'seen' });
      }
    }
    return result;
  } catch {
    return new Map();
  }
}

function applyBlur(lat: number, lng: number, blurM: number): { lat: number; lng: number } {
  if (blurM <= 0) return { lat, lng };
  const latOffset = (Math.random() - 0.5) * (blurM / 111320) * 2;
  const lngOffset = (Math.random() - 0.5) * (blurM / (111320 * Math.cos(lat * Math.PI / 180))) * 2;
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

function parseRouteCoordinates(raw: unknown): { lat: number; lng: number }[] {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const coords: { lat: number; lng: number }[] = [];
  for (const point of raw) {
    if (Array.isArray(point) && point.length >= 2) {
      const lat = Number(point[0]);
      const lng = Number(point[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push({ lat, lng });
      continue;
    }
    if (point && typeof point === "object") {
      const p = point as { lat?: unknown; lng?: unknown };
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push({ lat, lng });
    }
  }
  return coords;
}

function routeInBbox(
  coords: { lat: number; lng: number }[],
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number,
): boolean {
  return coords.some(
    (c) => c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng,
  );
}

mapRouter.get("/viewport", isAuthenticated, async (req: any, res) => {
  try {
    const { bbox, zoom = "13", layers = "people,teams,places,events", mode = "mixed" } = req.query;
    const viewerId = req.user?.claims?.sub || req.user?.id;
    const zoomLevel = parseInt(zoom as string) || 13;

    let minLng = -180, minLat = -90, maxLng = 180, maxLat = 90;
    if (bbox) {
      const parts = (bbox as string).split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        [minLng, minLat, maxLng, maxLat] = parts;
      }
    }

    const enabledLayers = (layers as string).split(',').map(l => l.trim());

    // Cache the viewport's static items (events/teams/places/people) by
    // bbox+zoom+layers. Per-viewer story state is layered on top below so this
    // cache is shareable across all viewers. TTL=60s matches MAP_MARKERS.
    const viewportKey = cacheKey(
      'map:viewport',
      `${minLat.toFixed(2)},${minLng.toFixed(2)},${maxLat.toFixed(2)},${maxLng.toFixed(2)}`,
      zoomLevel,
      enabledLayers.sort().join(','),
      mode as string
    );

    const { items, entityPairs, routes } = await cacheAside(viewportKey, TTL.MAP_MARKERS, async () => {
      const items: any[] = [];
      const routes: any[] = [];
      const entityPairs: { ownerType: string; ownerId: string }[] = [];

      if (enabledLayers.includes('people')) {
      try {
        const presenceRows = await dbRead.select({
          p: personPresence,
          u: { id: users.id, username: users.username, displayName: users.displayName, profileImageUrl: users.profileImageUrl, sport: users.sport }
        }).from(personPresence)
          .innerJoin(users, eq(personPresence.userId, users.id))
          .where(and(
            isNotNull(personPresence.lat),
            isNotNull(personPresence.lng),
            gt(personPresence.lastSeenAt, new Date(Date.now() - 10 * 60 * 1000))
          ));

        for (const row of presenceRows) {
          if (row.p.visibility === 'ghost') continue;
          // NOTE: viewer self-filter is intentionally NOT done here — the
          // payload returned by this lambda is cached and SHARED across
          // all viewers, so it must not depend on `viewerId`. The caller
          // strips the viewer's own person marker post-cache below.
          const lat = parseFloat(row.p.lat as string);
          const lng = parseFloat(row.p.lng as string);
          if (isNaN(lat) || isNaN(lng)) continue;
          const pos = row.p.blurRadiusM && row.p.blurRadiusM > 0 ? applyBlur(lat, lng, row.p.blurRadiusM) : { lat, lng };
          if (pos.lat < minLat || pos.lat > maxLat || pos.lng < minLng || pos.lng > maxLng) continue;

          entityPairs.push({ ownerType: 'person', ownerId: row.p.userId });
          items.push({
            type: 'person',
            id: row.p.userId,
            lat: pos.lat,
            lng: pos.lng,
            label: row.u.displayName || row.u.username || 'Player',
            iconUrl: row.u.profileImageUrl || '',
            hasStory: false,
            storyState: 'none',
            presence: row.p.status || 'active',
            priority: row.p.status === 'active' ? 3 : 1,
            meta: {
              sport: row.u.sport,
              username: row.u.username,
              presenceVisibility: row.p.visibility || "ghost",
            },
          });
        }
      } catch (e) { console.error('Presence query error:', e); }
    }

    if (enabledLayers.includes('events')) {
      try {
        const eventRows = await dbRead.execute(sql`
          SELECT * FROM events
          WHERE COALESCE(starts_at, start_date) > NOW() - INTERVAL '2 hours'
          LIMIT 100
        `);
        const eventList = (eventRows.rows ?? eventRows) as any[];
        for (const e of eventList) {
          const coords = normalizeCoords({
            ...e,
            latitude: e.lat,
            longitude: e.lng,
          });
          if (!coords) continue;
          if (coords.lat < minLat || coords.lat > maxLat || coords.lng < minLng || coords.lng > maxLng) continue;
          const isLive = e.startDate && new Date(e.startDate).getTime() <= Date.now() && new Date(e.startDate).getTime() > Date.now() - 3 * 3600 * 1000;
          const routeCoords = parseRouteCoordinates(e.route_coordinates ?? e.routeCoordinates);
          if (routeCoords.length >= 2 && routeInBbox(routeCoords, minLat, minLng, maxLat, maxLng)) {
            routes.push({
              id: e.id,
              title: e.title || "Event",
              sportType: e.sport || "cycling",
              coordinates: routeCoords,
            });
          }
          entityPairs.push({ ownerType: 'event', ownerId: e.id });
          items.push({
            type: 'event',
            id: e.id,
            lat: coords.lat,
            lng: coords.lng,
            label: e.title || 'Event',
            iconUrl: '',
            hasStory: false,
            storyState: 'none',
            presence: isLive ? 'active' : 'offline',
            priority: isLive ? 5 : 2,
            meta: {
              sport: e.sport,
              startAt: e.startDate,
              endDate: e.endDate,
              location: e.location,
              goingCount: e.maxParticipants,
              maxParticipants: e.maxParticipants,
              liveNow: isLive,
              description: e.description,
              eventType: e.eventType,
            },
          });
        }
      } catch (e) { console.error('Events query error:', e); }
    }

    if (enabledLayers.includes('teams')) {
      try {
        const teamRows = await dbRead.select().from(teams).limit(50);
        for (const t of teamRows) {
          const coords = normalizeCoords(t);
          if (!coords) continue;
          if (coords.lat < minLat || coords.lat > maxLat || coords.lng < minLng || coords.lng > maxLng) continue;
          entityPairs.push({ ownerType: 'team', ownerId: t.id });
          items.push({
            type: 'team',
            id: t.id,
            lat: coords.lat,
            lng: coords.lng,
            label: t.name || 'Team',
            iconUrl: t.logo || '',
            hasStory: false,
            storyState: 'none',
            presence: 'offline',
            priority: 2,
            meta: { sport: t.sport, memberCount: t.currentMembers, description: t.description, verified: t.verified }
          });
        }
      } catch (e) { console.error('Teams query error:', e); }
    }

    if (enabledLayers.includes('places')) {
      try {
        const data = await internalAPI(`/api/location/nearby`, req, 'POST', {
          lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2, radius: 5000, type: 'gym,field,court,stadium'
        });
        const placeItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        for (const p of placeItems) {
          const coords = normalizeCoords(p);
          if (!coords) continue;
          entityPairs.push({ ownerType: 'place', ownerId: p.id });
          items.push({
            type: 'place',
            id: p.id,
            lat: coords.lat,
            lng: coords.lng,
            label: p.name || 'Place',
            iconUrl: p.profileImageUrl || p.photoUrl || p.imageUrl || '',
            hasStory: false,
            storyState: 'none',
            presence: 'offline',
            priority: 1,
            meta: {
              category: p.kind || p.category,
              sports: p.sports,
              rating: p.rating,
              address: p.address,
              city: p.city,
              description: p.description || p.bio,
              coverImageUrl: p.coverImageUrl || p.photoUrl || p.imageUrl,
              hourlyRate: p.pricing?.hourly,
            },
          });
        }
      } catch (e) { console.error('Places query error:', e); }
    }

    if (enabledLayers.includes('challenges')) {
      try {
        const { challengesRepo } = await import("../features/challenges/challenges.repo");
        const matches = await challengesRepo.getMatches({
          status: "pending,live",
          visibility: "public",
          limit: 100,
        });
        for (const m of matches) {
          const coords = normalizeCoords({ location: m.location });
          if (!coords) continue;
          if (coords.lat < minLat || coords.lat > maxLat || coords.lng < minLng || coords.lng > maxLng) continue;
          entityPairs.push({ ownerType: 'challenge', ownerId: m.id });
          items.push({
            type: 'challenge',
            id: m.id,
            lat: coords.lat,
            lng: coords.lng,
            label: m.title || 'Challenge',
            iconUrl: '',
            hasStory: false,
            storyState: 'none',
            presence: m.status === 'live' ? 'active' : 'offline',
            priority: m.status === 'live' ? 4 : 2,
            meta: {
              sport: m.sport,
              status: m.status,
              type: m.type,
              location: m.location,
            },
          });
        }
      } catch (e) { console.error('Challenges query error:', e); }
    }

      return { items, entityPairs, routes };
    });

    // Strip the viewer's own person marker AND shallow-clone every item so
    // viewer-specific enrichment below cannot mutate cached objects. With the
    // in-memory cache fallback the cached array is returned by reference, so
    // mutating items would leak one viewer's story state into the next
    // viewer's response. Cloning here keeps the cache strictly viewer-agnostic.
    let viewerFilteredItems: any[] = [];
    for (const it of items) {
      if (viewerId && it.type === 'person' && it.id === viewerId) continue;
      viewerFilteredItems.push({ ...it });
    }

    viewerFilteredItems = await LocationSharingService.filterMapItemsForViewer(
      viewerId ?? null,
      viewerFilteredItems,
    );

    if (viewerId) {
      const { getBlockedUserIds } = await import("../infrastructure/phase3Social");
      const blockedIds = await getBlockedUserIds(viewerId);
      if (blockedIds.size > 0) {
        viewerFilteredItems = viewerFilteredItems.filter(
          (it) => !(it.type === "person" && blockedIds.has(it.id)),
        );
      }
    }

    if (viewerId) {
      const storyStates = await getStoryStateForEntities(entityPairs, viewerId);
      for (const item of viewerFilteredItems) {
        const key = `${item.type === 'person' ? 'person' : item.type}:${item.id}`;
        const state = storyStates.get(key);
        if (state) {
          item.hasStory = state.hasStory;
          item.storyState = state.storyState;
          if (state.storyState === 'new') item.priority += 2;
        }
      }
    }

    viewerFilteredItems.sort((a: any, b: any) => b.priority - a.priority);

    const stats: Record<string, number> = {};
    for (const item of viewerFilteredItems) {
      stats[item.type] = (stats[item.type] || 0) + 1;
    }

    // Per-viewer (story state, self-filter) so mark `private`; still allow
    // browsers to reuse the response for ~30s while panning the map.
    res.set('Cache-Control', 'private, max-age=30');
    res.json({
      serverTime: new Date().toISOString(),
      items: viewerFilteredItems,
      routes,
      stats,
      clusters: []
    });
  } catch (error) {
    console.error("Error in map viewport:", error);
    res.json({ serverTime: new Date().toISOString(), items: [], routes: [], stats: {}, clusters: [] });
  }
});

mapRouter.get("/preview/:type/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { type, id } = req.params;
    const viewerId = req.user?.claims?.sub || req.user?.id;

    let preview: any = null;

    if (type === 'person') {
      const [user] = await dbRead.select().from(users).where(eq(users.id, id)).limit(1);
      if (user) {
        const [presence] = await dbRead.select().from(personPresence).where(eq(personPresence.userId, id)).limit(1);
        const storyStates = await getStoryStateForEntities([{ ownerType: 'person', ownerId: id }], viewerId);
        const storyInfo = storyStates.get(`person:${id}`) || { hasStory: false, storyState: 'none' };
        preview = {
          type: 'person', id,
          title: user.displayName || user.username || 'Player',
          subtitle: `${user.sport || 'Athlete'} • ${presence?.status === 'active' ? 'Online now' : 'Recently active'}`,
          avatarUrl: user.profileImageUrl || '',
          hasStory: storyInfo.hasStory,
          storyState: storyInfo.storyState,
          quickActions: ['story', 'profile', 'message', 'challenge'],
          chips: [user.sport, presence?.city].filter(Boolean),
          stats: { sport: user.sport }
        };
      }
    } else if (type === 'event') {
      const [event] = await dbRead.select().from(events).where(eq(events.id, id)).limit(1);
      if (event) {
        const isLive = event.startDate && new Date(event.startDate).getTime() <= Date.now() && new Date(event.startDate).getTime() > Date.now() - 3 * 3600 * 1000;
        const storyStates = await getStoryStateForEntities([{ ownerType: 'event', ownerId: id }], viewerId);
        const storyInfo = storyStates.get(`event:${id}`) || { hasStory: false, storyState: 'none' };
        preview = {
          type: 'event', id,
          title: event.title || 'Event',
          subtitle: `${event.sport || 'Sports'} Event${isLive ? ' • LIVE' : ''}`,
          avatarUrl: '',
          hasStory: storyInfo.hasStory,
          storyState: storyInfo.storyState,
          quickActions: ['story', 'rsvp', 'directions', 'share'],
          chips: [event.sport, isLive ? 'LIVE' : event.startDate ? new Date(event.startDate).toLocaleDateString() : null, event.location].filter(Boolean),
          stats: { going: event.maxParticipants, location: event.location },
          meta: { description: event.description, startAt: event.startDate, eventType: event.eventType }
        };
      }
    } else if (type === 'team') {
      const [team] = await dbRead.select().from(teams).where(eq(teams.id, id)).limit(1);
      if (team) {
        const storyStates = await getStoryStateForEntities([{ ownerType: 'team', ownerId: id }], viewerId);
        const storyInfo = storyStates.get(`team:${id}`) || { hasStory: false, storyState: 'none' };
        preview = {
          type: 'team', id,
          title: team.name || 'Team',
          subtitle: `${team.sport || 'Sports'} Team • ${team.currentMembers || 0} members`,
          avatarUrl: team.logo || '',
          hasStory: storyInfo.hasStory,
          storyState: storyInfo.storyState,
          quickActions: ['story', 'profile', 'join', 'challenge'],
          chips: [team.sport, team.verified ? 'Verified' : null, `${team.currentMembers || 0} members`].filter(Boolean),
          stats: { members: team.currentMembers, rating: team.rating },
          meta: { description: team.description }
        };
      }
    }

    if (!preview) return res.status(404).json({ error: 'Not found' });
    res.json(preview);
  } catch (error) {
    console.error("Error in map preview:", error);
    res.status(500).json({ error: "Failed to load preview" });
  }
});

mapRouter.get("/summary", isAuthenticated, async (req: any, res) => {
  try {
    const { lat, lng, from, to, limit = "100", layers = "all" } = req.query;
    const fromDate = from || new Date().toISOString();
    const toDate = to || "";
    const maxLimit = Math.min(parseInt(limit as string) || 100, 200);
    const enabledLayers = layers === 'all'
      ? ['events', 'places', 'teams', 'coaches', 'players', 'challenges']
      : (layers as string).split(',').map(l => l.trim());

    const fetchPromises: Promise<any>[] = [];
    if (enabledLayers.includes('events')) fetchPromises.push(internalAPI(`/api/events?from=${fromDate}&to=${toDate}&limit=${maxLimit}`, req).then(data => ({ type: 'events', data })));
    if (enabledLayers.includes('places') && lat && lng) fetchPromises.push(internalAPI(`/api/location/nearby`, req, 'POST', { lat: parseFloat(lat as string), lng: parseFloat(lng as string), radius: 1000, type: 'gym,field,court,stadium' }).then(data => ({ type: 'places', data })));
    if (enabledLayers.includes('teams')) fetchPromises.push(internalAPI(`/api/teams?limit=${maxLimit}`, req).then(data => ({ type: 'teams', data })));
    if (enabledLayers.includes('coaches')) fetchPromises.push(internalAPI(`/api/coaches?limit=${maxLimit}`, req).then(data => ({ type: 'coaches', data })));
    if (enabledLayers.includes('players')) fetchPromises.push(internalAPI(`/api/map/players`, req).then(data => ({ type: 'players', data })));
    if (enabledLayers.includes('challenges')) fetchPromises.push(internalAPI(`/api/competitive-challenges?status=pending,live&visibility=public&limit=${maxLimit}`, req).then(data => ({ type: 'challenges', data })));

    const results = await Promise.allSettled(fetchPromises);
    const processedData: Record<string, any[]> = { events: [], places: [], teams: [], coaches: [], players: [], challenges: [] };
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { type, data } = result.value;
        const items = Array.isArray(data?.matches)
          ? data.matches
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];
        processedData[type] = items.map((item: any) => ({ ...item, coords: normalizeCoords(item) })).filter((item: any) => item.coords);
      }
    });
    res.json({ ...processedData, center: lat && lng ? { lat: parseFloat(lat as string), lng: parseFloat(lng as string) } : null, meta: { eventsCount: processedData.events.length, placesCount: processedData.places.length, generatedAt: new Date().toISOString() } });
  } catch (error) {
    console.error("Error generating map summary:", error);
    res.status(500).json({ error: "Failed to generate map summary", events: [], places: [], teams: [], coaches: [], players: [], challenges: [], center: null });
  }
});

mapRouter.get("/players", isAuthenticated, async (_req: any, res) => {
  res.json({ items: [] });
});

mapRouter.get("/teammate-ids", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { teamMembers } = await import("@shared/schema");
    const { dbRead } = await import("../dbRead");
    const { eq, and, inArray } = await import("drizzle-orm");
    const myTeams = await dbRead
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "active")));
    const teamIds = myTeams.map((r) => r.teamId);
    if (!teamIds.length) return res.json({ ids: [] });
    const mates = await dbRead
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(and(eq(teamMembers.status, "active"), inArray(teamMembers.teamId, teamIds)));
    const ids = [...new Set(mates.map((m) => m.userId).filter((id) => id !== userId))];
    res.json({ ids });
  } catch (error) {
    console.error("Error fetching teammate ids:", error);
    res.json({ ids: [] });
  }
});

mapRouter.get("/preferences", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const settings = await MapPreferencesService.getMapSettings(userId);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching map preferences:", error);
    res.status(500).json({ message: "Failed to fetch map preferences" });
  }
});

mapRouter.patch("/preferences", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const patch = req.body ?? {};
    const allowedLayers: Partial<Record<MapLayerKey, boolean>> = {};
    if (patch.layers && typeof patch.layers === "object") {
      for (const key of Object.keys(patch.layers)) {
        if (typeof patch.layers[key] === "boolean") {
          allowedLayers[key as MapLayerKey] = patch.layers[key];
        }
      }
    }
    const settings = await MapPreferencesService.patchMapSettings(userId, {
      layers: allowedLayers as MapSettings["layers"],
    });
    res.json(settings);
  } catch (error) {
    console.error("Error updating map layer preferences:", error);
    res.status(500).json({ message: "Failed to update map preferences" });
  }
});

