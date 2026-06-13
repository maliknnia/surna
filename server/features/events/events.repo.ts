import { db } from "../../db";
import { dbRead, readWithFallback } from "../../dbRead";
import { sql } from "drizzle-orm";
import { cacheAside, cacheInvalidatePattern, cacheKey, TTL } from "../../infrastructure/cache";

let eventsCompatEnsured: Promise<void> | null = null;
export function ensureEventsCompatTables(): Promise<void> {
  if (!eventsCompatEnsured) {
    eventsCompatEnsured = db.execute(sql`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_id text;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_media_id text;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at timestamptz;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS ends_at timestamptz;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
      ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity integer;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
      ALTER TABLE events ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS lat numeric(10, 7);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS lng numeric(10, 7);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS location_detail jsonb;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS route_coordinates jsonb;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS chat_group_id text;

      CREATE TABLE IF NOT EXISTS event_rsvps (
        event_id varchar NOT NULL,
        user_id varchar NOT NULL,
        status text NOT NULL DEFAULT 'going',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (event_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
        ON event_rsvps(event_id, status);
    `).then(() => undefined).catch((err) => {
      eventsCompatEnsured = null;
      throw err;
    });
  }
  return eventsCompatEnsured;
}

async function bustEventListCaches() {
  await cacheInvalidatePattern('events:public:*');
}

export async function insertEvent(creatorId: string, e: any) {
  const locationDetail = e.locationDetail ? JSON.stringify(e.locationDetail) : null;
  const routeCoordinates = e.routeCoordinates ? JSON.stringify(e.routeCoordinates) : null;
  const eventType = e.eventType ?? e.category ?? "training";
  const q = await db.execute(sql`
    INSERT INTO events (
      creator_id, organizer_id, title, description, event_type, sport,
      starts_at, ends_at, start_date, end_date,
      location, visibility, capacity, cover_media_id, lat, lng, location_detail, route_coordinates
    )
    VALUES (
      ${creatorId}, ${creatorId}, ${e.title}, ${e.description ?? ''}, ${eventType}, ${e.sport ?? null},
      ${e.startsAt}, ${e.endsAt}, ${e.startsAt}, ${e.endsAt},
      ${e.location ?? ''}, ${e.visibility ?? 'public'}, ${e.capacity ?? null}, ${e.coverMediaId ?? null},
      ${e.lat ?? null}, ${e.lng ?? null}, ${locationDetail}::jsonb, ${routeCoordinates}::jsonb
    )
    RETURNING *;
  `);
  await bustEventListCaches();
  return q.rows[0];
}

export async function setEventChatGroupId(eventId: string, chatGroupId: string) {
  const q = await db.execute(sql`
    UPDATE events SET chat_group_id = ${chatGroupId}
    WHERE id = ${eventId}
    RETURNING *;
  `);
  return q.rows[0] ?? null;
}

export async function updateEvent(creatorId: string, id: string, e: any) {
  const status = e.status ?? null;
  // When transitioning to cancelled, stamp cancelled_at; when reverting
  // to active, clear it. Otherwise leave it untouched.
  const cancelledAtClause =
    status === "cancelled"
      ? sql`COALESCE(cancelled_at, NOW())`
      : status === "active"
      ? sql`NULL`
      : sql`cancelled_at`;
  const q = await db.execute(sql`
    UPDATE events SET
      title = COALESCE(${e.title}, title),
      description = COALESCE(${e.description}, description),
      starts_at = COALESCE(${e.startsAt}, starts_at),
      ends_at = COALESCE(${e.endsAt}, ends_at),
      location = COALESCE(${e.location}, location),
      lat = COALESCE(${e.lat ?? null}, lat),
      lng = COALESCE(${e.lng ?? null}, lng),
      location_detail = COALESCE(${e.locationDetail ? JSON.stringify(e.locationDetail) : null}::jsonb, location_detail),
      route_coordinates = COALESCE(${e.routeCoordinates ? JSON.stringify(e.routeCoordinates) : null}::jsonb, route_coordinates),
      visibility = COALESCE(${e.visibility}, visibility),
      capacity = COALESCE(${e.capacity}, capacity),
      cover_media_id = COALESCE(${e.coverMediaId}, cover_media_id),
      status = COALESCE(${status}, status),
      cancelled_at = ${cancelledAtClause}
    WHERE id=${id} AND creator_id=${creatorId}
    RETURNING *;
  `);
  await bustEventListCaches();
  return q.rows[0] ?? null;
}

