import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PlaceMembershipPlan } from "@shared/schema";
import {
  PLACE_MEMBERSHIP_BILLING_INTERVALS,
  formatMembershipPrice,
  type PlaceMembershipBillingInterval,
} from "@shared/placeMembership";

interface ManagePlaceMembershipPlansProps {
  placeId: string;
}

type PlanDraft = {
  name: string;
  description: string;
  price: string;
  billingInterval: PlaceMembershipBillingInterval;
  features: string;
  isActive: boolean;
  displayOrder: number;
};

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  description: "",
  price: "",
  billingInterval: "monthly",
  features: "",
  isActive: true,
  displayOrder: 0,
};

export function ManagePlaceMembershipPlans({ placeId }: ManagePlaceMembershipPlansProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery<{ plans: PlaceMembershipPlan[] }>({
    queryKey: ["/api/places", placeId, "membership-plans", "manage"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/places/${placeId}/membership-plans?includeInactive=true`,
      );
      return res.json();
    },
    enabled: !!placeId,
  });

  const plans = data?.plans ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        price: draft.price,
        billingInterval: draft.billingInterval,
        features: draft.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        isActive: draft.isActive,
        displayOrder: draft.displayOrder,
      };
      if (editingId) {
        const res = await apiRequest("PUT", `/api/places/${placeId}/membership-plans/${editingId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", `/api/places/${placeId}/membership-plans`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "membership-plans"] });
      setShowForm(false);
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
      toast({ title: "Plan saved", description: "Membership plan updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save plan", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/places/${placeId}/membership-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places", placeId, "membership-plans"] });
      toast({ title: "Plan removed" });
    },
  });

  const startEdit = (plan: PlaceMembershipPlan) => {
    setEditingId(plan.id);
    setDraft({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price != null ? String(plan.price) : "",
      billingInterval: (plan.billingInterval as PlaceMembershipBillingInterval) ?? "monthly",
      features: (plan.features ?? []).join("\n"),
      isActive: plan.isActive ?? true,
      displayOrder: plan.displayOrder ?? 0,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-token-text">Membership plans</h3>
          <p className="text-sm text-token-text-muted">
            Plans shown on your venue profile — guests enquire to join.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
            setShowForm(true);
          }}
          data-testid="button-add-membership-plan"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add plan
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-xl border border-token-text/10 p-4 space-y-3 bg-token-text/5">
          <CreateField label="Plan name" required>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Monthly unlimited"
            />
          </CreateField>
          <CreateField label="Price (€)" required>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="49.99"
            />
          </CreateField>
          <CreateField label="Billing">
            <Select
              value={draft.billingInterval}
              onValueChange={(v) =>
                setDraft({ ...draft, billingInterval: v as PlaceMembershipBillingInterval })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACE_MEMBERSHIP_BILLING_INTERVALS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CreateField>
          <CreateField label="Description">
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Full gym access, classes included…"
            />
          </CreateField>
          <CreateField label="Features (one per line)">
            <Textarea
              rows={3}
              value={draft.features}
              onChange={(e) => setDraft({ ...draft, features: e.target.value })}
              placeholder={"24/7 access\nSauna & steam\nFree parking"}
            />
          </CreateField>
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!draft.name.trim() || !draft.price || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Update plan" : "Create plan"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-token-text-muted">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-token-text-muted py-6 text-center">
          No plans yet — add your first membership tier.
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-token-text/10 p-4 flex items-start justify-between gap-3"
              data-testid={`membership-plan-${plan.id}`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-token-text">{plan.name}</h4>
                  {!plan.isActive ? (
                    <Badge variant="secondary">Hidden</Badge>
                  ) : null}
                </div>
                <p className="text-sm font-medium text-primary mt-1">
                  {formatMembershipPrice(plan.price ?? "0", plan.billingInterval ?? "monthly")}
                </p>
                {plan.description ? (
                  <p className="text-sm text-token-text-muted mt-1">{plan.description}</p>
                ) : null}
                {(plan.features ?? []).length > 0 ? (
                  <ul className="text-xs text-token-text-muted mt-2 space-y-0.5 list-disc pl-4">
                    {plan.features!.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => startEdit(plan)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(plan.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-token-text">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
