import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/** Legacy team roster URL — always land on the unified profile experience. */
export default function TeamPlayerPage() {
  const params = useParams<{ teamId: string; userId: string }>();
  const userId = params.userId;
  const teamId = params.teamId;
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!userId) return;
    const from = teamId ? `?from=${encodeURIComponent(`/teams/${teamId}`)}` : "";
    setLocation(`/profile/${userId}${from}`);
  }, [userId, teamId, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surna-base)" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--surna-text-secondary)" }} />
    </div>
  );
}