export async function getEvent(id: string) {
  const q = await dbRead.execute(sql`
    SELECT e.*,
      m.original_url AS cover_url,
      m.medium_url AS cover_medium_url,
      m.thumb_url AS cover_thumb_url,
      u.username AS creator_username,
      u.first_name AS creator_first_name,
      u.last_name AS creator_last_name,
      u.profile_image_url AS creator_avatar,
      COALESCE(going.cnt, 0)::int AS going_count,
      COALESCE(interested.cnt, 0)::int AS interested_count,
      COALESCE(total_rsvp.cnt, 0)::int AS total_rsvps
    FROM events e
    LEFT JOIN media m ON m.id::text = e.cover_media_id
    LEFT JOIN users u ON u.id = e.creator_id
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS cnt FROM event_rsvps WHERE event_id=e.id AND status='going') going ON true
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS cnt FROM event_rsvps WHERE event_id=e.id AND status='interested') interested ON true
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS cnt FROM event_rsvps WHERE event_id=e.id) total_rsvp ON true
    WHERE e.id=${id}
    LIMIT 1;
  `);
  return q.rows[0] ?? null;
}

export async function deleteEvent(creatorId: string, id: string) {
  const r = await db.execute(sql`DELETE FROM events WHERE id=${id} AND creator_id=${creatorId} RETURNING id;`);
  await bustEventListCaches();
  return r.rows[0]?.id ?? null;
}

export async function getEventRoute(eventId: string) {
  await ensureEventsCompatTables();
  const q = await dbRead.execute(sql`
    SELECT id, sport, visibility, route_coordinates
    FROM events
    WHERE id = ${eventId}
    LIMIT 1
  `);
  return q.rows[0] ?? null;
}

export async function saveEventRoute(
  creatorId: string,
  eventId: string,
  routeCoordinates: [number, number][],
) {
  await ensureEventsCompatTables();
  const json = JSON.stringify(routeCoordinates);
  const q = await db.execute(sql`
    UPDATE events
    SET route_coordinates = ${json}::jsonb, updated_at = NOW()
    WHERE id = ${eventId} AND creator_id = ${creatorId}
    RETURNING id, sport, route_coordinates
  `);
  await bustEventListCaches();
  return q.rows[0] ?? null;
}

export async function countGoing(eventId: string): Promise<number> {
  const q = await dbRead.execute(sql`SELECT COUNT(*)::int AS c FROM event_rsvps WHERE event_id=${eventId} AND status='going';`);
  return Number((q.rows[0] as { c?: number } | undefined)?.c ?? 0);
}

export async function listPublic(qs: {from?: string,to?: string,q?: string,category?: string,lat?: number,lng?: number,cursorStartsAt?:string,cursorId?:string,limit:number}) {
  // Anonymous list â€” safe to share across viewers, TTL 60s for freshness.
  const key = cacheKey('events:public', qs.from ?? '', qs.to ?? '', qs.q ?? '', qs.category ?? '', qs.cursorStartsAt ?? '', qs.cursorId ?? '', qs.limit);
  return cacheAside(key, TTL.SEARCH, () => listPublicUncached(qs));
}

