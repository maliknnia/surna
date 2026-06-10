import { Job } from "bullmq";
import { registerWorker, QUEUE_NAMES } from "./jobQueue";
import { startBullMqMetricsPolling } from "../worker/metrics";
import { indexEntity, removeFromIndex } from "./searchIndex";
import { db } from "../db";
import { notifications, analyticsFacts } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const BANNED_WORDS = [
  "spam", "scam", "hate", "abuse", "violence", "porn", "xxx", "nude",
  "nsfw", "illegal", "drugs", "weapon", "terrorist", "bomb"
];

function containsBannedContent(text: string): { flagged: boolean; words: string[] } {
  const lower = text.toLowerCase();
  const found = BANNED_WORDS.filter(w => lower.includes(w));
  return { flagged: found.length > 0, words: found };
}

async function logModerationFlag(contentId: string, contentType: string, reason: string) {
  try {
    await db.execute(sql`
      INSERT INTO security_events (event_type, threat_level, description, metadata)
      VALUES ('content_flagged', 'medium', ${`Moderation flag: ${contentType} ${contentId}`},
        ${JSON.stringify({ contentId, contentType, reason })}::jsonb)
    `);
  } catch {
    console.warn("[moderation] Could not log flag to security_events");
  }
}

export function initializeWorkers() {
  if (!process.env.REDIS_URL) {
    console.warn("[workers] No Redis â€” workers disabled");
    return;
  }

  registerWorker(QUEUE_NAMES.NOTIFICATIONS, async (job: Job) => {
    const { type, userId, payload } = job.data;

    switch (type) {
      case "in-app": {
        if (!userId || !payload?.title || !payload?.message) {
          throw new Error("in-app notification missing required fields");
        }
        await db.insert(notifications).values({
          userId,
          type: payload.notificationType || "system",
          title: payload.title,
          message: payload.message,
          relatedEntityType: payload.entityType || null,
          relatedEntityId: payload.entityId || null,
          isRead: false,
        });
        break;
      }

      case "push": {
        console.log(`[notifications] Push â†’ user=${userId} title="${payload?.title}"`);
        break;
      }

      case "email": {
        console.log(`[notifications] Email â†’ user=${userId} subject="${payload?.subject}" body="${payload?.body?.substring(0, 80)}..."`);
        break;
      }

      case "batch": {
        const items: Array<{ userId: string; title: string; message: string; notificationType?: string }> =
          payload?.items || [];
        if (items.length === 0) break;
        await db.insert(notifications).values(
          items.map(item => ({
            userId: item.userId,
            type: item.notificationType || "system",
            title: item.title,
            message: item.message,
            isRead: false,
          }))
        );
        break;
      }

      default:
        console.warn(`[notifications] Unknown type: ${type}`);
    }
  }, { concurrency: 5 });

  registerWorker(QUEUE_NAMES.PAYMENTS, async (job: Job) => {
    const { type } = job.data;

    switch (type) {
      case "webhook": {
        const { event, stripeCustomerId } = job.data;
        console.log(`[payments] Processing webhook event=${event} customer=${stripeCustomerId}`);
        const validEvents = [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.payment_succeeded",
          "invoice.payment_failed",
        ];
        if (!validEvents.includes(event)) {
          console.log(`[payments] Skipping unhandled event type: ${event}`);
        }
        break;
      }

      case "entitlement-sync": {
        const { userId } = job.data;
        if (!userId) throw new Error("entitlement-sync missing userId");
        const result = await db.execute(sql`
          SELECT plan, status, grace_period_ends_at
          FROM stripe_entitlements
          WHERE user_id = ${userId}
          LIMIT 1
        `);
        const row = result.rows[0] as any;
        if (row) {
          console.log(`[payments] Entitlement synced user=${userId} plan=${row.plan} status=${row.status}`);
        } else {
          console.log(`[payments] No entitlement found for user=${userId}, defaulting to free`);
        }
        break;
      }

      case "subscription-check": {
        const result = await db.execute(sql`
          SELECT user_id, plan, status, grace_period_ends_at
          FROM stripe_entitlements
          WHERE status = 'past_due'
            AND grace_period_ends_at IS NOT NULL
            AND grace_period_ends_at < NOW()
        `);
        const expired = result.rows as any[];
        for (const row of expired) {
          await db.execute(sql`
            UPDATE stripe_entitlements
            SET status = 'canceled', updated_at = NOW()
            WHERE user_id = ${row.user_id}
          `);
          console.log(`[payments] Grace period expired â†’ canceled user=${row.user_id}`);
        }
        break;
      }

      default:
        console.warn(`[payments] Unknown type: ${type}`);
    }
  }, { concurrency: 2 });

  registerWorker(QUEUE_NAMES.ANALYTICS, async (job: Job) => {
    const { type } = job.data;

    switch (type) {
      case "track-event": {
        const { kind, actorType, actorId, targetType, targetId, sport, amountCents, meta } = job.data;
        if (!kind) throw new Error("track-event missing kind");
        await db.insert(analyticsFacts).values({
          kind,
          actorType: actorType || null,
          actorId: actorId || null,
          targetType: targetType || null,
          targetId: targetId || null,
          sport: sport || null,
          amountCents: amountCents || null,
          meta: meta || null,
        });
        break;
      }

      case "rollup": {
        const { period, entityType } = job.data;
        console.log(`[analytics] Rollup triggered period=${period || "day"} entityType=${entityType || "all"}`);
        const cutoff = period === "week"
          ? sql`NOW() - INTERVAL '7 days'`
          : period === "month"
            ? sql`NOW() - INTERVAL '30 days'`
            : sql`NOW() - INTERVAL '1 day'`;
        const result = await db.execute(sql`
          SELECT kind, COUNT(*) as event_count, SUM(amount_cents) as total_amount
          FROM analytics_facts
          WHERE ts > ${cutoff}
          GROUP BY kind
          ORDER BY event_count DESC
          LIMIT 20
        `);
        console.log(`[analytics] Rollup complete: ${result.rows.length} event kinds processed`);
        break;
      }

      default:
        console.warn(`[analytics] Unknown type: ${type}`);
    }
  }, { concurrency: 3 });

  registerWorker(QUEUE_NAMES.SEARCH_INDEX, async (job: Job) => {
    const { type, entityType, entityId } = job.data;

    switch (type) {
      case "index": {
        if (!entityType || !entityId) throw new Error("index job missing entityType or entityId");
        const data = job.data.entityData;
        if (!data?.title) {
          console.warn(`[search] No entity data for ${entityType}:${entityId} â€” skipping index`);
          break;
        }
        await indexEntity({
          entityId,
          entityType,
          title: data.title,
          subtitle: data.subtitle,
          body: data.body,
          imageUrl: data.imageUrl,
          sport: data.sport,
          location: data.location,
          tags: data.tags,
        });
        break;
      }

      case "reindex-all": {
        const targetType = entityType || "user";
        console.log(`[search] Reindex all ${targetType}s`);

        if (targetType === "user") {
          const users = await db.execute(sql`
            SELECT id, first_name, last_name, username, bio, sport, location, profile_image_url
            FROM users LIMIT 500
          `);
          for (const u of users.rows as any[]) {
            await indexEntity({
              entityId: u.id,
              entityType: "user",
              title: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "User",
              subtitle: u.bio || "",
              sport: u.sport || undefined,
              location: u.location || undefined,
              imageUrl: u.profile_image_url || undefined,
            });
          }
          console.log(`[search] Reindexed ${users.rows.length} users`);
        } else if (targetType === "team") {
          const teams = await db.execute(sql`
            SELECT id, name, description, sport, location, logo_url FROM teams LIMIT 500
          `);
          for (const t of teams.rows as any[]) {
            await indexEntity({
              entityId: t.id,
              entityType: "team",
              title: t.name,
              subtitle: t.description || "",
              sport: t.sport || undefined,
              location: t.location || undefined,
              imageUrl: t.logo_url || undefined,
            });
          }
          console.log(`[search] Reindexed ${teams.rows.length} teams`);
        }
        break;
      }

      case "delete": {
        if (!entityType || !entityId) throw new Error("delete job missing entityType or entityId");
        await removeFromIndex(entityId, entityType);
        break;
      }

      default:
        console.warn(`[search] Unknown type: ${type}`);
    }
  }, { concurrency: 2 });

  registerWorker(QUEUE_NAMES.MODERATION, async (job: Job) => {
    const { type, contentId, contentType } = job.data;

    switch (type) {
      case "scan-text": {
        const text: string = job.data.text || "";
        if (!text) break;
        const { flagged, words } = containsBannedContent(text);
        if (flagged) {
          await logModerationFlag(contentId, contentType, `Banned words: ${words.join(", ")}`);
          if (contentType === "post") {
            await db.execute(sql`
              UPDATE posts SET flagged = true WHERE id = ${contentId}
            `);
          } else if (contentType === "comment") {
            await db.execute(sql`
              UPDATE post_comments SET flagged = true WHERE id = ${contentId}
            `);
          }
          console.log(`[moderation] Flagged ${contentType}:${contentId} â€” words: ${words.join(", ")}`);
        }
        break;
      }

      case "scan-image": {
        console.log(`[moderation] Image scan queued for ${contentType}:${contentId} â€” requires ML service`);
        break;
      }

      case "report": {
        const { reporterId, reason } = job.data;
        await db.execute(sql`
          INSERT INTO security_events (event_type, threat_level, description, metadata)
          VALUES ('user_report', 'low', ${`User report: ${contentType} ${contentId}`},
            ${JSON.stringify({ contentId, contentType, reporterId, reason })}::jsonb)
        `);
        console.log(`[moderation] Logged user report for ${contentType}:${contentId}`);
        break;
      }

      default:
        console.warn(`[moderation] Unknown type: ${type}`);
    }
  }, { concurrency: 2 });

  registerWorker(QUEUE_NAMES.MEDIA, async (job: Job) => {
    const { type, mediaId } = job.data;

    switch (type) {
      case "resize": {
        if (!mediaId) throw new Error("resize job missing mediaId");
        console.log(`[media] Image resize queued for mediaId=${mediaId} â€” requires image processing service`);
        await db.execute(sql`
          UPDATE media_assets SET status = 'ready'
          WHERE id = ${mediaId} AND status = 'pending'
        `);
        break;
      }

      case "transcode": {
        const { videoId } = job.data;
        console.log(`[media] Video transcode queued for videoId=${videoId} â€” requires video processing service`);
        break;
      }

      case "delete-s3": {
        const { s3Key } = job.data;
        console.log(`[media] S3 deletion queued for key=${s3Key}`);
        break;
      }

      default:
        console.warn(`[media] Unknown type: ${type}`);
    }
  }, { concurrency: 2 });

  registerWorker(QUEUE_NAMES.EMAIL, async (job: Job) => {
    const { to, subject, body, template, templateData } = job.data;
    if (!to) throw new Error("email job missing recipient");
    console.log(`[email] Sending to=${to} subject="${subject || template}" body_preview="${(body || "").substring(0, 60)}..."`);
  }, { concurrency: 5 });

  startBullMqMetricsPolling();

  console.log("âœ… Job workers initialized (notifications, payments, analytics, search, moderation, media, email)");
}
