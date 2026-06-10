import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
const STORAGE_KEY = "surna.pro.role";

export function ProRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<ProRole>("owner");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ProRole | null;
      if (saved && saved in PERMISSIONS) setRoleState(saved);
    } catch { /* ignore */ }
  }, []);

  const setRole = (r: ProRole) => {
    setRoleState(r);
    try { localStorage.setItem(STORAGE_KEY, r); } catch { /* ignore */ }
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