async function listPublicUncached(qs: {from?: string,to?: string,q?: string,category?: string,lat?: number,lng?: number,cursorStartsAt?:string,cursorId?:string,limit:number}) {
  const now = qs.from ?? new Date().toISOString();
  const timeWhere = qs.to
    ? sql`AND e.starts_at BETWEEN ${now}::timestamptz AND ${qs.to}::timestamptz`
    : sql`AND e.starts_at >= ${now}::timestamptz`;
  const search = qs.q
    ? sql`AND (e.title ILIKE '%'||${qs.q}||'%' OR e.description ILIKE '%'||${qs.q}||'%')`
    : sql``;
  const categoryFilter = qs.category
    ? sql`AND e.title ILIKE '%'||${qs.category}||'%'`
    : sql``;
  const cursor = (qs.cursorStartsAt && qs.cursorId)
    ? sql`AND (e.starts_at, e.id) < (${qs.cursorStartsAt}::timestamptz, ${qs.cursorId}::uuid)`
    : sql``;

  // Public list â€” eligible for the read replica with automatic primary
  // failover if the replica is unhealthy. Cancelled and draft events are
  // excluded from public surfaces.
  const q = await readWithFallback((client) => client.execute(sql`
    SELECT e.*,
      m.original_url AS cover_url,
      m.medium_url AS cover_medium_url,
      m.thumb_url AS cover_thumb_url,
      u.username AS creator_username,
      u.first_name AS creator_first_name,
      u.profile_image_url AS creator_avatar,
      COALESCE(going.cnt, 0)::int AS going_count,
      COALESCE(interested.cnt, 0)::int AS interested_count
    FROM events e
    LEFT JOIN media m ON m.id::text = e.cover_media_id
    LEFT JOIN users u ON u.id = e.creator_id
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS cnt FROM event_rsvps WHERE event_id=e.id AND status='going') going ON true
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS cnt FROM event_rsvps WHERE event_id=e.id AND status='interested') interested ON true
    WHERE e.visibility='public'
      AND COALESCE(e.status,'active') = 'active'
    ${timeWhere} ${search} ${categoryFilter} ${cursor}
    ORDER BY e.starts_at DESC, e.id DESC
    LIMIT ${qs.limit};
  `));
  return q.rows;
}

/**
 * Lists events the given user organizes (creator). In this schema
 * `creator_id` is the canonical organizer/owner of an event â€” there is
 * no separate organizer-roles table â€” so the list is scoped strictly to
 * events the user can also edit/cancel via PATCH /api/events/:id. This
 * keeps every listed event truly manageable by the viewer.
 *
 * Returns events grouped by lifecycle: upcoming / past / drafts /
 * cancelled. Drafts/cancelled are derived from `events.status`.
 */
export async function listOrganizedByUser(userId: string) {
  const q = await dbRead.execute(sql`
    SELECT e.id, e.title, e.description, e.starts_at, e.ends_at,
           e.location, e.visibility, e.capacity, e.creator_id,
           COALESCE(e.status, 'active') AS status,
           e.cancelled_at,
           m.original_url AS cover_url,
           m.medium_url AS cover_medium_url,
           m.thumb_url AS cover_thumb_url,
           COALESCE(going.cnt, 0)::int AS going_count,
           COALESCE(interested.cnt, 0)::int AS interested_count
      FROM events e
      LEFT JOIN media m ON m.id::text = e.cover_media_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM event_rsvps
         WHERE event_id = e.id AND status='going'
      ) going ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM event_rsvps
         WHERE event_id = e.id AND status='interested'
      ) interested ON true
     WHERE e.creator_id = ${userId}
     ORDER BY e.starts_at DESC
     LIMIT 200;
  `);
  const upcoming: any[] = [];
  const past: any[] = [];
  const drafts: any[] = [];
  const cancelled: any[] = [];
  const now = Date.now();
  for (const row of q.rows ?? []) {
    const status = String((row as any).status ?? "active");
    if (status === "cancelled") cancelled.push(row);
    else if (status === "draft") drafts.push(row);
    else {
      const starts = new Date((row as any).starts_at).getTime();
      if (starts >= now) upcoming.push(row);
      else past.push(row);
    }
  }
  upcoming.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  return { upcoming, past, drafts, cancelled };
}

export async function upsertRSVP(eventId: string, userId: string, status: string) {
  const q = await db.execute(sql`
    INSERT INTO event_rsvps (event_id, user_id, status)
    VALUES (${eventId}, ${userId}, ${status})
    ON CONFLICT (event_id, user_id) DO UPDATE SET status=EXCLUDED.status, updated_at=now()
    RETURNING *;
  `);
  return q.rows[0];
}

