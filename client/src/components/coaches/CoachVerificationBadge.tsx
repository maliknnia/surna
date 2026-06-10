import { CheckCircle2, Clock } from "lucide-react";
import type { CoachWithProfile } from "@shared/schema";
import type { CoachVerificationStatus } from "@shared/coachProfile";

export function coachVerificationStatus(coach: {
  isVerified?: boolean | null;
  profile?: { verification?: { status?: CoachVerificationStatus } };
}): CoachVerificationStatus {
  if (coach.isVerified) return "verified";
  return coach.profile?.verification?.status ?? "none";
}

type Props = {
  coach: {
    isVerified?: boolean | null;
    profile?: CoachWithProfile["profile"];
  };
  size?: "sm" | "md";
  showLabel?: boolean;
};

export default function CoachVerificationBadge({ coach, size = "sm", showLabel = false }: Props) {
  const status = coachVerificationStatus(coach);
  if (status !== "verified" && status !== "pending") return null;

  const iconSize = size === "md" ? 18 : 14;
  const isVerified = status === "verified";

  if (showLabel) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{
          background: isVerified ? "rgba(29,185,84,0.15)" : "rgba(255,193,7,0.15)",
          color: isVerified ? "#1DB954" : "#d4a017",
          border: `1px solid ${isVerified ? "rgba(29,185,84,0.35)" : "rgba(255,193,7,0.35)"}`,
        }}
      >
        {isVerified ? <CheckCircle2 size={iconSize} /> : <Clock size={iconSize} />}
        {isVerified ? "Verified" : "Under review"}
      </span>
    );
  }

  if (isVerified) {
    return <CheckCircle2 size={iconSize} style={{ color: "#1DB954", flexShrink: 0 }} aria-label="Verified coach" />;
  }

  return <Clock size={iconSize} style={{ color: "#d4a017", flexShrink: 0 }} aria-label="Verification under review" />;
}
