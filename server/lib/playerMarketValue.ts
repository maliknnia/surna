/** Market value in EUR from player stats (Prompt 11 formula). */

export type PlayerValuationInput = {
  gamesPlayed?: number;
  winRate?: number; // 0–100
  skillLevel?: string | null;
  position?: string | null;
  age?: number | null;
  activityScore?: number; // 0–100 optional boost
};

const SKILL_FACTORS: Record<string, number> = {
  beginner: 1,
  intermediate: 1.5,
  advanced: 2,
  elite: 3,
  expert: 2,
};

export function skillLevelFactor(skillLevel?: string | null): number {
  if (!skillLevel) return 1;
  const key = skillLevel.toLowerCase().trim();
  return SKILL_FACTORS[key] ?? 1;
}

export function calculateMarketValueEur(input: PlayerValuationInput): number {
  const games = Math.max(0, input.gamesPlayed ?? 0);
  const winRate = Math.min(100, Math.max(0, input.winRate ?? 50));
  const factor = skillLevelFactor(input.skillLevel);

  let value = 500;
  value *= winRate / 100;
  value += Math.floor(games / 10) * 100;
  value *= factor;

  if (input.activityScore != null) {
    value *= 1 + Math.min(0.25, input.activityScore / 400);
  }
  if (input.age != null && input.age < 21) {
    value *= 1.15;
  } else if (input.age != null && input.age > 32) {
    value *= 0.85;
  }

  return Math.max(100, Math.round(value));
}

export function ageFromDateOfBirth(dob?: Date | string | null): number | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}
