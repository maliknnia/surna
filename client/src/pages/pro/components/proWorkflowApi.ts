import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export interface ActivityEntry {
  id: string;
  teamId: string;
  iso: string;
  actor: string;
  actorRole: "Owner" | "Admin" | "Coach" | "Manager" | "Member" | "System";
  kind: ActivityKind;
  summary: string;
  target?: string;
  team?: string;
  severity: "info" | "warn";
}

export const proWorkflowKeys = {
  approvals: (teamId: string) => ["/api/pro-workflow/approvals", teamId] as const,
  activity: (teamId: string) => ["/api/pro-workflow/activity", teamId] as const,
};

async function fetchWorkflow<T>(path: string, teamId: string): Promise<T> {
  const url = `${path}?teamId=${encodeURIComponent(teamId)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useApprovals(teamId?: string) {
  return useQuery<Approval[]>({
    queryKey: teamId ? proWorkflowKeys.approvals(teamId) : ["pro-workflow-approvals-disabled"],
    enabled: !!teamId,
    queryFn: () => fetchWorkflow<Approval[]>("/api/pro-workflow/approvals", teamId!),
    staleTime: 30_000,
  });
}

export function useActivity(teamId?: string) {
  return useQuery<ActivityEntry[]>({
    queryKey: teamId ? proWorkflowKeys.activity(teamId) : ["pro-workflow-activity-disabled"],
    enabled: !!teamId,
    queryFn: () => fetchWorkflow<ActivityEntry[]>("/api/pro-workflow/activity", teamId!),
    staleTime: 30_000,
  });
}

export function useProWorkflowStream(teamId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!teamId || typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource(
      `/api/pro-workflow/stream?teamId=${encodeURIComponent(teamId)}`,
    );
    const refreshActivity = () => {
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity(teamId) });
    };
    const refreshAll = () => {
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity(teamId) });
      qc.invalidateQueries({ queryKey: proWorkflowKeys.approvals(teamId) });
    };
    es.addEventListener("activity", refreshActivity);
    es.addEventListener("decision", refreshAll);
    es.onerror = () => {
      /* Browser auto-reconnects */
    };
    return () => {
      es.removeEventListener("activity", refreshActivity);
      es.removeEventListener("decision", refreshAll);
      es.close();
    };
  }, [qc, teamId]);
}

export function useAppendActivity(teamId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      kind: ActivityKind;
      summary: string;
      target?: string;
      team?: string;
      severity?: "info" | "warn";
    }) => {
      const res = await apiRequest("POST", "/api/pro-workflow/activity", {
        ...vars,
        teamId,
      });
      return (await res.json()) as ActivityEntry;
    },
    onSuccess: () => {
      if (teamId) qc.invalidateQueries({ queryKey: proWorkflowKeys.activity(teamId) });
    },
  });
}

export function useDecideApproval(teamId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const res = await apiRequest(
        "POST",
        `/api/pro-workflow/approvals/${vars.id}/decide`,
        { status: vars.status, teamId },
      );
      return (await res.json()) as { approval: Approval; activity: ActivityEntry };
    },
    onMutate: async (vars) => {
      if (!teamId) return;
      const key = proWorkflowKeys.approvals(teamId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Approval[]>(key);
      if (prev) {
        qc.setQueryData<Approval[]>(
          key,
          prev.map((a) => (a.id === vars.id ? { ...a, status: vars.status } : a)),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (teamId && ctx?.prev) {
        qc.setQueryData(proWorkflowKeys.approvals(teamId), ctx.prev);
      }
    },
    onSettled: () => {
      if (!teamId) return;
      qc.invalidateQueries({ queryKey: proWorkflowKeys.approvals(teamId) });
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity(teamId) });
    },
  });
}
