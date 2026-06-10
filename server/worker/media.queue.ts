import { Queue } from "bullmq";
import { registerQueueForMetrics } from "./metrics";

// Retry transient failures (S3 5xx, fetch hiccups, etc.) before giving up.
// Exponential backoff: ~2s, 4s, 8s between attempts. Final terminal failure
// after MEDIA_JOB_ATTEMPTS tries flips the media row to failed.
function posInt(raw: string | undefined, fallback: number, min: number) {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback;
}
const MEDIA_JOB_ATTEMPTS = posInt(process.env.MEDIA_JOB_ATTEMPTS, 4, 1);
const MEDIA_JOB_BACKOFF_MS = posInt(process.env.MEDIA_JOB_BACKOFF_MS, 2000, 1);

export const mediaQueue = process.env.REDIS_URL
  ? new Queue("media", {
      connection: { url: process.env.REDIS_URL },
      defaultJobOptions: {
        attempts: MEDIA_JOB_ATTEMPTS,
        backoff: { type: "exponential", delay: MEDIA_JOB_BACKOFF_MS },
      },
    })
  : null;

if (mediaQueue) registerQueueForMetrics("media", mediaQueue);
