import type { CoachWithProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { normalizeCoachList, normalizeCoachRow } from "@/lib/normalizeCoach";

export async function fetchCoaches(options?: {
  limit?: number;
  offset?: number;
  sport?: string;
}): Promise<CoachWithProfile[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.sport && options.sport.toLowerCase() !== "all") {
    params.set("sport", options.sport);
  }
  const qs = params.toString();
  const url = qs ? `/api/coaches?${qs}` : "/api/coaches";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: Failed to load coaches`);
  const rows = await res.json();
  const list = normalizeCoachList(Array.isArray(rows) ? rows : []);
  console.log("[Fix 8] Coaches loaded from API:", list.length);
  return list;
}

export async function fetchCoach(coachId: string): Promise<CoachWithProfile> {
  const res = await fetch(`/api/coaches/${coachId}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: Coach not found`);
  return normalizeCoachRow(await res.json());
}

export async function updateCoachProfile(patch: Record<string, unknown>): Promise<CoachWithProfile> {
  const res = await apiRequest("PATCH", "/api/coaches/me/profile", patch);
  return res.json();
}

export type CoachApplyPayload = {
  phone: string;
  experience: string;
  certifications?: string;
  primarySports: string[];
  specializations?: string[];
  skillLevel: "beginner" | "intermediate" | "advanced" | "elite";
  hourlyRate: number;
  availability: string[];
  sessionTypes: string[];
  maxStudents?: number;
  bio: string;
  achievements?: string;
  teachingPhilosophy?: string;
  socialMedia?: string;
  backgroundCheckConsent: boolean;
  marketingConsent?: boolean;
  paymentMethod: string;
  demoVideoUrl?: string;
  idDocumentProvided?: boolean;
  certificationDocsProvided?: boolean;
  verificationNotes?: string;
};

export async function applyAsCoach(payload: CoachApplyPayload): Promise<{
  coach: CoachWithProfile;
  verificationStatus: "verified" | "pending";
  message: string;
}> {
  const res = await apiRequest("POST", "/api/coaches/apply", payload);
  return res.json();
}

export async function startCoachChat(coachId: string): Promise<{ chatId?: string }> {
  const res = await apiRequest("POST", `/api/messages/start/${coachId}`);
  return res.json();
}
