// Background watcher that turns the in-process degraded snapshot into an
// outbound alert.
//
// Why this lives server-side (not in the browser dot from #20):
//   - The dashboard banner only fires when an admin happens to be on the page.
//     If everyone is asleep, the breach goes unseen.
//   - Polling once a minute and posting on edge transitions (healthy â†”
//     degraded) is cheap enough to run on every instance, and the Slack/PD
//     dedupe story is "post the resolved message when we recover" which is
//     simpler than tracking per-breach cooldowns across instances.
//
// Channels (any combination â€” at least one must be configured for the alerter
// to start):
//   - Slack / generic webhook  â†’ ALERT_WEBHOOK_URL (+ ALERT_WEBHOOK_FORMAT=
//     "slack" (default) | "pagerduty")
//   - Email                    â†’ ALERT_EMAIL_TO (comma-separated). Uses the
//     same SendGrid credentials as the rest of the app
//     (SENDGRID_API_KEY / FROM_EMAIL).
//   - PagerDuty Events v2      â†’ set ALERT_WEBHOOK_URL to
//     https://events.pagerduty.com/v2/enqueue and
//     ALERT_WEBHOOK_FORMAT=pagerduty (PAGERDUTY_ROUTING_KEY required).
//
// Throttling:
//   - ALERT_WEBHOOK_MIN_INTERVAL_SECONDS (default 600) bounds how often we
//     re-page if the system stays degraded but the *set* of breach reasons
//     changes. We never re-page for the same reason set inside the interval.
//   - State (lastDegraded / lastBreachKey / lastSentAt) is only advanced
//     when at least one channel acknowledged the send. A transient outage
//     on the first healthyâ†’degraded edge therefore retries on the next
//     tick instead of being silently swallowed.
import sgMail from "@sendgrid/mail";
import { getHealthSnapshot, type HealthSnapshot } from "./prometheusMetrics";

const POLL_MS = Number(process.env.HEALTH_ALERT_POLL_MS || 60_000);
const MIN_RE_PAGE_MS =
  Number(process.env.ALERT_WEBHOOK_MIN_INTERVAL_SECONDS || 600) * 1000;
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";
const WEBHOOK_FORMAT = (process.env.ALERT_WEBHOOK_FORMAT || "slack").toLowerCase();
const SOURCE = process.env.ALERT_SOURCE_NAME || "surna-api";
const EMAIL_TO = (process.env.ALERT_EMAIL_TO || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const EMAIL_FROM =
  process.env.ALERT_EMAIL_FROM || process.env.FROM_EMAIL || "noreply@surna.app";

// SendGrid setup is performed here so the email channel works even if no
// other module that initializes @sendgrid/mail (e.g. emailCampaignService)
// has been imported yet. setApiKey is idempotent, so calling it again
// elsewhere is harmless.
let sendgridReady = false;
function ensureSendgridConfigured(): boolean {
  if (sendgridReady) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  sendgridReady = true;
  return true;
}

type AlertKind = "fired" | "resolved" | "changed";

interface AlerterState {
  lastDegraded: boolean;
  lastBreachKey: string;
  lastSentAt: number;
}

const state: AlerterState = {
  lastDegraded: false,
  lastBreachKey: "",
  lastSentAt: 0,
};

let timer: NodeJS.Timeout | null = null;

function buildSlackPayload(snap: HealthSnapshot, kind: AlertKind) {
  const heading =
    kind === "resolved"
      ? `:white_check_mark: *${SOURCE}* â€” service recovered`
      : kind === "changed"
        ? `:warning: *${SOURCE}* â€” degraded (breaches changed)`
        : `:rotating_light: *${SOURCE}* â€” service degraded`;
  const lines = snap.breaches.length
    ? snap.breaches.map((b) => `â€¢ ${b}`).join("\n")
    : "(no active breaches)";
  return {
    text: `${heading}\n${lines}`,
    attachments: [
      {
        color: kind === "resolved" ? "good" : "danger",
        fields: [
          { title: "p95 latency", value: `${snap.p95LatencyMs.toFixed(0)} ms`, short: true },
          { title: "Error rate", value: `${snap.errorRatePercent.toFixed(2)}%`, short: true },
          { title: "DB pool", value: `${snap.dbPool.utilizationPercent.toFixed(0)}% used`, short: true },
          { title: "Sockets", value: `${snap.socketsConnected}`, short: true },
        ],
      },
    ],
  };
}

function buildPagerDutyPayload(snap: HealthSnapshot, kind: AlertKind) {
  // Events API v2 â€” caller still has to put the routing key into the URL or
  // override the payload as needed. We emit a generic shape that's easy to
  // adapt.
  return {
    routing_key: process.env.PAGERDUTY_ROUTING_KEY || "REPLACE_ME",
    event_action: kind === "resolved" ? "resolve" : "trigger",
    dedup_key: `${SOURCE}:health-degraded`,
    payload: {
      summary: `${SOURCE} ${kind === "resolved" ? "recovered" : "degraded"}: ${snap.breaches.join("; ") || "no breaches"}`,
      severity: kind === "resolved" ? "info" : "error",
      source: SOURCE,
      custom_details: snap,
    },
  };
}

function buildEmail(snap: HealthSnapshot, kind: AlertKind) {
  const verb =
    kind === "resolved"
      ? "RECOVERED"
      : kind === "changed"
        ? "DEGRADED (changed)"
        : "DEGRADED";
  const subject = `[${SOURCE}] ${verb}${snap.breaches.length ? ` â€” ${snap.breaches[0]}` : ""}`;
  const breachLines = snap.breaches.length
    ? snap.breaches.map((b) => `  â€¢ ${b}`).join("\n")
    : "  (no active breaches)";
  const text = [
    `${SOURCE} health snapshot transitioned: ${verb}`,
    "",
    "Active breaches:",
    breachLines,
    "",
    `p95 latency : ${snap.p95LatencyMs.toFixed(0)} ms (SLO ${snap.slo.p95LatencyMaxMs} ms)`,
    `error rate  : ${snap.errorRatePercent.toFixed(2)}% (SLO ${snap.slo.errorRateMaxPercent}%)`,
    `DB pool     : ${snap.dbPool.utilizationPercent.toFixed(0)}% used (SLO ${snap.slo.dbPoolMaxUtilizationPercent}%)`,
    `sockets     : ${snap.socketsConnected}`,
    `requests/5m : ${snap.requestsInWindow5m}`,
    `generated   : ${snap.generatedAt}`,
  ].join("\n");
  return { subject, text };
}

async function postWebhook(payload: unknown): Promise<boolean> {
  if (!WEBHOOK_URL) return false;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Don't let a hung paging endpoint hold up the poll loop.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[healthAlerter] webhook returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    const msg = (err as { message?: string } | null)?.message ?? String(err);
    console.warn(`[healthAlerter] webhook post failed: ${msg}`);
    return false;
  }
}

