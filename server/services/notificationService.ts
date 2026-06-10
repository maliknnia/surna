// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import webpush from "web-push";
import { db } from "../db";
import { pushTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface NotificationData {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@surna.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export class NotificationService {
  static async sendPushNotification(
    userId: string,
    notification: NotificationData,
    subscription?: PushSubscription
  ): Promise<boolean> {
    try {
      let subscriptions: any[] = [];

      if (subscription) {
        subscriptions = [subscription];
      } else {
        const tokens = await db
          .select()
          .from(pushTokens)
          .where(and(eq(pushTokens.userId, userId), eq(pushTokens.isActive, true)));

        subscriptions = tokens.map(token => ({
          endpoint: token.endpoint,
          keys: {
            p256dh: token.p256dh,
            auth: token.auth
          }
        }));
      }

      if (subscriptions.length === 0) {
        console.log(`No active push subscriptions for user ${userId}`);
        return false;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.imageUrl || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: notification.actionUrl || '/',
          ...notification.data
        }
      });

      const results = await Promise.allSettled(
        subscriptions.map(sub => webpush.sendNotification(sub, payload))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`📱 Push notification sent to ${successCount}/${subscriptions.length} devices for user ${userId}`);

      return successCount > 0;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  static async subscribeToPushNotifications(
    userId: string,
    subscription: PushSubscription,
    deviceType: string = 'desktop'
  ): Promise<boolean> {
    try {
      const existingToken = await db
        .select()
        .from(pushTokens)
        .where(and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.endpoint, subscription.endpoint)
        ))
        .limit(1);

      if (existingToken.length > 0) {
        await db
          .update(pushTokens)
          .set({
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            isActive: true,
            lastUsed: new Date()
          })
          .where(eq(pushTokens.id, existingToken[0].id));
      } else {
        await db.insert(pushTokens).values({
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          deviceType,
          isActive: true
        });
      }

      console.log(`User ${userId} subscribed to push notifications`);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }

  static async unsubscribeFromPushNotifications(
    userId: string,
    endpoint?: string
  ): Promise<boolean> {
    try {
      if (endpoint) {
        await db
          .update(pushTokens)
          .set({ isActive: false })
          .where(and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.endpoint, endpoint)
          ));
      } else {
        await db
          .update(pushTokens)
          .set({ isActive: false })
          .where(eq(pushTokens.userId, userId));
      }

      console.log(`User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  static async sendBulkNotification(
    userIds: string[],
    notification: NotificationData
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const success = await this.sendPushNotification(userId, notification);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    console.log(`Bulk notification complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  static createWelcomeNotification(userName: string): NotificationData {
    return {
      title: "Welcome to SURNA! 🏆",
      body: `Hi ${userName}! Welcome to the ultimate sports social platform. Start connecting with athletes and teams!`,
      actionUrl: "/profile/setup",
      data: { type: "welcome" }
    };
  }

  static createNewMessageNotification(senderName: string): NotificationData {
    return {
      title: "New Message",
      body: `${senderName} sent you a message`,
      actionUrl: "/messages",
      data: { type: "message" }
    };
  }

  static createEventInviteNotification(eventName: string, inviterName: string): NotificationData {
    return {
      title: "Event Invitation",
      body: `${inviterName} invited you to ${eventName}`,
      actionUrl: "/events",
      data: { type: "event_invite" }
    };
  }

  static createTeamRequestNotification(teamName: string): NotificationData {
    return {
      title: "Team Join Request",
      body: `You have a new request to join ${teamName}`,
      actionUrl: "/teams",
      data: { type: "team_request" }
    };
  }

  static createLikeNotification(userName: string, contentType: string): NotificationData {
    return {
      title: "New Like",
      body: `${userName} liked your ${contentType}`,
      actionUrl: "/profile",
      data: { type: "like" }
    };
  }
}
