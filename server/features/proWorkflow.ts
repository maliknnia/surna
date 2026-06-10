import { randomUUID } from "crypto";
import { EventEmitter } from "events";

export const proWorkflowEvents = new EventEmitter();
proWorkflowEvents.setMaxListeners(0);

export type ApprovalKind = "member" | "post" | "event" | "trial" | "expense";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalNeeds =
  | "members.approve"
  | "messages.moderate"
  | "events.edit"
  | "recruitment.review"
  | "club.billing";

export interface Approval {
  id: string;
  teamId: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  requestedBy: string;
  team?: string;
  requestedAt: string;
  priority: "low" | "normal" | "high";
  status: ApprovalStatus;
  needs: ApprovalNeeds;
  decidedBy?: string;
  decidedAt?: string;
}

export type ActivityKind =
  | "approval"
  | "rejection"
  | "member.add"
  | "member.remove"
  | "event.create"
  | "event.cancel"
  | "post.publish"
  | "post.pin"
  | "training.create"
  | "inventory.in"
  | "inventory.out"
  | "settings.change";

export type ActivityRole =
  | "Owner"
  | "Admin"
  | "Coach"
  | "Manager"
  | "Member"
  | "System";

export interface ActivityEntry {
  id: string;
  teamId: string;
  iso: string;
  actor: string;
  actorRole: ActivityRole;
  kind: ActivityKind;
  summary: string;
  target?: string;
  team?: string;
  severity: "info" | "warn";
}

const approvals = new Map<string, Approval[]>();
const activities = new Map<string, ActivityEntry[]>();

const now = () => new Date().toISOString();

function seed(teamId: string) {
  if (approvals.has(teamId)) return;
  const t = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  approvals.set(teamId, [
    { id: "ap1", teamId, kind: "member", title: "Marco S. wants to join Senior A", detail: "Defender Â· 24 Â· references attached", requestedBy: "Marco S.", team: "Senior A", requestedAt: t(2), priority: "high", status: "pending", needs: "members.approve" },
    { id: "ap2", teamId, kind: "member", title: "Eli J. wants to join Senior B", detail: "Midfielder Â· 19 Â· open trial", requestedBy: "Eli J.", team: "Senior B", requestedAt: t(5), priority: "normal", status: "pending", needs: "members.approve" },
    { id: "ap3", teamId, kind: "post", title: "Sara M. posted a match recap", detail: "Awaiting moderation before publish", requestedBy: "Sara M.", team: "Women's First", requestedAt: t(1), priority: "normal", status: "pending", needs: "messages.moderate" },
    { id: "ap4", teamId, kind: "event", title: "Tom W. requested venue change", detail: "Apr 26 vs Riverside FC â€” move to Pitch 1", requestedBy: "Tom W.", team: "Senior A", requestedAt: t(8), priority: "high", status: "pending", needs: "events.edit" },
    { id: "ap5", teamId, kind: "trial", title: "Shortlist invitation: Noah K.", detail: "Forward Â· 27 Â· 4.2â˜… rating", requestedBy: "Lia B.", team: "Senior A", requestedAt: t(24), priority: "low", status: "pending", needs: "recruitment.review" },
    { id: "ap6", teamId, kind: "expense", title: "Â£128.40 â€” Restock match balls", detail: "Submitted via Inventory Â· receipt OK", requestedBy: "James O.", team: "Operations", requestedAt: t(48), priority: "normal", status: "pending", needs: "club.billing" },
    { id: "ap7", teamId, kind: "post", title: "Ava R. posted a training photo", detail: "Image moderation queue", requestedBy: "Ava R.", team: "Senior A", requestedAt: t(3), priority: "low", status: "pending", needs: "messages.moderate" },
  ]);
  activities.set(teamId, [
    { id: "l1", teamId, iso: t(0), actor: "Lia B.", actorRole: "Owner", kind: "approval", summary: "Approved join request", target: "Marco S.", team: "Senior A", severity: "info" },
    { id: "l2", teamId, iso: t(0.2), actor: "James O.", actorRole: "Manager", kind: "inventory.in", summary: "Stock in: Home shirt Ã— 6", target: "Storage A", severity: "info" },
    { id: "l3", teamId, iso: t(1), actor: "Sara M.", actorRole: "Coach", kind: "event.create", summary: "Created session: High-press patterns", target: "Mon Apr 21 19:00", team: "Senior A", severity: "info" },
    { id: "l4", teamId, iso: t(3), actor: "Lia B.", actorRole: "Owner", kind: "post.pin", summary: "Pinned announcement", target: "Season kickoff â€” Aug 18", severity: "info" },
    { id: "l5", teamId, iso: t(6), actor: "Marco D.", actorRole: "Coach", kind: "training.create", summary: "Added drill: Pressing trigger drill", severity: "info" },
    { id: "l6", teamId, iso: t(28), actor: "System", actorRole: "System", kind: "settings.change", summary: "Auto-disabled inactive integration", target: "Slack", severity: "warn" },
    { id: "l7", teamId, iso: t(31), actor: "Lia B.", actorRole: "Owner", kind: "rejection", summary: "Declined trial invitation", target: "Noah K.", team: "Senior A", severity: "info" },
    { id: "l8", teamId, iso: t(33), actor: "James O.", actorRole: "Manager", kind: "member.add", summary: "Added staff member", target: "Sara M. â€” Head Physio", severity: "info" },
    { id: "l9", teamId, iso: t(50), actor: "Sara M.", actorRole: "Coach", kind: "event.cancel", summary: "Cancelled session: Recovery â€” Tue 6pm", team: "Senior B", severity: "warn" },
    { id: "l10", teamId, iso: t(54), actor: "Ava R.", actorRole: "Member", kind: "post.publish", summary: "Posted training photo", severity: "info" },
    { id: "l11", teamId, iso: t(74), actor: "Lia B.", actorRole: "Owner", kind: "settings.change", summary: "Updated club description", severity: "info" },
    { id: "l12", teamId, iso: t(80), actor: "James O.", actorRole: "Manager", kind: "inventory.out", summary: "Issued GK gloves to Tom W.", severity: "info" },
  ]);
}

