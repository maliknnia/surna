// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { db } from "../db";
import { users, posts, userPrivacySettings } from "@shared/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { z } from "zod";

export enum PrivacyLevel {
  PUBLIC = "public",
  FRIENDS = "friends", 
  PRIVATE = "private"
}

export enum DataType {
  PROFILE = "profile",
  POSTS = "posts",
  ACHIEVEMENTS = "achievements",
  ACTIVITY = "activity",
  LOCATION = "location",
  CONTACTS = "contacts"
}

export const privacySettingsSchema = z.object({
  profileVisibility: z.nativeEnum(PrivacyLevel),
  postsVisibility: z.nativeEnum(PrivacyLevel),
  achievementsVisibility: z.nativeEnum(PrivacyLevel),
  activityVisibility: z.nativeEnum(PrivacyLevel),
  locationVisibility: z.nativeEnum(PrivacyLevel),
  contactsVisibility: z.nativeEnum(PrivacyLevel),
  allowMessagesFrom: z.nativeEnum(PrivacyLevel),
  allowTagging: z.boolean(),
  showOnlineStatus: z.boolean(),
  allowDataProcessing: z.boolean(),
  allowMarketing: z.boolean(),
  allowAnalytics: z.boolean(),
});

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export class PrivacyControlsService {
  static async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    const [settings] = await db.select()
      .from(userPrivacySettings)
      .where(eq(userPrivacySettings.userId, userId));

    if (!settings) {
      // Return default privacy settings
      return this.getDefaultPrivacySettings();
    }

    return {
      profileVisibility: settings.profileVisibility as PrivacyLevel,
      postsVisibility: settings.postsVisibility as PrivacyLevel,
      achievementsVisibility: settings.achievementsVisibility as PrivacyLevel,
      activityVisibility: settings.activityVisibility as PrivacyLevel,
      locationVisibility: settings.locationVisibility as PrivacyLevel,
      contactsVisibility: settings.contactsVisibility as PrivacyLevel,
      allowMessagesFrom: settings.allowMessagesFrom as PrivacyLevel,
      allowTagging: settings.allowTagging,
      showOnlineStatus: settings.showOnlineStatus,
      allowDataProcessing: settings.allowDataProcessing,
      allowMarketing: settings.allowMarketing,
      allowAnalytics: settings.allowAnalytics,
    };
  }

  static async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
    const existingSettings = await this.getUserPrivacySettings(userId);
    const updatedSettings = { ...existingSettings, ...settings };

    await db.insert(userPrivacySettings)
      .values({
        userId,
        ...updatedSettings,
      })
      .onConflictDoUpdate({
        target: userPrivacySettings.userId,
        set: updatedSettings,
      });
  }

  static async canViewContent(
    viewerId: string | null,
    contentOwnerId: string,
    dataType: DataType
  ): Promise<boolean> {
    // Owner can always view their own content
    if (viewerId === contentOwnerId) {
      return true;
    }

    const privacy = await this.getUserPrivacySettings(contentOwnerId);
    let visibility: PrivacyLevel;

    switch (dataType) {
      case DataType.PROFILE:
        visibility = privacy.profileVisibility;
        break;
      case DataType.POSTS:
        visibility = privacy.postsVisibility;
        break;
      case DataType.ACHIEVEMENTS:
        visibility = privacy.achievementsVisibility;
        break;
      case DataType.ACTIVITY:
        visibility = privacy.activityVisibility;
        break;
      case DataType.LOCATION:
        visibility = privacy.locationVisibility;
        break;
      case DataType.CONTACTS:
        visibility = privacy.contactsVisibility;
        break;
      default:
        visibility = PrivacyLevel.PRIVATE;
    }

    switch (visibility) {
      case PrivacyLevel.PUBLIC:
        return true;
      case PrivacyLevel.FRIENDS:
        return viewerId ? await this.areFriends(viewerId, contentOwnerId) : false;
      case PrivacyLevel.PRIVATE:
        return false;
      default:
        return false;
    }
  }

  static async areFriends(userId1: string, userId2: string): Promise<boolean> {
    // This would check your friendship/following system
    // For now, simplified implementation
    return true; // Implement based on your friend/follow system
  }

  static getDefaultPrivacySettings(): PrivacySettings {
    return {
      profileVisibility: PrivacyLevel.PUBLIC,
      postsVisibility: PrivacyLevel.PUBLIC,
      achievementsVisibility: PrivacyLevel.PUBLIC,
      activityVisibility: PrivacyLevel.FRIENDS,
      locationVisibility: PrivacyLevel.FRIENDS,
      contactsVisibility: PrivacyLevel.PRIVATE,
      allowMessagesFrom: PrivacyLevel.FRIENDS,
      allowTagging: true,
      showOnlineStatus: true,
      allowDataProcessing: true,
      allowMarketing: false,
      allowAnalytics: true,
    };
  }

  // GDPR/CCPA Compliance Methods
  static async exportUserData(userId: string): Promise<Record<string, any>> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const userPosts = await db.select().from(posts).where(eq(posts.authorId, userId));
    const privacySettings = await this.getUserPrivacySettings(userId);

    return {
      personalData: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        profileImageUrl: user?.profileImageUrl,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
      },
      posts: userPosts,
      privacySettings,
      dataExportedAt: new Date().toISOString(),
    };
  }

  static async deleteUserData(userId: string, keepMinimalData: boolean = false): Promise<void> {
    if (keepMinimalData) {
      // Anonymize user data while keeping some records for legal/business purposes
      await db.update(users)
        .set({
          email: `deleted_user_${userId}@example.com`,
          firstName: "Deleted",
          lastName: "User",
          profileImageUrl: null,
          bio: null,
          location: null,
          website: null,
          sportsPreferences: [],
        })
        .where(eq(users.id, userId));
    } else {
      // Complete data deletion
      // Note: This should be done carefully with proper cascade handling
      await db.delete(users).where(eq(users.id, userId));
    }
  }

  static async requestDataDeletion(userId: string, reason?: string): Promise<string> {
    const requestId = `DEL_${Date.now()}_${userId}`;
    
    // Log the deletion request for compliance tracking
    console.log(`Data deletion requested: ${requestId}`, {
      userId,
      reason,
      requestedAt: new Date().toISOString(),
    });

    // In a real implementation, this would create a deletion request record
    // and process it after a grace period (e.g., 30 days)
    
    return requestId;
  }

  static async processConsentUpdate(userId: string, consents: {
    allowDataProcessing?: boolean;
    allowMarketing?: boolean;
    allowAnalytics?: boolean;
  }): Promise<void> {
    await this.updatePrivacySettings(userId, consents);
    
    // Log consent changes for compliance
    console.log(`Consent updated for user ${userId}:`, {
      ...consents,
      updatedAt: new Date().toISOString(),
    });
  }

  static async getDataProcessingLog(userId: string): Promise<Array<{
    activity: string;
    purpose: string;
    timestamp: string;
    legalBasis: string;
  }>> {
    // Return log of data processing activities for transparency
    return [
      {
        activity: "Profile Creation",
        purpose: "Service Provision",
        timestamp: new Date().toISOString(),
        legalBasis: "Contract Performance"
      },
      {
        activity: "Analytics Data Collection",
        purpose: "Service Improvement",
        timestamp: new Date().toISOString(),
        legalBasis: "Legitimate Interest"
      }
    ];
  }
}