import { db } from "../db";
import { sql } from "drizzle-orm";
import { cacheAside, cacheKey, TTL } from "./cache";

export interface SearchHit {
  id: string;
  type: "user" | "team" | "event" | "place" | "product" | "post";
  title: string;
  subtitle: string;
  imageUrl: string | null;
  score: number;
  data: Record<string, any>;
}

export interface UniversalSearchResult {
  hits: SearchHit[];
  total: number;
  took: number;
  facets: Record<string, number>;
}

export async function ensureSearchTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS search_index (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id VARCHAR NOT NULL,
      entity_type VARCHAR NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      body TEXT DEFAULT '',
      image_url TEXT,
      sport VARCHAR,
      location VARCHAR,
      tags TEXT[] DEFAULT '{}',
      tsv TSVECTOR,
      updated_at TIMESTAMP DEFAULT now(),
      UNIQUE(entity_id, entity_type)
    );
    CREATE INDEX IF NOT EXISTS idx_search_tsv ON search_index USING GIN(tsv);
    CREATE INDEX IF NOT EXISTS idx_search_type ON search_index(entity_type);
    CREATE INDEX IF NOT EXISTS idx_search_sport ON search_index(sport);
  `);
}

export async function indexEntity(data: {
  entityId: string;
  entityType: string;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  sport?: string;
  location?: string;
  tags?: string[];
}) {
  const fullText = [data.title, data.subtitle, data.body, ...(data.tags || [])].filter(Boolean).join(" ");
  const tagsArray = data.tags || [];
  await db.execute(sql`
    INSERT INTO search_index (entity_id, entity_type, title, subtitle, body, image_url, sport, location, tags, tsv, updated_at)
    VALUES (${data.entityId}, ${data.entityType}, ${data.title}, ${data.subtitle || ""},
      ${data.body || ""}, ${data.imageUrl || null}, ${data.sport || null},
      ${data.location || null}, ${tagsArray},
      to_tsvector('english', ${fullText}), now())
    ON CONFLICT (entity_id, entity_type) DO UPDATE SET
      title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, body = EXCLUDED.body,
      image_url = EXCLUDED.image_url, sport = EXCLUDED.sport, location = EXCLUDED.location,
      tags = EXCLUDED.tags, tsv = EXCLUDED.tsv, updated_at = now()
  `);
}

export async function removeFromIndex(entityId: string, entityType: string) {
  await db.execute(sql`DELETE FROM search_index WHERE entity_id = ${entityId} AND entity_type = ${entityType}`);
}

export async function universalSearch(query: string, opts?: {
  types?: string[];
  sport?: string;
  limit?: number;
  offset?: number;
}): Promise<UniversalSearchResult> {
  const start = Date.now();
  const limit = opts?.limit || 20;
  const offset = opts?.offset || 0;
  const cleanQuery = query.replace(/[^\w\s]/g, "").trim();

  if (!cleanQuery) return { hits: [], total: 0, took: 0, facets: {} };

  const tsQuery = cleanQuery.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(" & ");

  let typeFilter = sql`1=1`;
  if (opts?.types?.length) {
    typeFilter = sql`entity_type = ANY(${opts.types})`;
  }

  let sportFilter = sql`1=1`;
  if (opts?.sport) {
    sportFilter = sql`sport = ${opts.sport}`;
  }

  const result = await db.execute(sql`
    SELECT entity_id AS "id", entity_type AS "type", title, subtitle, image_url AS "imageUrl",
      ts_rank(tsv, to_tsquery('english', ${tsQuery})) AS score
    FROM search_index
    WHERE tsv @@ to_tsquery('english', ${tsQuery})
      AND ${typeFilter} AND ${sportFilter}
    ORDER BY score DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT entity_type AS "type", COUNT(*)::int AS count
    FROM search_index
    WHERE tsv @@ to_tsquery('english', ${tsQuery})
      AND ${typeFilter} AND ${sportFilter}
    GROUP BY entity_type
  `);

  const facets: Record<string, number> = {};
  let total = 0;
  for (const row of countResult.rows as any[]) {
    facets[row.type] = row.count;
    total += row.count;
  }

  return {
    hits: result.rows.map((r: any) => ({ ...r, data: {} })),
    total,
    took: Date.now() - start,
    facets,
  };
}

export async function reindexAll() {
  await db.execute(sql`
    INSERT INTO search_index (entity_id, entity_type, title, subtitle, image_url, tsv, updated_at)
    SELECT id::text, 'user', COALESCE(username, ''), COALESCE(bio, ''), profile_image_url,
      to_tsvector('english', COALESCE(username, '') || ' ' || COALESCE(bio, '')), now()
    FROM users WHERE username IS NOT NULL
    ON CONFLICT (entity_id, entity_type) DO UPDATE SET
      title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url,
      tsv = EXCLUDED.tsv, updated_at = now()
  `);

  await db.execute(sql`
    INSERT INTO search_index (entity_id, entity_type, title, subtitle, image_url, sport, tsv, updated_at)
    SELECT id::text, 'team', COALESCE(name, ''), COALESCE(description, ''), logo,
      COALESCE(sport, ''),
      to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sport, '')), now()
    FROM teams WHERE name IS NOT NULL
    ON CONFLICT (entity_id, entity_type) DO UPDATE SET
      title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url,
      sport = EXCLUDED.sport, tsv = EXCLUDED.tsv, updated_at = now()
  `);
}

export async function autocomplete(query: string, limit: number = 5): Promise<SearchHit[]> {
  return cacheAside(
    cacheKey("autocomplete", query, limit),
    TTL.SHORT,
    async () => {
      const cleanQuery = query.replace(/[^\w\s]/g, "").trim();
      if (!cleanQuery) return [];
      const prefix = cleanQuery.split(/\s+/).filter(Boolean).map(w => `${w}:*`).join(" & ");
      const result = await db.execute(sql`
        SELECT entity_id AS "id", entity_type AS "type", title, subtitle, image_url AS "imageUrl",
          ts_rank(tsv, to_tsquery('english', ${prefix})) AS score
        FROM search_index
        WHERE tsv @@ to_tsquery('english', ${prefix})
        ORDER BY score DESC LIMIT ${limit}
      `);
      return result.rows.map((r: any) => ({ ...r, data: {} }));
    }
  );
}
