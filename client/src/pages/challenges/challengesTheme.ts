import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export function useChallengesTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return useMemo(
    () => ({
      isDark,
      pageBg: isDark ? "#000000" : "#ffffff",
      headerBg: isDark ? "rgba(0, 0, 0, 0.92)" : "rgba(255,255,255,0.94)",
      border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      cardBg: isDark ? "#121212" : "#ffffff",
      cardBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      elevated: isDark ? "#1E1E1E" : "#f2f2f7",
      textPrimary: isDark ? "#ffffff" : "#111111",
      textSecondary: isDark ? "rgba(255,255,255,0.65)" : "rgba(60,60,67,0.75)",
      textMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(60,60,67,0.45)",
      label: isDark ? "rgba(255,255,255,0.38)" : "rgba(60,60,67,0.5)",
      chipBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
      chipActiveBg: isDark ? "#ffffff" : "#111111",
      chipActiveText: isDark ? "#111111" : "#ffffff",
      chipInactiveText: isDark ? "rgba(255,255,255,0.55)" : "rgba(60,60,67,0.55)",
      iconBtnBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      iconAccent: isDark ? "#ffffff" : "#111111",
      iconMuted: isDark ? "rgba(255,255,255,0.35)" : "rgba(60,60,67,0.4)",
      ctaBg: isDark ? "#ffffff" : "#111111",
      ctaText: isDark ? "#111111" : "#ffffff",
      secondaryBtnBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      secondaryBtnText: isDark ? "rgba(255,255,255,0.75)" : "rgba(60,60,67,0.75)",
      skeleton: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      inputBg: isDark ? "#1E1E1E" : "#f2f2f7",
      divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      accentPurple: isDark ? "#a78bfa" : "#6d28d9",
      success: "#30D158",
      live: "#FF453A",
      warn: "#FFD60A",
    }),
    [isDark],
  );
}

/** Who can see / join — shown in create flow & detail */
export const CHALLENGE_ACCESS_RULES = {
  solo: {
    title: "Solo challenge",
    can: ["Only you track progress", "Not listed for others to join"],
    cannot: ["No opponent required", "Won't appear in open invites"],
  },
  player1v1: {
    title: "1v1 challenge",
    can: ["You + one opponent after they accept", "Direct invite from their profile"],
    cannot: ["Random users can't join unless you choose Open type", "Opponent must accept before match starts", "Public listings require Open type, not 1v1"],
  },
  teamVsTeam: {
    title: "Team vs team",
    can: ["Two team rosters", "Team admins or captains accept"],
    cannot: ["Individual players can't join solo", "Both teams must confirm"],
  },
  open: {
    title: "Open challenge",
    can: ["Anyone on SURNA can request to join", "Listed in Nearby when public until full"],
    cannot: ["You pick who gets in if capacity is limited", "Must be public or private — not invite-only"],
  },
} as const;

export const VISIBILITY_RULES = {
  public: {
    label: "Public",
    desc: "Shows in Nearby & search",
    can: ["Anyone can discover it", "Players can request to join (open) or see invites"],
    cannot: ["Not hidden from feed", "Consider rules for who you accept"],
  },
  invite: {
    label: "Invite only",
    desc: "Only your invitee",
    can: ["Named opponent gets a direct invite", "Stays off public Nearby list"],
    cannot: ["Others can't see or join", "They must accept the invite"],
  },
  private: {
    label: "Private",
    desc: "Just you & participants",
    can: ["Only people already added", "Good for practice or closed events"],
    cannot: ["Won't show in Nearby", "No public discovery"],
  },
} as const;

export type ChallengeTypeKey = keyof typeof CHALLENGE_ACCESS_RULES;
export type VisibilityKey = keyof typeof VISIBILITY_RULES;