async function sendEmail(snap: HealthSnapshot, kind: AlertKind): Promise<boolean> {
  if (EMAIL_TO.length === 0) return false;
  if (!ensureSendgridConfigured()) {
    console.warn("[healthAlerter] ALERT_EMAIL_TO set but SENDGRID_API_KEY missing");
    return false;
  }
  try {
    const { subject, text } = buildEmail(snap, kind);
    await sgMail.send({
      to: EMAIL_TO,
      from: EMAIL_FROM,
      subject,
      text,
    });
    return true;
  } catch (err) {
    const msg = (err as { message?: string } | null)?.message ?? String(err);
    console.warn(`[healthAlerter] email send failed: ${msg}`);
    return false;
  }
}

async function fanOut(snap: HealthSnapshot, kind: AlertKind): Promise<boolean> {
  // Run channels in parallel; any one success is enough to consider the
  // alert delivered. If all configured channels fail, return false so the
  // caller leaves state untouched and we retry on the next tick.
  const sends: Array<Promise<boolean>> = [];
  if (WEBHOOK_URL) {
    const payload =
      WEBHOOK_FORMAT === "pagerduty"
        ? buildPagerDutyPayload(snap, kind)
        : buildSlackPayload(snap, kind);
    sends.push(postWebhook(payload));
  }
  if (EMAIL_TO.length > 0) {
    sends.push(sendEmail(snap, kind));
  }
  if (sends.length === 0) return false;
  const results = await Promise.all(sends);
  return results.some(Boolean);
}

async function tick() {
  let snap: HealthSnapshot;
  try {
    snap = getHealthSnapshot();
  } catch (err) {
    const msg = (err as { message?: string } | null)?.message ?? String(err);
    console.warn(`[healthAlerter] snapshot failed: ${msg}`);
    return;
  }

  const breachKey = snap.breaches.slice().sort().join("|");
  const now = Date.now();

  let kind: AlertKind | null = null;
  if (snap.degraded && !state.lastDegraded) {
    kind = "fired";
  } else if (!snap.degraded && state.lastDegraded) {
    kind = "resolved";
  } else if (
    snap.degraded &&
    state.lastDegraded &&
    breachKey !== state.lastBreachKey &&
    now - state.lastSentAt >= MIN_RE_PAGE_MS
  ) {
    // Already-degraded â†’ still-degraded, but the breach mix changed and the
    // cooldown has elapsed. Re-page so on-call sees the new failure mode.
    kind = "changed";
  }

  if (kind) {
    const delivered = await fanOut(snap, kind);
    if (!delivered) {
      // Leave state alone so the next tick treats this as the same edge and
      // tries again. This prevents a transient webhook/email outage from
      // permanently swallowing the initial fired/resolved alert.
      console.warn(
        `[healthAlerter] ${kind} alert undelivered; will retry next tick`,
      );
      return;
    }
    state.lastSentAt = now;
  }

  state.lastDegraded = snap.degraded;
  state.lastBreachKey = breachKey;
}

function channelsConfigured(): string[] {
  const configured: string[] = [];
  if (WEBHOOK_URL) configured.push(WEBHOOK_FORMAT);
  if (EMAIL_TO.length > 0) configured.push(`email(${EMAIL_TO.length})`);
  return configured;
}

export function startHealthAlerter(): void {
  if (timer) return;
  const channels = channelsConfigured();
  if (channels.length === 0) {
    console.log(
      "[healthAlerter] no channels configured (set ALERT_WEBHOOK_URL and/or ALERT_EMAIL_TO) â€” alerter disabled",
    );
    return;
  }
  // Prime state from the first poll so we don't immediately fire a "fired"
  // event for a system that's been degraded since boot.
  try {
    const initial = getHealthSnapshot();
    state.lastDegraded = initial.degraded;
    state.lastBreachKey = initial.breaches.slice().sort().join("|");
  } catch {
    /* ignore â€” the first tick will populate */
  }
  timer = setInterval(() => {
    void tick();
  }, POLL_MS);
  // Don't keep the event loop alive just for the alerter.
  timer.unref?.();
  console.log(
    `[healthAlerter] started: every ${POLL_MS / 1000}s â†’ ${channels.join(", ")}`,
  );
}

export function stopHealthAlerter(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// Exposed for tests.
export const __test = {
  state,
  tick,
  fanOut,
  buildSlackPayload,
  buildPagerDutyPayload,
  buildEmail,
};
