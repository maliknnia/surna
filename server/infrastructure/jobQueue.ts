import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { randomUUID } from "crypto";
import { recordJobFailed, registerQueueForMetrics } from "../worker/metrics";

const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined;

const queues: Record<string, Queue> = {};
const workers: Record<string, Worker> = {};

export type JobHandler = (job: Job) => Promise<any>;

const defaultOpts = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};

export function getQueue(name: string): Queue | null {
  if (!connection) return null;
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection,
      defaultJobOptions: defaultOpts,
    });
    registerQueueForMetrics(name, queues[name]);
  }
  return queues[name];
}

export function registerWorker(
  queueName: string,
  handler: JobHandler,
  opts?: { concurrency?: number }
): Worker | null {
  if (!connection) return null;
  const worker = new Worker(queueName, handler, {
    connection,
    concurrency: opts?.concurrency ?? 3,
  });

  worker.on("completed", (job) => {
    console.log(`[job:${queueName}] âœ… ${job.name}#${job.id} done`);
  });
  worker.on("failed", (job, err) => {
    recordJobFailed(queueName);
    console.error(`[job:${queueName}] âŒ ${job?.name}#${job?.id} failed: ${err.message}`);
  });

  // Ensure the queue exists for depth polling even if no producer has called
  // getQueue() yet on this instance.
  getQueue(queueName);

  workers[queueName] = worker;
  return worker;
}

export async function enqueue(
  queueName: string,
  jobName: string,
  data: Record<string, any>,
  opts?: {
    delay?: number;
    priority?: number;
    idempotencyKey?: string;
    attempts?: number;
  }
): Promise<string | null> {
  const q = getQueue(queueName);
  if (!q) {
    console.warn(`[job] Queue unavailable (no Redis), skipping ${queueName}/${jobName}`);
    return null;
  }

  const jobId = opts?.idempotencyKey || randomUUID();
  const job = await q.add(jobName, data, {
    jobId,
    delay: opts?.delay,
    priority: opts?.priority,
    attempts: opts?.attempts ?? 3,
  });
  return job.id ?? null;
}

export async function getQueueStats(queueName: string) {
  const q = getQueue(queueName);
  if (!q) return { available: false };
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
  ]);
  return { available: true, waiting, active, completed, failed, delayed };
}

export async function getAllQueueStats() {
  const stats: Record<string, any> = {};
  for (const name of Object.keys(queues)) {
    stats[name] = await getQueueStats(name);
  }
  return stats;
}

export async function closeAllWorkersAndQueues(): Promise<void> {
  const workerCloses = Object.entries(workers).map(async ([name, w]) => {
    try {
      await w.close();
      console.log(`[job:${name}] worker closed`);
    } catch (err: any) {
      console.error(`[job:${name}] worker close failed: ${err?.message || err}`);
    }
  });
  const queueCloses = Object.entries(queues).map(async ([name, q]) => {
    try {
      await q.close();
      console.log(`[job:${name}] queue closed`);
    } catch (err: any) {
      console.error(`[job:${name}] queue close failed: ${err?.message || err}`);
    }
  });
  await Promise.all([...workerCloses, ...queueCloses]);
}

const QUEUE_NAMES = {
  MEDIA: "media",
  NOTIFICATIONS: "notifications",
  PAYMENTS: "payments",
  ANALYTICS: "analytics",
  EMAIL: "email",
  MODERATION: "moderation",
  SEARCH_INDEX: "search-index",
} as const;

export { QUEUE_NAMES };
