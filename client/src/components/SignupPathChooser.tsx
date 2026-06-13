import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Rocket, Trophy } from "lucide-react";
import { apiOrigin } from "@/lib/loginUrls";

type Props = {
  onComplete: (profileType: "normal" | "professional") => void;
};

export default function SignupPathChooser({ onComplete }: Props) {
  const [loading, setLoading] = useState<"normal" | "professional" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (profileType: "normal" | "professional") => {
    setLoading(profileType);
    setError(null);
    try {
      const res = await fetch(`${apiOrigin()}/api/profile/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileType,
          skipSetup: profileType === "normal",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not save your choice");
      }
      console.log("[Phase8-1] Signup path chosen:", profileType);
      onComplete(profileType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How do you want to start?</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Pick Quick Start to jump in, or build a Professional Profile with sport-specific details.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("normal")}
            disabled={loading !== null}
            className="rounded-xl border border-border p-5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
          >
            <Rocket className="h-8 w-8 mb-3 text-foreground" />
            <p className="font-semibold">Quick Start</p>
            <p className="text-xs text-muted-foreground mt-1">Skip setup and explore SURNA right away.</p>
            {loading === "normal" && <Loader2 className="h-4 w-4 animate-spin mt-3" />}
          </button>
          <button
            type="button"
            onClick={() => choose("professional")}
            disabled={loading !== null}
            className="rounded-xl border border-border p-5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
          >
            <Trophy className="h-8 w-8 mb-3 text-foreground" />
            <p className="font-semibold">Professional Profile</p>
            <p className="text-xs text-muted-foreground mt-1">Add position, record, club history, and more.</p>
            {loading === "professional" && <Loader2 className="h-4 w-4 animate-spin mt-3" />}
          </button>
        </CardContent>
        {error && <p className="text-sm text-red-500 text-center px-6 pb-4">{error}</p>}
      </Card>
    </div>
  );
}
