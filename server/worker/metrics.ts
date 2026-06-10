import type { Queue } from "bullmq";

const QUEUE_POLL_MS = 5000;

const registeredQueues: Record<string, Queue> = {};
const failedCounters: Record<string, number> = {};
const queueDepth: Record<string, number> = {};
let lastHeartbeatTs = 0;
let pollerStarted = false;

export function registerQueueForMetrics(name: string, queue: Queue): void {
  if (registeredQueues[name]) return;
  registeredQueues[name] = queue;
  if (failedCounters[name] === undefined) failedCounters[name] = 0;
  if (queueDepth[name] === undefined) queueDepth[name] = 0;
}

export function recordJobFailed(queue: string): void {
  failedCounters[queue] = (failedCounters[queue] || 0) + 1;
}

export function recordWorkerHeartbeat(): void {
  lastHeartbeatTs = Date.now() / 1000;
}

async function pollQueueDepths(): Promise<void> {
  for (const [name, queue] of Object.entries(registeredQueues)) {
    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "delayed",
        "prioritized",
      );
      queueDepth[name] =
        (counts.waiting || 0) +
        (counts.active || 0) +
        (counts.delayed || 0) +
        (counts.prioritized || 0);
    } catch {
      // Redis hiccup — keep the previous reading rather than zero it out so
      // the depth alert doesn't false-clear during a transient outage.
    }
  }
}

export function startBullMqMetricsPolling(): void {
  if (pollerStarted) return;
  pollerStarted = true;
  void pollQueueDepths();
  setInterval(() => {
    void pollQueueDepths();
  }, QUEUE_POLL_MS);
}

export interface BullMqMetricsSnapshot {
  queueDepth: Record<string, number>;
  jobsFailedTotal: Record<string, number>;
  workerHeartbeatTimestampSeconds: number;
}

export function getBullMqMetrics(): BullMqMetricsSnapshot {
  return {
    queueDepth: { ...queueDepth },
    jobsFailedTotal: { ...failedCounters },
    workerHeartbeatTimestampSeconds: lastHeartbeatTs,
  };
}
