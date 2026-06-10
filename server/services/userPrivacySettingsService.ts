import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { userPreferences } from "@shared/schema";
import {
  DEFAULT_USER_PRIVACY,
  mergeUserPrivacy,
  type UserPrivacySettings,
} from "@shared/userPrivacy";
import { MapPreferencesService } from "./mapPreferencesService";

const PRIVACY_KEY = "privacy";

export class UserPrivacySettingsService {
  static async getSettings(userId: string): Promise<UserPrivacySettings> {
    try {
      const [row] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      const mapSettings = await MapPreferencesService.getMapSettings(userId);
      const blob =
        row?.preferences && typeof row.preferences === "object"
          ? (row.preferences as Record<string, unknown>)[PRIVACY_KEY]
          : null;

      const merged = mergeUserPrivacy(blob as Partial<UserPrivacySettings>);
      return {
        ...merged,
        mapLocationAudience: mapSettings.locationAudience,
        ghostMode: mapSettings.ghostMode,
        blurLocation: mapSettings.blurLocation,
        showActiveOnMap: mapSettings.showActiveStatus,
        showOnlineStatus: merged.showOnlineStatus,
      };
    } catch {
      return { ...DEFAULT_USER_PRIVACY };
    }
  }

  static async patchSettings(
    userId: string,
    patch: Partial<UserPrivacySettings> & Record<string, unknown>,
  ): Promise<UserPrivacySettings> {
    const normalized: Partial<UserPrivacySettings> = { ...patch };
    if (patch.locationAudience != null) {
      normalized.mapLocationAudience = patch.locationAudience as UserPrivacySettings["mapLocationAudience"];
    }
    if (patch.showActiveStatus != null) {
      normalized.showActiveOnMap = Boolean(patch.showActiveStatus);
    }

    const current = await this.getSettings(userId);
    const next = mergeUserPrivacy({ ...current, ...normalized });

    const mapPatch: Record<string, unknown> = {};
    if (patch.mapLocationAudience !== undefined) mapPatch.locationAudience = patch.mapLocationAudience;
    if (patch.ghostMode !== undefined) mapPatch.ghostMode = patch.ghostMode;
    if (patch.blurLocation !== undefined) mapPatch.blurLocation = patch.blurLocation;
    if (patch.showActiveOnMap !== undefined) mapPatch.showActiveStatus = patch.showActiveOnMap;
    if (Object.keys(mapPatch).length > 0) {
      await MapPreferencesService.patchMapSettings(userId, mapPatch as any);
    }

    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    const root =
      existing?.preferences && typeof existing.preferences === "object"
        ? { ...(existing.preferences as Record<string, unknown>) }
        : {};

    const { mapLocationAudience, ghostMode, blurLocation, showActiveOnMap, ...privacyOnly } = next;
    root[PRIVACY_KEY] = privacyOnly;

    if (existing) {
      await db
        .update(userPreferences)
        .set({ preferences: root, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId));
    } else {
      await db.insert(userPreferences).values({ userId, preferences: root });
    }

    return this.getSettings(userId);
  }

  static async getAttendeePrivacy(userId: string): Promise<{
    showInAttendeeLists: boolean;
    showPhotoInAttendeeLists: boolean;
  }> {
    const batch = await this.getAttendeePrivacyBatch([userId]);
    return batch.get(userId) ?? {
      showInAttendeeLists: true,
      showPhotoInAttendeeLists: true,
    };
  }

  /** Lightweight batch lookup — avoids map-settings queries per attendee. */
  static async getAttendeePrivacyBatch(
    userIds: string[],
  ): Promise<Map<string, { showInAttendeeLists: boolean; showPhotoInAttendeeLists: boolean }>> {
    const result = new Map<string, { showInAttendeeLists: boolean; showPhotoInAttendeeLists: boolean }>();
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const id of unique) {
      result.set(id, { showInAttendeeLists: true, showPhotoInAttendeeLists: true });
    }
    if (!unique.length) return result;

    try {
      const rows = await db
        .select({ userId: userPreferences.userId, preferences: userPreferences.preferences })
        .from(userPreferences)
        .where(inArray(userPreferences.userId, unique));

      for (const row of rows) {
        const blob =
          row.preferences && typeof row.preferences === "object"
            ? (row.preferences as Record<string, unknown>)[PRIVACY_KEY]
            : null;
        const merged = mergeUserPrivacy(blob as Partial<UserPrivacySettings>);
        result.set(row.userId, {
          showInAttendeeLists: merged.showInAttendeeLists,
          showPhotoInAttendeeLists: merged.showPhotoInAttendeeLists,
        });
      }
    } catch {
      // Defaults already set above
    }
    return result;
  }
}