export function listApprovals(teamId: string): Approval[] {
  seed(teamId);
  return [...(approvals.get(teamId) ?? [])].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

export function decideApproval(
  teamId: string,
  id: string,
  status: "approved" | "rejected",
  actor: { name: string; role: ActivityRole }
): { approval?: Approval; activity?: ActivityEntry } {
  seed(teamId);
  const list = approvals.get(teamId) ?? [];
  const item = list.find((a) => a.id === id);
  if (!item) return {};
  if (item.status !== "pending") return { approval: item };
  item.status = status;
  item.decidedBy = actor.name;
  item.decidedAt = now();
  const entry = appendActivity(teamId, {
    actor: actor.name,
    actorRole: actor.role,
    kind: status === "approved" ? "approval" : "rejection",
    summary: status === "approved" ? "Approved request" : "Declined request",
    target: item.title,
    team: item.team,
    severity: "info",
  });
  proWorkflowEvents.emit("approvalDecided", { teamId, approval: item, activity: entry });
  return { approval: item, activity: entry };
}

export function listActivity(teamId: string, opts?: { limit?: number }): ActivityEntry[] {
  seed(teamId);
  const list = [...(activities.get(teamId) ?? [])].sort(
    (a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime()
  );
  return opts?.limit ? list.slice(0, opts.limit) : list;
}

export function appendActivity(
  teamId: string,
  data: Omit<ActivityEntry, "id" | "iso" | "teamId">
): ActivityEntry {
  const list = activities.get(teamId) ?? [];
  const entry: ActivityEntry = {
    id: randomUUID(),
    teamId,
    iso: now(),
    ...data,
  };
  list.unshift(entry);
  activities.set(teamId, list);
  proWorkflowEvents.emit("activityAppended", { teamId, activity: entry });
  return entry;
}