export async function getUserRSVP(eventId: string, userId: string) {
  const q = await db.execute(sql`
    SELECT * FROM event_rsvps WHERE event_id = ${eventId} AND user_id = ${userId} LIMIT 1
  `);
  return (q.rows[0] as { status?: string } | undefined) ?? null;
}

export async function assignWaitlistPosition(eventId: string, userId: string) {
  const q = await db.execute(sql`
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next_pos
    FROM event_rsvps WHERE event_id = ${eventId} AND status = 'waitlist'
  `);
  const pos = (q.rows[0] as { next_pos: number })?.next_pos ?? 1;
  await db.execute(sql`
    UPDATE event_rsvps SET waitlist_position = ${pos}
    WHERE event_id = ${eventId} AND user_id = ${userId}
  `);
  return pos;
}

export async function promoteNextWaitlisted(eventId: string): Promise<string | null> {
  const q = await db.execute(sql`
    SELECT user_id FROM event_rsvps
    WHERE event_id = ${eventId} AND status = 'waitlist'
    ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
    LIMIT 1
  `);
  const nextUserId = (q.rows[0] as { user_id?: string } | undefined)?.user_id;
  if (!nextUserId) return null;
  await db.execute(sql`
    UPDATE event_rsvps
    SET status = 'going', waitlist_position = NULL, updated_at = now()
    WHERE event_id = ${eventId} AND user_id = ${nextUserId}
  `);
  const { insertNotification } = await import("../notifications/notifications.repo");
  await insertNotification({
    userId: nextUserId,
    type: "event_rsvp",
    message: "A spot opened up — you're now going to the event!",
    metadata: { eventId, promotedFromWaitlist: true },
  });
  return nextUserId;
}

export async function issueTicket(eventId: string, userId: string) {
  const code = `TKT-${Math.random().toString(36).slice(2,10).toUpperCase()}`;
  const q = await db.execute(sql`
    INSERT INTO event_tickets (event_id, user_id, code)
    VALUES (${eventId}, ${userId}, ${code})
    RETURNING *;
  `);
  return q.rows[0];
}

export async function listMyRSVPs(userId: string) {
  const q = await dbRead.execute(sql`
    SELECT r.*, e.title, e.starts_at, e.location
    FROM event_rsvps r JOIN events e ON e.id=r.event_id
    WHERE r.user_id=${userId}
    ORDER BY e.starts_at DESC;
  `);
  return q.rows;
}

export async function getEventRSVPs(eventId: string) {
  const q = await dbRead.execute(sql`
    SELECT r.*, u.username, u.first_name, u.last_name, u.profile_image_url
    FROM event_rsvps r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.event_id=${eventId}
    ORDER BY r.created_at DESC;
  `);
  return q.rows;
}

export async function listUserUpcoming(userId: string, limit = 50) {
  const q = await dbRead.execute(sql`
    SELECT e.id, e.title, e.starts_at, e.ends_at, e.location, r.status
    FROM event_rsvps r JOIN events e ON e.id=r.event_id
    WHERE r.user_id=${userId} AND r.status IN ('going','interested')
      AND e.starts_at >= NOW()
    ORDER BY e.starts_at ASC
    LIMIT ${limit};
  `);
  return q.rows;
}

export async function listUserPast(userId: string, limit = 50) {
  const q = await dbRead.execute(sql`
    SELECT e.id, e.title, e.starts_at, e.ends_at, e.location, r.status
    FROM event_rsvps r JOIN events e ON e.id=r.event_id
    WHERE r.user_id=${userId} AND r.status='going'
      AND e.starts_at < NOW()
    ORDER BY e.starts_at DESC
    LIMIT ${limit};
  `);
  return q.rows;
}

export async function getEventTicket(eventId: string, userId: string) {
  const q = await dbRead.execute(sql`
    SELECT * FROM event_tickets WHERE event_id=${eventId} AND user_id=${userId} LIMIT 1;
  `);
  return q.rows[0] ?? null;
}
