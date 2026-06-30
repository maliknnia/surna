import { useState } from "react";
import { Loader2, Rocket, Trophy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  SurnaEmbeddedBody,
  SurnaEmbeddedHeader,
  SurnaEmbeddedPanel,
  SurnaEmbeddedOption,
  SurnaFullscreenOverlay,
} from "@/components/ui/SurnaEmbeddedCard";

type Props = {
  onComplete: (profileType: "normal" | "professional") => void;
};

export default function SignupPathChooser({ onComplete }: Props) {
  const [loading, setLoading] = useState<"normal" | "professional" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const choose = async (profileType: "normal" | "professional") => {
    setLoading(profileType);
    setError(null);
    try {
      await apiRequest("POST", "/api/profile/path", {
        profileType,
        skipSetup: profileType === "normal",
      });
      // Advance UI immediately — don't block on auth refetch (can hang/abort on slow networks).
      onComplete(profileType);
      void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  return (
    <SurnaFullscreenOverlay>
      <SurnaEmbeddedPanel>
        <SurnaEmbeddedHeader
          center
          title="How do you want to start?"
          subtitle="Pick Quick Start to jump in, or build a Professional Profile with sport-specific details."
        />
        <SurnaEmbeddedBody className="grid gap-3 sm:grid-cols-2">
          <SurnaEmbeddedOption
            icon={<Rocket className="h-8 w-8" />}
            title="Quick Start"
            description="Skip setup and explore SURNA right away."
            loading={loading === "normal"}
            disabled={loading !== null}
            onClick={() => choose("normal")}
          />
          <SurnaEmbeddedOption
            icon={<Trophy className="h-8 w-8" />}
            title="Professional Profile"
            description="Add position, record, club history, and more."
            loading={loading === "professional"}
            disabled={loading !== null}
            onClick={() => choose("professional")}
          />
        </SurnaEmbeddedBody>
        {error && (
          <p className="text-sm text-center px-6 pb-4" style={{ color: "var(--destructive, #ef4444)" }}>
            {error}
          </p>
        )}
      </SurnaEmbeddedPanel>
    </SurnaFullscreenOverlay>
  );
}
