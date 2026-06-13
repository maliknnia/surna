import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProTeam } from "./ProTeamContext";

export type ProRole = "owner" | "admin" | "coach" | "manager" | "member";

export type ProAction =
  | "events.create" | "events.edit" | "events.cancel"
  | "members.invite" | "members.approve" | "members.remove" | "members.assignRole"
  | "messages.announce" | "messages.pin" | "messages.moderate"
  | "club.edit" | "club.billing" | "club.settings"
  | "recruitment.post" | "recruitment.review"
  | "analytics.view" | "analytics.export"
  | "training.create" | "training.edit"
  | "match.manage" | "inventory.manage";

const PERMISSIONS: Record<ProRole, ProAction[]> = {
  owner: [
    "events.create","events.edit","events.cancel",
    "members.invite","members.approve","members.remove","members.assignRole",
    "messages.announce","messages.pin","messages.moderate",
    "club.edit","club.billing","club.settings",
    "recruitment.post","recruitment.review",
    "analytics.view","analytics.export",
    "training.create","training.edit",
    "match.manage","inventory.manage",
  ],
  admin: [
    "events.create","events.edit","events.cancel",
    "members.invite","members.approve","members.remove","members.assignRole",
    "messages.announce","messages.pin","messages.moderate",
    "club.edit","club.settings",
    "recruitment.post","recruitment.review",
    "analytics.view","analytics.export",
    "training.create","training.edit",
    "match.manage","inventory.manage",
  ],
  coach: [
    "events.create","events.edit",
    "members.invite",
    "messages.announce","messages.pin",
    "recruitment.review",
    "analytics.view",
    "training.create","training.edit",
    "match.manage",
  ],
  manager: [
    "events.create","events.edit",
    "members.invite","members.approve",
    "messages.announce","messages.pin",
    "analytics.view",
    "inventory.manage",
  ],
  member: [
    "messages.pin",
  ],
};

export const ROLE_LABELS: Record<ProRole, string> = {
  owner:   "Owner",
  admin:   "Admin",
  coach:   "Coach",
  manager: "Manager",
  member:  "Member",
};

export const ROLE_DESCRIPTIONS: Record<ProRole, string> = {
  owner:   "Full control over everything in the club",
  admin:   "Manage everything except billing & ownership",
  coach:   "Run training, matches and team comms",
  manager: "Operations, members and inventory",
  member:  "Read-only access to most areas",
};

type Ctx = {
  role: ProRole;
  setRole: (r: ProRole) => void;
  can: (action: ProAction) => boolean;
};

const ProRoleContext = createContext<Ctx | null>(null);

function isProRole(value: unknown): value is ProRole {
  return typeof value === "string" && value in PERMISSIONS;
}

export function ProRoleProvider({ children }: { children: ReactNode }) {
  const { teamId } = useProTeam();

  const { data: serverRole } = useQuery({
    queryKey: ["/api/pro/team", teamId, "my-role"],
    enabled: !!teamId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const r = await fetch(`/api/pro/team/${teamId}/my-role`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { role: ProRole };
    },
  });

  const role: ProRole = isProRole(serverRole?.role) ? serverRole.role : "member";

  useEffect(() => {
    if (teamId && serverRole?.role) {
      console.log("[Fix 7] Pro role verified from database:", serverRole.role, "team", teamId);
    }
  }, [teamId, serverRole?.role]);

  const setRole = (_r: ProRole) => {
    /* Role is server-managed; local changes are ignored. */
  };

  const can = (action: ProAction) => PERMISSIONS[role].includes(action);

  return (
    <ProRoleContext.Provider value={{ role, setRole, can }}>
      {children}
    </ProRoleContext.Provider>
  );
}

export function useProRole(): Ctx {
  const ctx = useContext(ProRoleContext);
  if (!ctx) {
    return { role: "owner", setRole: () => {}, can: () => true };
  }
  return ctx;
}
