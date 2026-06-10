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
  approvals: ["/api/pro-workflow/approvals"] as const,
  activity: ["/api/pro-workflow/activity"] as const,
};

export function useApprovals() {
  return useQuery<Approval[]>({
    queryKey: proWorkflowKeys.approvals,
    staleTime: 30_000,
  });
}

export function useActivity() {
  return useQuery<ActivityEntry[]>({
    queryKey: proWorkflowKeys.activity,
    staleTime: 30_000,
  });
}

export function useProWorkflowStream() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/pro-workflow/stream");
    const refreshActivity = () =>
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity });
    const refreshAll = () => {
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity });
      qc.invalidateQueries({ queryKey: proWorkflowKeys.approvals });
    };
    es.addEventListener("activity", refreshActivity);
    es.addEventListener("decision", refreshAll);
    es.onerror = () => {
      // Browser will auto-reconnect; just stay quiet.
    };
    return () => {
      es.removeEventListener("activity", refreshActivity);
      es.removeEventListener("decision", refreshAll);
      es.close();
    };
  }, [qc]);
}

export function useAppendActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      kind: ActivityKind;
      summary: string;
      target?: string;
      team?: string;
      severity?: "info" | "warn";
    }) => {
      const res = await apiRequest("POST", "/api/pro-workflow/activity", vars);
      return (await res.json()) as ActivityEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity });
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: "approved" | "rejected" }) => {
      const res = await apiRequest(
        "POST",
        `/api/pro-workflow/approvals/${vars.id}/decide`,
        { status: vars.status }
      );
      return (await res.json()) as { approval: Approval; activity: ActivityEntry };
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: proWorkflowKeys.approvals });
      const prev = qc.getQueryData<Approval[]>(proWorkflowKeys.approvals);
      if (prev) {
        qc.setQueryData<Approval[]>(
          proWorkflowKeys.approvals,
          prev.map((a) => (a.id === vars.id ? { ...a, status: vars.status } : a))
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(proWorkflowKeys.approvals, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: proWorkflowKeys.approvals });
      qc.invalidateQueries({ queryKey: proWorkflowKeys.activity });
    },
  });
}
