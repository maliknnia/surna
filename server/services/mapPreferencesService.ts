import { eq } from "drizzle-orm";
import { db } from "../db";
import { userPreferences } from "@shared/schema";
import {
  DEFAULT_MAP_SETTINGS,
  mergeMapSettings,
  type MapSettings,
} from "@shared/mapSettings";

const MAP_PREFS_KEY = "map";

export class MapPreferencesService {
  static async getMapSettings(userId: string): Promise<MapSettings> {
    try {
      const [row] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      if (!row?.preferences || typeof row.preferences !== "object") {
        return { ...DEFAULT_MAP_SETTINGS, layers: { ...DEFAULT_MAP_SETTINGS.layers } };
      }

      const prefs = row.preferences as Record<string, unknown>;
      const mapBlob = prefs[MAP_PREFS_KEY];
      return mergeMapSettings(mapBlob as Partial<MapSettings>);
    } catch {
      return { ...DEFAULT_MAP_SETTINGS, layers: { ...DEFAULT_MAP_SETTINGS.layers } };
    }
  }

  static async patchMapSettings(
    userId: string,
    patch: Partial<MapSettings>,
  ): Promise<MapSettings> {
    const current = await this.getMapSettings(userId);
    const next = mergeMapSettings({ ...current, ...patch, layers: { ...current.layers, ...patch.layers } });

    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const mergedRoot =
      existing?.preferences && typeof existing.preferences === "object"
        ? { ...(existing.preferences as Record<string, unknown>) }
        : {};

    mergedRoot[MAP_PREFS_KEY] = next;

    if (existing) {
      await db
        .update(userPreferences)
        .set({ preferences: mergedRoot, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({
        userId,
        preferences: mergedRoot,
      });
    }

    return next;
  }
}
