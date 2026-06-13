// @ts-nocheck -- Strict modules: server/features/analytics, server/admin. Peel this pragma per folder when fixing.
import { Router } from "express";
import { z } from "zod";
import {
  listApprovals,
  decideApproval,
  listActivity,
  appendActivity,
  proWorkflowEvents,
  type ActivityRole,
  type ActivityKind,
} from "../features/proWorkflow";

export const proWorkflowRouter = Router();

const DEMO_TEAM = "demo-team";

function getTeamId(req: any): string {
  const q = (req.query?.teamId as string | undefined)?.trim();
  const body = (req.body?.teamId as string | undefined)?.trim();
  return q || body || DEMO_TEAM;
}

function getActor(req: any): { name: string; role: ActivityRole } {
  const u = req.user as any;
  if (u) {
    const name =
      [u.firstName, u.lastName].filter(Boolean).join(" ") ||
      u.email ||
      u.id ||
      "User";
    return { name, role: "Owner" };
  }
  return { name: "Demo Owner", role: "Owner" };
}

proWorkflowRouter.get("/approvals", (req, res) => {
  try {
    res.json(listApprovals(getTeamId(req)));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load approvals" });
  }
});

const decideSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

proWorkflowRouter.post("/approvals/:id/decide", (req, res) => {
  try {
    const { status } = decideSchema.parse(req.body);
    const out = decideApproval(getTeamId(req), req.params.id, status, getActor(req));
    if (!out.approval) return res.status(404).json({ error: "Approval not found" });
    res.json(out);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: e.errors });
    }
    res.status(500).json({ error: e?.message ?? "Failed to decide" });
  }
});

const appendActivitySchema = z.object({
  kind: z.enum([
    "approval", "rejection",
    "member.add", "member.remove",
    "event.create", "event.cancel",
    "post.publish", "post.pin",
    "training.create",
    "inventory.in", "inventory.out",
    "settings.change",
  ]),
  summary: z.string().min(1).max(200),
  target: z.string().max(200).optional(),
  team: z.string().max(120).optional(),
  severity: z.enum(["info", "warn"]).optional(),
});

proWorkflowRouter.post("/activity", (req, res) => {
  try {
    const data = appendActivitySchema.parse(req.body);
    const actor = getActor(req);
    const entry = appendActivity(getTeamId(req), {
      actor: actor.name,
      actorRole: actor.role,
      kind: data.kind as ActivityKind,
      summary: data.summary,
      target: data.target,
      team: data.team,
      severity: data.severity ?? "info",
    });
    res.status(201).json(entry);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: e.errors });
    }
    res.status(500).json({ error: e?.message ?? "Failed to append activity" });
  }
});

proWorkflowRouter.get("/stream", (req, res) => {
  const teamId = getTeamId(req);
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write(`event: hello\ndata: ${JSON.stringify({ teamId })}\n\n`);

  const send = (event: string, payload: any) => {
    if (payload?.teamId && payload.teamId !== teamId) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  const onActivity = (p: any) => send("activity", p);
  const onDecision = (p: any) => send("decision", p);
  proWorkflowEvents.on("activityAppended", onActivity);
  proWorkflowEvents.on("approvalDecided", onDecision);

  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(ping);
    proWorkflowEvents.off("activityAppended", onActivity);
    proWorkflowEvents.off("approvalDecided", onDecision);
  });
});

proWorkflowRouter.get("/activity", (req, res) => {
  try {
    const limitRaw = req.query?.limit as string | undefined;
    const limit = limitRaw ? Math.min(parseInt(limitRaw, 10) || 50, 500) : undefined;
    res.json(listActivity(getTeamId(req), { limit }));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "Failed to load activity" });
  }
});
